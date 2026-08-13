const express = require ("express");
const router = express.Router();
const Song = require("../models/songs");

router.get("/playlists", (req, res) => {
  Song.fetchAll()
    .then((result) => {
      res.render("playlists", { ply: result.rows, path: "/playlists" });
      console.log(result.rows);
    })
    .catch((err) => console.error("DB Error:", err));
});

module.exports = router;