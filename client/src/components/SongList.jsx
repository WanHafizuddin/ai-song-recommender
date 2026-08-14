import SongRow from "./SongRow.jsx";
import EmptyState from "./EmptyState.jsx";

export default function SongList({ songs, onDelete }) {
  if (songs.length === 0) return <EmptyState message="No songs yet. Add one above." />;
  return (
    <ul className="space-y-2">
      {songs.map((s) => (
        <SongRow key={s.id} song={s} onDelete={onDelete} />
      ))}
    </ul>
  );
}
