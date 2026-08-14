import SongCard from "./SongCard.jsx";
import CriteriaChips from "./CriteriaChips.jsx";
import Skeleton from "./Skeleton.jsx";
import EmptyState from "./EmptyState.jsx";

export default function PlaylistResults({ loading, playlist, criteria, message, error }) {
  if (loading) return <Skeleton />;
  if (error)
    return (
      <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
        {error}
      </p>
    );
  if (playlist == null) return null;
  if (playlist.length === 0)
    return <EmptyState message={message || "No matching songs. Try a different mood."} />;
  return (
    <div className="space-y-4">
      <CriteriaChips criteria={criteria} />
      <div className="grid gap-3">
        {playlist.map((s) => (
          <SongCard key={s.id} song={s} />
        ))}
      </div>
    </div>
  );
}
