import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useRecommend } from "./useRecommend.js";
import * as api from "../api.js";

vi.mock("../api.js");

beforeEach(() => vi.resetAllMocks());

describe("useRecommend", () => {
  it("submits and exposes the playlist", async () => {
    api.recommend.mockResolvedValue({ playlist: [{ id: 1, title: "A" }], criteria: { tags: ["x"] }, message: null });
    const { result } = renderHook(() => useRecommend("wan"));
    act(() => {
      result.current.submit("chill");
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.playlist).toHaveLength(1);
    expect(api.recommend).toHaveBeenCalledWith("chill", "wan");
  });
  it("exposes an error on failure", async () => {
    api.recommend.mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useRecommend("wan"));
    act(() => {
      result.current.submit("x");
    });
    await waitFor(() => expect(result.current.error).toBe("boom"));
    expect(result.current.playlist).toBeNull();
  });
});
