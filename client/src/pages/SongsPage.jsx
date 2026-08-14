import AddSongForm from "../components/AddSongForm.jsx";
import SongList from "../components/SongList.jsx";
import { useSongs } from "../hooks/useSongs.js";

export default function SongsPage() {
  const { songs, loading, error, add, remove } = useSongs();
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <AddSongForm onAdd={add} />
      {loading && <p className="text-muted">Loading…</p>}
      {error && <p className="text-sm text-red-300">{error}</p>}
      {!loading && !error && <SongList songs={songs} onDelete={remove} />}
    </section>
  );
}
