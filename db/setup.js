require("dotenv").config();
const fs = require("fs");
const path = require("path");
const db = require("../util/database");

async function main() {
  const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
  await db.query(schema);
  console.log("✅ Schema applied");
  const seedPath = path.join(__dirname, "seed.sql");
  if (fs.existsSync(seedPath) && process.argv.includes("--seed")) {
    await db.query(fs.readFileSync(seedPath, "utf8"));
    console.log("✅ Seed applied");
  }
  await db.pool.end();
}

main().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
