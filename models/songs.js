const db = require("../util/database");

async function getAll() {
  const r = await db.query(
    "SELECT id, title, artist, genre, energy, tags FROM songs ORDER BY id DESC"
  );
  return r.rows;
}

async function create({ title, artist, genre }) {
  const r = await db.query(
    `INSERT INTO songs (title, artist, genre) VALUES ($1, $2, $3)
     RETURNING id, title, artist, genre, energy, tags`,
    [title, artist, genre ?? null]
  );
  return r.rows[0];
}

async function deleteById(id) {
  const r = await db.query("DELETE FROM songs WHERE id = $1", [id]);
  return r.rowCount;
}

async function runCandidateQuery({ text, params }) {
  const r = await db.query(text, params);
  return r.rows;
}

async function listUnenriched() {
  const r = await db.query(
    "SELECT id, title, artist, genre FROM songs WHERE enriched_at IS NULL ORDER BY id"
  );
  return r.rows;
}

async function setEnrichment(id, energy, tags) {
  await db.query("UPDATE songs SET energy = $1, tags = $2, enriched_at = now() WHERE id = $3", [
    energy,
    tags,
    id,
  ]);
}

module.exports = { getAll, create, deleteById, runCandidateQuery, listUnenriched, setEnrichment };
