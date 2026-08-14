import { useState } from "react";
import Button from "./Button.jsx";

const MAX = 500;

export default function MoodInput({ onSubmit, loading }) {
  const [text, setText] = useState("");
  const submit = (e) => {
    e.preventDefault();
    const t = text.trim();
    if (t) onSubmit(t);
  };
  return (
    <form
      onSubmit={submit}
      className="rounded-2xl border border-line bg-panel/70 p-2 transition focus-within:border-ember/60"
    >
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={3}
        placeholder="Describe a mood… a rainy night, a gym session, heartbreak at 2am"
        className="w-full resize-none bg-transparent px-4 pt-3 text-lg leading-relaxed text-chalk placeholder-haze/50 outline-none"
      />
      <div className="flex items-center justify-between px-2 pb-1">
        <span className="font-mono text-[11px] uppercase tracking-widest text-haze/70">
          {text.length}/{MAX}
        </span>
        <Button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Finding songs…" : "Get playlist"}
        </Button>
      </div>
    </form>
  );
}
