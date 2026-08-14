export default function Button({ children, className = "", ...props }) {
  return (
    <button
      className={`rounded-lg bg-accent px-4 py-2 font-medium text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
