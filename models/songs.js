const db = require("../util/database");

module.exports = class Song {
  constructor(song, artist, genre, id) {
    this.song = song;
    this.artist = artist;
    this.genre = genre;
    this.id = id;
  }

  async save() {
    return db.query(
      "INSERT INTO song_table (song, artist, genre) VALUES ($1, $2, $3)",
      [this.song, this.artist, this.genre]
    );
  }

  static fetchAll() {
    return db.query("SELECT * FROM song_table");
  }

  static deleteById(id) {
    return db.query("DELETE FROM song_table WHERE id = $1", [id]);
  }
};