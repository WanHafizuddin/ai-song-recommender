import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSongs } from "./useSongs.js";
import * as api from "../api.js";

vi.mock("../api.js");

beforeEach(() => vi.resetAllMocks());

describe("useSongs", () => {
  it("loads songs on mount", async () => {
    api.getSongs.mockResolvedValue([{ id: 1, title: "A" }]);
    const { result } = renderHook(() => useSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.songs).toHaveLength(1);
  });
  it("add prepends the created song", async () => {
    api.getSongs.mockResolvedValue([]);
    api.createSong.mockResolvedValue({ id: 2, title: "New" });
    const { result } = renderHook(() => useSongs());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add({ title: "New", artist: "X" });
    });
    expect(result.current.songs[0]).toMatchObject({ id: 2 });
  });
  it("remove drops the song", async () => {
    api.getSongs.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    api.deleteSong.mockResolvedValue(null);
    const { result } = renderHook(() => useSongs());
    await waitFor(() => expect(result.current.songs).toHaveLength(2));
    await act(async () => {
      await result.current.remove(1);
    });
    expect(result.current.songs.map((s) => s.id)).toEqual([2]);
  });
});
