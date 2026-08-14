import { useCallback, useEffect, useState } from "react";
import { getSongs, createSong, deleteSong } from "../api.js";

export function useSongs() {
  const [songs, setSongs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setSongs(await getSongs());
    } catch (e) {
      setError(e.message || "Failed to load songs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const add = async (song) => {
    const created = await createSong(song);
    setSongs((prev) => [created, ...prev]);
    return created;
  };

  const remove = async (id) => {
    await deleteSong(id);
    setSongs((prev) => prev.filter((s) => s.id !== id));
  };

  return { songs, loading, error, add, remove, reload };
}
