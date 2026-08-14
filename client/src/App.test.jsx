import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App.jsx";
import * as api from "./api.js";

vi.mock("./api.js");

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem("asr:username", "wan");
  api.getSongs.mockResolvedValue([]);
});

describe("App", () => {
  it("shows the Mood page by default and navigates to Songs", async () => {
    render(<App />);
    expect(screen.getByPlaceholderText(/describe a mood/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("link", { name: /songs/i }));
    expect(screen.getByPlaceholderText("Title")).toBeInTheDocument();
  });

  it("gates behind the username screen when none is set", () => {
    localStorage.clear();
    render(<App />);
    expect(screen.getByPlaceholderText("Your name")).toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/describe a mood/i)).not.toBeInTheDocument();
  });
});
