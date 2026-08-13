
const db = require("./util/database");

async function testDB() {
  try {
    const res = await db.query("SELECT NOW()");
    console.log("✅ Database connected! Current Time:", res.rows);
  } catch (err) {
    console.error("❌ Database connection error:", err);
  }
}

testDB();
