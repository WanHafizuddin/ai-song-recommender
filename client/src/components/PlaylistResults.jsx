import SongCard from "./SongCard.jsx";
import CriteriaChips from "./CriteriaChips.jsx";
import Skeleton from "./Skeleton.jsx";
import EmptyState from "./EmptyState.jsx";

export default function PlaylistResults({ loading, playlist, criteria, message, error }) {
  if (loading) return <Skeleton />;
  if (error)
    return (
      <p className="rounded-xl border border-danger/40 bg-danger/10 p-4 text-sm text-danger">{error}</p>
    );
  if (playlist == null) return null;
  if (playlist.length === 0)
    return <EmptyState message={message || "Nothing matched that mood. Try describing it another way."} />;
  return (
    <div className="space-y-5">
      <CriteriaChips criteria={criteria} />
      <div className="flex items-center gap-3">
        <span className="font-mono text-[10px] uppercase tracking-widest text-haze/70">Your playlist</span>
        <span className="h-px flex-1 bg-line" />
        <span className="font-mono text-[10px] text-haze/70">{playlist.length} tracks</span>
      </div>
      <div className="space-y-3">
        {playlist.map((s, i) => (
          <SongCard key={s.id} song={s} index={i} />
        ))}
      </div>
    </div>
  );
}
