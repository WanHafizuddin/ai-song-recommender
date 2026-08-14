export default function GenreBadge({ genre }) {
  if (!genre) return null;
  return (
    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted">{genre}</span>
  );
}
