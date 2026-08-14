import AddSongForm from "../components/AddSongForm.jsx";
import SongList from "../components/SongList.jsx";
import { useSongs } from "../hooks/useSongs.js";

export default function SongsPage() {
  const { songs, loading, error, add, remove } = useSongs();
  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div className="pt-8">
        <h1 className="font-display text-3xl font-extrabold tracking-tight">The catalog</h1>
        <p className="mt-2 text-haze">
          Every track the recommender can pull from. Add your own — the energy meter fills in once it&apos;s labelled.
        </p>
      </div>
      <AddSongForm onAdd={add} />
      {loading && <p className="font-mono text-xs uppercase tracking-widest text-haze">Loading…</p>}
      {error && <p className="text-sm text-danger">{error}</p>}
      {!loading && !error && <SongList songs={songs} onDelete={remove} />}
    </section>
  );
}
