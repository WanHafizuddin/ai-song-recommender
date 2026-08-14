require("dotenv").config();
const songs = require("../models/songs");
const llm = require("../services/llm");
const db = require("../util/database");

const DELAY_MS = 4500; // ~13 req/min — under the Gemini free-tier rate limit
const MAX_RETRIES = 5; // retry transient rate-limit / overload responses

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 429 = rate limited, 503 = overloaded, 500 = transient server error.
function isRetryable(message) {
  return /GEMINI_HTTP_(429|500|503)/.test(message || "");
}

async function enrichWithRetry(song) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await llm.enrichSong(song);
    } catch (err) {
      if (isRetryable(err.message) && attempt < MAX_RETRIES) {
        const backoff = 8000 * Math.pow(2, attempt); // 8s, 16s, 32s, 64s, 128s
        console.log(`  … ${err.message}; backing off ${backoff / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})`);
        await sleep(backoff);
        continue;
      }
      throw err;
    }
  }
}

async function main() {
  const pending = await songs.listUnenriched();
  console.log(`Enriching ${pending.length} song(s)...`);
  let ok = 0;
  for (const s of pending) {
    try {
      const { energy, tags } = await enrichWithRetry(s);
      await songs.setEnrichment(s.id, energy, tags);
      ok++;
      console.log(`✓ [${s.id}] ${s.title} — energy ${energy}, tags ${tags.join(", ")}`);
    } catch (err) {
      console.warn(`✗ [${s.id}] ${s.title}: ${err.message} (left unenriched for retry)`);
    }
    await sleep(DELAY_MS);
  }
  console.log(`Done. Enriched ${ok}/${pending.length}.`);
  await db.pool.end();
}

main().catch((err) => {
  console.error("Enrichment failed:", err);
  process.exit(1);
});
