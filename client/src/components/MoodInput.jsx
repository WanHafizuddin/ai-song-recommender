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
    <form onSubmit={submit} className="space-y-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        maxLength={MAX}
        rows={3}
        placeholder="Describe a mood… e.g. calm rainy night to focus"
        className="w-full resize-none rounded-xl border border-border bg-surface p-4 text-text placeholder-muted outline-none focus:border-accent"
      />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted">
          {text.length}/{MAX}
        </span>
        <Button type="submit" disabled={loading || !text.trim()}>
          {loading ? "Finding songs…" : "Get playlist"}
        </Button>
      </div>
    </form>
  );
}
