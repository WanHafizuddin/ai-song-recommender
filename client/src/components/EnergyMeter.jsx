// The signature element: a 5-bar equalizer for the 1–5 energy scale, coloured
// along a cool→hot ramp (cyan = calm, amber = energetic). Reused in the mood
// readout and the catalog. `animate` turns it into a "listening" animation.
const RAMP = ["#37d0c4", "#7fd08f", "#d7cf5e", "#f6a83f", "#ff7a3c"];

export default function EnergyMeter({ energy, animate = false, className = "" }) {
  const level = Number.isInteger(energy) ? energy : 0;
  return (
    <span
      role="img"
      aria-label={level ? `energy ${level} of 5` : "energy not labelled"}
      className={`inline-flex h-4 items-end gap-[3px] ${className}`}
    >
      {[1, 2, 3, 4, 5].map((i) => {
        const on = i <= level;
        return (
          <span
            key={i}
            className={`w-[3px] rounded-sm ${animate ? "animate-eq" : ""}`}
            style={{
              height: `${40 + i * 12}%`,
              backgroundColor: on ? RAMP[i - 1] : "rgba(255,255,255,0.12)",
              transformOrigin: "bottom",
              animationDelay: animate ? `${i * 0.12}s` : undefined,
            }}
          />
        );
      })}
    </span>
  );
}
