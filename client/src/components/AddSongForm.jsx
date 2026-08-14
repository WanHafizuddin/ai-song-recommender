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
      setError(err.message || "Couldn't add that song");
    }
  };
  const field =
    "rounded-lg border border-line bg-ink/60 px-3 py-2 text-sm text-chalk placeholder-haze/50 outline-none focus:border-ember";
  return (
    <form onSubmit={submit} className="rounded-2xl border border-line bg-panel/60 p-4">
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <input value={form.title} onChange={change("title")} placeholder="Title" className={field} />
        <input value={form.artist} onChange={change("artist")} placeholder="Artist" className={field} />
        <input value={form.genre} onChange={change("genre")} placeholder="Genre (optional)" className={field} />
        <Button type="submit">Add</Button>
      </div>
      {error && <p className="mt-2 font-mono text-xs text-danger">{error}</p>}
    </form>
  );
}
