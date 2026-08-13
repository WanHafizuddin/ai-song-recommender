const db = require("../util/database");

async function create({ userId, queryText, extracted, results }) {
  const r = await db.query(
    `INSERT INTO mood_queries (user_id, query_text, extracted, results)
     VALUES ($1, $2, $3, $4)
     RETURNING id, created_at`,
    [
      userId,
      queryText,
      extracted ? JSON.stringify(extracted) : null,
      results ? JSON.stringify(results) : null,
    ]
  );
  return r.rows[0];
}

module.exports = { create };
