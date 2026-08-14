import GenreBadge from "./GenreBadge.jsx";
import EnergyMeter from "./EnergyMeter.jsx";

export default function SongRow({ song, onDelete }) {
  const labelled = Number.isInteger(song.energy);
  return (
    <li className="flex items-center justify-between gap-4 rounded-xl border border-line bg-panel/60 px-4 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-chalk">{song.title}</p>
        <p className="truncate text-sm text-haze">{song.artist}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        {labelled ? (
          <EnergyMeter energy={song.energy} />
        ) : (
          <span className="font-mono text-[10px] uppercase tracking-widest text-haze/40">unlabelled</span>
        )}
        <GenreBadge genre={song.genre} />
        <button
          onClick={() => onDelete(song.id)}
          aria-label={`Delete ${song.title}`}
          className="font-mono text-xs uppercase tracking-widest text-haze/70 transition hover:text-danger"
        >
          Del
        </button>
      </div>
    </li>
  );
}
