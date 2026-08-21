const express = require("express");
const router = express.Router();
const llm = require("../services/llm");
const retrieval = require("../services/retrieval");
const { applyRerank, fromCandidates } = require("../services/rerankGuard");
const users = require("../models/user");
const moodQueries = require("../models/moodQuery");

const MAX_MOOD_LEN = 500;
const rerankEnabled = () => process.env.RERANK_ENABLED !== "false";

function fallbackCriteria(moodText) {
  const words = new Set(moodText.toLowerCase().split(/\W+/));
  const tags = llm.MOOD_TAGS.filter((t) => words.has(t)).slice(0, 6);
  return { genre: null, energy: null, tags };
}

router.post("/api/recommend", async (req, res) => {
  try {
    const { moodText, username } = req.body || {};
    if (!moodText || typeof moodText !== "string" || !moodText.trim()) {
      return res.status(400).json({ error: "moodText is required" });
    }
    if (moodText.length > MAX_MOOD_LEN) {
      return res.status(400).json({ error: "moodText too long" });
    }
    if (!username || typeof username !== "string" || !username.trim()) {
      return res.status(400).json({ error: "username is required" });
    }

    const user = await users.findOrCreateByUsername(username);

    let criteria;
    try {
      criteria = await llm.extractCriteria(moodText);
    } catch {
      criteria = fallbackCriteria(moodText);
    }

    const candidates = await retrieval.retrieveCandidates(criteria);
    if (candidates.length === 0) {
      await moodQueries.create({ userId: user.id, queryText: moodText, extracted: criteria, results: [] });
      return res.json({ playlist: [], criteria, message: "No matching songs found. Try a different mood." });
    }

    let playlist;
    if (rerankEnabled()) {
      try {
        playlist = applyRerank(await llm.rerankSongs(candidates, moodText), candidates);
        if (playlist.length === 0) playlist = fromCandidates(candidates);
      } catch {
        playlist = fromCandidates(candidates);
      }
    } else {
      playlist = fromCandidates(candidates);
    }

    await moodQueries.create({
      userId: user.id,
      queryText: moodText,
      extracted: criteria,
      results: playlist.map((p) => ({ songId: p.id, reason: p.reason })),
    });

    return res.json({ playlist, criteria });
  } catch (err) {
    console.error("recommend error:", err);
    return res.status(500).json({ error: "internal error" });
  }
});

module.exports = router;
