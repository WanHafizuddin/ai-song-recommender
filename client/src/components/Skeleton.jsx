// Loading state as a spectrum analyser — the app is "listening" to your mood.
const BARS = Array.from({ length: 32 });

export default function Skeleton() {
  return (
    <div data-testid="skeleton" className="rounded-2xl border border-line bg-panel/50 p-6">
      <div className="flex h-16 items-end justify-center gap-1" aria-hidden="true">
        {BARS.map((_, i) => (
          <span
            key={i}
            className="w-1.5 rounded-full animate-eq"
            style={{
              height: `${25 + ((i * 41) % 72)}%`,
              backgroundColor: i % 2 ? "#ff7a3c" : "#37d0c4",
              transformOrigin: "bottom",
              animationDelay: `${(i % 8) * 0.08}s`,
            }}
          />
        ))}
      </div>
      <p className="mt-4 text-center font-mono text-xs uppercase tracking-widest text-haze">
        Cueing up your playlist…
      </p>
    </div>
  );
}
