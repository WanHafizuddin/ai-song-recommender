const express = require("express");
const app = express();
const path = require("path");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.static("public"));



const songRoutes = require("./routes/song");
const playlistRoutes = require("./routes/playlists");
const deleteRoutes = require ("./routes/delete")

app.use(playlistRoutes);
app.use(songRoutes);
app.use(deleteRoutes)


app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
