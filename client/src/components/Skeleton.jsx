export default function Skeleton({ count = 3 }) {
  return (
    <div className="space-y-3" data-testid="skeleton">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="h-20 animate-pulse rounded-xl border border-border bg-surface" />
      ))}
    </div>
  );
}
