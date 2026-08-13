const express = require ("express")
const router = express.Router();
const Song = require("../models/songs");

router.get("/playlists/delete/:id", (req, res) => {
  const { id } = req.params; // Extract id from request parameters
  
  Song.deleteById(id)
    .then(() => {
      console.log("Deleted successfully!");
      res.redirect("/playlists");
    })
    .catch((err) => {
      console.log("Error deleting:", err);
      res.status(500).send("Error deleting song");
    });
});

module.exports = router;