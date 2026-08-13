require("dotenv").config();
const express = require("express");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use(require("./routes/songs"));
app.use(require("./routes/recommend"));

// Unknown API routes → JSON 404 (never fall through to the SPA).
app.use("/api", (req, res) => res.status(404).json({ error: "not found" }));

// Serve the built React client (created by the frontend plan) + SPA fallback.
const clientDist = path.join(__dirname, "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"), (err) => {
    if (err) res.status(404).send("Client not built yet. Run the frontend build.");
  });
});

if (require.main === module) {
  app.listen(port, () => console.log(`✅ Server running on port ${port}`));
}

module.exports = app;
