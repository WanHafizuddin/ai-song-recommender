import GenreBadge from "./GenreBadge.jsx";

export default function SongCard({ song, index }) {
  return (
    <article className="group rounded-2xl border border-line bg-panel/70 p-5 transition hover:border-ember/40 hover:bg-panel">
      <div className="flex items-start gap-4">
        {index != null && (
          <span className="mt-1 font-mono text-xs tabular-nums text-haze/50">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="truncate font-display text-lg font-bold text-chalk">{song.title}</h3>
            <GenreBadge genre={song.genre} />
          </div>
          <p className="mt-0.5 text-sm text-haze">{song.artist}</p>
          {song.reason && (
            <p className="mt-3 border-l-2 border-ember/40 pl-3 text-sm italic leading-relaxed text-chalk/85">
              {song.reason}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
