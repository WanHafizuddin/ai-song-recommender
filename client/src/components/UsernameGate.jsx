import { useState } from "react";
import { useUsername } from "../context/UsernameContext.jsx";
import Button from "./Button.jsx";

export default function UsernameGate({ children }) {
  const { username, setUsername } = useUsername();
  const [value, setValue] = useState("");
  if (username) return children;
  return (
    <div className="flex min-h-screen items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="mb-7 flex items-center gap-2">
          <span className="inline-flex h-6 items-end gap-[3px]" aria-hidden="true">
            <span className="h-3 w-1 rounded-sm bg-frost animate-eq" style={{ transformOrigin: "bottom" }} />
            <span className="h-6 w-1 rounded-sm bg-ember animate-eq" style={{ transformOrigin: "bottom", animationDelay: "0.15s" }} />
            <span className="h-4 w-1 rounded-sm bg-frost animate-eq" style={{ transformOrigin: "bottom", animationDelay: "0.3s" }} />
          </span>
          <span className="font-display text-2xl font-extrabold tracking-tight">moodwave</span>
        </div>
        <h1 className="font-display text-3xl font-bold leading-tight">What should we call you?</h1>
        <p className="mt-2 text-sm text-haze">Your playlists get saved under this name. No password, no fuss.</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setUsername(value);
          }}
          className="mt-6 space-y-3"
        >
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your name"
            className="w-full rounded-xl border border-line bg-panel px-4 py-3 text-chalk placeholder-haze/60 outline-none focus:border-ember"
          />
          <Button type="submit" disabled={!value.trim()} className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}
