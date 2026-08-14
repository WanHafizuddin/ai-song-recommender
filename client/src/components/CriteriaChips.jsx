import EnergyMeter from "./EnergyMeter.jsx";

// The "what we heard" readout: the AI's interpretation of the mood, led by the
// energy meter (real extracted data), then genre and tags.
export default function CriteriaChips({ criteria }) {
  if (!criteria) return null;
  const tags = criteria.tags || [];
  const hasEnergy = Number.isInteger(criteria.energy);
  if (!hasEnergy && !criteria.genre && tags.length === 0) return null;
  return (
    <div
      data-testid="criteria-chips"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-line bg-panel/50 px-4 py-3"
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-haze/70">What we heard</span>
      {hasEnergy && (
        <span className="flex items-center gap-2">
          <EnergyMeter energy={criteria.energy} />
          <span className="font-mono text-[11px] text-haze">energy {criteria.energy}</span>
        </span>
      )}
      {criteria.genre && (
        <span className="font-mono text-[11px] uppercase tracking-widest text-frost">{criteria.genre}</span>
      )}
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-ember/10 px-2.5 py-0.5 font-mono text-[11px] text-ember">
          {t}
        </span>
      ))}
    </div>
  );
}
