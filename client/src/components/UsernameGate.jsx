import { useState } from "react";
import { useUsername } from "../context/UsernameContext.jsx";
import Button from "./Button.jsx";

export default function UsernameGate({ children }) {
  const { username, setUsername } = useUsername();
  const [value, setValue] = useState("");
  if (username) return children;
  return (
    <div className="mx-auto flex max-w-sm flex-col gap-4 px-4 py-16">
      <h1 className="text-xl font-semibold text-text">What should we call you?</h1>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setUsername(value);
        }}
        className="space-y-3"
      >
        <input
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your name"
          className="w-full rounded-xl border border-border bg-surface p-3 text-text placeholder-muted outline-none focus:border-accent"
        />
        <Button type="submit" disabled={!value.trim()} className="w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
