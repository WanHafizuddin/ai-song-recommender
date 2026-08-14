import { NavLink } from "react-router-dom";
import { useUsername } from "../context/UsernameContext.jsx";

export default function NavBar() {
  const { username, clearUsername } = useUsername();
  const link = ({ isActive }) =>
    `rounded-lg px-3 py-1.5 text-sm ${isActive ? "bg-accent text-white" : "text-muted hover:text-text"}`;
  return (
    <header className="border-b border-border">
      <nav className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <NavLink to="/" className={link} end>
            Mood
          </NavLink>
          <NavLink to="/songs" className={link}>
            Songs
          </NavLink>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted">
          <span>{username}</span>
          <button onClick={clearUsername} className="hover:text-text" aria-label="Change username">
            ✎
          </button>
        </div>
      </nav>
    </header>
  );
}
