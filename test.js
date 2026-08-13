const { Pool } = require("pg");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function createTable() {
  try {
    const res = await pool.query(`
      CREATE TABLE IF NOT EXISTS song_table (
        id SERIAL PRIMARY KEY,
        song VARCHAR(255) NOT NULL,
        artist VARCHAR(255) NOT NULL,
        genre VARCHAR(255) NOT NULL
      );
    `);
    console.log("✅ Table created successfully");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  } finally {
    pool.end();
  }
}

createTable();

