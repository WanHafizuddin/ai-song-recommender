const { validateCriteria } = require("./criteria");

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
const CHAT_MODEL = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";

function apiKey() {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error("GEMINI_API_KEY not set");
  return k;
}

function _parseJson(text) {
  const cleaned = String(text)
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  return JSON.parse(cleaned);
}

async function generate(prompt) {
  const res = await fetch(`${API_BASE}/${CHAT_MODEL}:generateContent?key=${apiKey()}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
    }),
  });
  if (!res.ok) throw new Error(`GEMINI_HTTP_${res.status}`);
  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

function safe(s) {
  return String(s).replace(/"/g, "'");
}

async function extractCriteria(moodText) {
  const prompt = `You extract music search filters from a mood description.
Return ONLY JSON: {"genre": string|null, "energy": integer 1-5|null, "tags": string[]}.
"genre" must be one of RNB, KPOP, INDIE, FUNK, ROCK, POP, HIP-HOP, OTHER, or null.
"energy": 1 = very calm, 5 = very energetic.
"tags": 2-6 lowercase mood/vibe words.
Mood: "${safe(moodText)}"`;
  return validateCriteria(_parseJson(await generate(prompt)));
}

async function rerankSongs(candidates, moodText) {
  const list = candidates
    .map((s) => `${s.id}: ${s.title} - ${s.artist} [${(s.tags || []).join(", ")}]`)
    .join("\n");
  const prompt = `From the candidate songs, choose the best 10-15 for the mood and give a one-line reason for each.
Return ONLY JSON: [{"id": number, "reason": string}]. Use ONLY ids that appear in the list.
Mood: "${safe(moodText)}"
Candidates:
${list}`;
  const parsed = _parseJson(await generate(prompt));
  if (!Array.isArray(parsed)) throw new Error("INVALID_RERANK");
  return parsed;
}

async function enrichSong(song) {
  const prompt = `Label this song for a mood-based recommender.
Return ONLY JSON: {"energy": integer 1-5, "tags": string[] of 3-6 lowercase mood/vibe words}.
Song: "${safe(song.title)}" by "${safe(song.artist)}" (genre: ${safe(song.genre || "unknown")})`;
  const raw = _parseJson(await generate(prompt));
  const energy = Number(raw.energy);
  if (!Number.isInteger(energy) || energy < 1 || energy > 5) throw new Error("INVALID_ENERGY");
  const tags = Array.isArray(raw.tags)
    ? raw.tags.filter((t) => typeof t === "string" && t.trim()).map((t) => t.trim().toLowerCase())
    : [];
  if (tags.length === 0) throw new Error("NO_TAGS");
  return { energy, tags };
}

module.exports = { extractCriteria, rerankSongs, enrichSong, _parseJson };
