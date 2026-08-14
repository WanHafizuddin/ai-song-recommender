import { useState } from "react";
import Button from "./Button.jsx";

const EMPTY = { title: "", artist: "", genre: "" };

export default function AddSongForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState(null);
  const change = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.artist.trim()) {
      setError("Title and artist are required");
      return;
    }
    setError(null);
    try {
      await onAdd({
        title: form.title.trim(),
        artist: form.artist.trim(),
        genre: form.genre.trim() || null,
      });
      setForm(EMPTY);
    } catch (err) {
      setError(err.message || "Failed to add");
    }
  };
  return (
    <form onSubmit={submit} className="grid gap-3 rounded-xl border border-border bg-surface p-4 sm:grid-cols-4">
      <input value={form.title} onChange={change("title")} placeholder="Title" className="rounded-lg border border-border bg-bg p-2 text-text placeholder-muted outline-none focus:border-accent" />
      <input value={form.artist} onChange={change("artist")} placeholder="Artist" className="rounded-lg border border-border bg-bg p-2 text-text placeholder-muted outline-none focus:border-accent" />
      <input value={form.genre} onChange={change("genre")} placeholder="Genre (optional)" className="rounded-lg border border-border bg-bg p-2 text-text placeholder-muted outline-none focus:border-accent" />
      <Button type="submit">Add</Button>
      {error && <p className="text-sm text-red-300 sm:col-span-4">{error}</p>}
    </form>
  );
}
