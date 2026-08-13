const db = require("../util/database");

async function findOrCreateByUsername(username) {
  const name = String(username || "").trim();
  if (!name) throw new Error("INVALID_USERNAME");
  const found = await db.query("SELECT id, username FROM users WHERE username = $1", [name]);
  if (found.rows[0]) return found.rows[0];
  const created = await db.query(
    `INSERT INTO users (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING id, username`,
    [name]
  );
  return created.rows[0];
}

module.exports = { findOrCreateByUsername };
