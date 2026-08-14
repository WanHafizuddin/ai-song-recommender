import GenreBadge from "./GenreBadge.jsx";

export default function SongRow({ song, onDelete }) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
      <div>
        <p className="font-medium text-text">{song.title}</p>
        <p className="text-sm text-muted">{song.artist}</p>
      </div>
      <div className="flex items-center gap-3">
        <GenreBadge genre={song.genre} />
        <button
          onClick={() => onDelete(song.id)}
          aria-label={`Delete ${song.title}`}
          className="text-sm text-muted hover:text-red-300"
        >
          Delete
        </button>
      </div>
    </li>
  );
}
