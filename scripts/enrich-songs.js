require("dotenv").config();
const songs = require("../models/songs");
const llm = require("../services/llm");
const db = require("../util/database");

const DELAY_MS = 1200; // gentle on the free-tier rate limit

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const pending = await songs.listUnenriched();
  console.log(`Enriching ${pending.length} song(s)...`);
  let ok = 0;
  for (const s of pending) {
    try {
      const { energy, tags } = await llm.enrichSong(s);
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
