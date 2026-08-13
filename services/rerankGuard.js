function toCard(song, reason) {
  return { id: song.id, title: song.title, artist: song.artist, genre: song.genre, reason };
}

function applyRerank(rerankItems, candidates, maxResults = 15) {
  const byId = new Map(candidates.map((s) => [s.id, s]));
  const seen = new Set();
  const playlist = [];
  for (const item of Array.isArray(rerankItems) ? rerankItems : []) {
    if (!item || typeof item !== "object") continue;
    const id = Number(item.id);
    if (!byId.has(id) || seen.has(id)) continue;
    seen.add(id);
    const reason = typeof item.reason === "string" ? item.reason.trim() : null;
    playlist.push(toCard(byId.get(id), reason));
    if (playlist.length >= maxResults) break;
  }
  return playlist;
}

function fromCandidates(candidates, maxResults = 15) {
  return candidates.slice(0, maxResults).map((s) => toCard(s, null));
}

module.exports = { applyRerank, fromCandidates };
