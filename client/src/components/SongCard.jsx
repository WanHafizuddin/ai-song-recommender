import GenreBadge from "./GenreBadge.jsx";

export default function SongCard({ song }) {
  return (
    <article className="rounded-xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-semibold text-text">{song.title}</h3>
        <GenreBadge genre={song.genre} />
      </div>
      <p className="text-sm text-muted">{song.artist}</p>
      {song.reason && <p className="mt-2 text-sm text-text/80">{song.reason}</p>}
    </article>
  );
}
