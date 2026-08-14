export default function CriteriaChips({ criteria }) {
  if (!criteria) return null;
  const chips = [];
  if (criteria.energy != null) chips.push(`energy ${criteria.energy}`);
  if (criteria.genre) chips.push(criteria.genre);
  (criteria.tags || []).forEach((t) => chips.push(t));
  if (chips.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2" data-testid="criteria-chips">
      {chips.map((c) => (
        <span key={c} className="rounded-full bg-accent/15 px-3 py-1 text-xs text-accent">
          {c}
        </span>
      ))}
    </div>
  );
}
