const express = require("express");
const router = express.Router();
const songs = require("../models/songs");

router.get("/api/songs", async (req, res) => {
  try {
    res.json({ songs: await songs.getAll() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.post("/api/songs", async (req, res) => {
  try {
    const { title, artist, genre } = req.body || {};
    if (!title || !artist) return res.status(400).json({ error: "title and artist are required" });
    const song = await songs.create({ title, artist, genre });
    res.status(201).json({ song });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

router.delete("/api/songs/:id", async (req, res) => {
  try {
    const removed = await songs.deleteById(Number(req.params.id));
    if (!removed) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

module.exports = router;
