import { NavLink } from "react-router-dom";
import { useUsername } from "../context/UsernameContext.jsx";

export default function NavBar() {
  const { username, clearUsername } = useUsername();
  const tab = ({ isActive }) =>
    `border-b-2 pb-1 font-mono text-xs uppercase tracking-widest transition ${
      isActive ? "border-ember text-chalk" : "border-transparent text-haze hover:text-chalk"
    }`;
  return (
    <header className="sticky top-0 z-10 border-b border-line bg-ink/80 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-4 items-end gap-[2px]" aria-hidden="true">
            <span className="h-2 w-[3px] rounded-sm bg-frost" />
            <span className="h-4 w-[3px] rounded-sm bg-ember" />
            <span className="h-3 w-[3px] rounded-sm bg-frost/70" />
          </span>
          <span className="font-display text-lg font-extrabold tracking-tight text-chalk">moodwave</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-5">
            <NavLink to="/" className={tab} end>
              Mood
            </NavLink>
            <NavLink to="/songs" className={tab}>
              Songs
            </NavLink>
          </div>
          <button
            onClick={clearUsername}
            aria-label="Change username"
            className="group flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs text-haze transition hover:border-ember/60 hover:text-chalk"
          >
            <span className="font-mono">{username}</span>
            <span className="text-[10px] opacity-60 transition group-hover:opacity-100">edit</span>
          </button>
        </div>
      </nav>
    </header>
  );
}
