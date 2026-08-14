export default function GenreBadge({ genre }) {
  if (!genre) return null;
  return (
    <span className="shrink-0 rounded-full border border-line px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-haze">
      {genre}
    </span>
  );
}
