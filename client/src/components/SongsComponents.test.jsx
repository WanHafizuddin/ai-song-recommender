import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddSongForm from "./AddSongForm.jsx";
import SongList from "./SongList.jsx";

describe("AddSongForm", () => {
  it("requires title and artist", async () => {
    const onAdd = vi.fn();
    render(<AddSongForm onAdd={onAdd} />);
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByText(/required/i)).toBeInTheDocument();
  });
  it("submits title/artist/genre (blank genre → null)", async () => {
    const onAdd = vi.fn().mockResolvedValue({ id: 1 });
    render(<AddSongForm onAdd={onAdd} />);
    await userEvent.type(screen.getByPlaceholderText("Title"), "T");
    await userEvent.type(screen.getByPlaceholderText("Artist"), "A");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(onAdd).toHaveBeenCalledWith({ title: "T", artist: "A", genre: null });
  });
});

describe("SongList", () => {
  it("shows empty state with no songs", () => {
    render(<SongList songs={[]} onDelete={() => {}} />);
    expect(screen.getByText(/no songs yet/i)).toBeInTheDocument();
  });
  it("calls onDelete with the id", async () => {
    const onDelete = vi.fn();
    render(<SongList songs={[{ id: 7, title: "A", artist: "x" }]} onDelete={onDelete} />);
    await userEvent.click(screen.getByRole("button", { name: /delete a/i }));
    expect(onDelete).toHaveBeenCalledWith(7);
  });
});
