export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full bg-ember px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-ink transition hover:bg-ember-hover disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
