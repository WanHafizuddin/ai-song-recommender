import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MoodInput from "./MoodInput.jsx";
import PlaylistResults from "./PlaylistResults.jsx";
import SongCard from "./SongCard.jsx";

describe("MoodInput", () => {
  it("calls onSubmit with trimmed text", async () => {
    const onSubmit = vi.fn();
    render(<MoodInput onSubmit={onSubmit} loading={false} />);
    await userEvent.type(screen.getByPlaceholderText(/describe a mood/i), "  chill  ");
    await userEvent.click(screen.getByRole("button", { name: /get playlist/i }));
    expect(onSubmit).toHaveBeenCalledWith("chill");
  });
  it("disables the button while loading", () => {
    render(<MoodInput onSubmit={() => {}} loading={true} />);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("PlaylistResults", () => {
  it("shows a skeleton while loading", () => {
    render(<PlaylistResults loading={true} playlist={null} />);
    expect(screen.getByTestId("skeleton")).toBeInTheDocument();
  });
  it("shows the empty message when playlist is empty", () => {
    render(<PlaylistResults loading={false} playlist={[]} message="Nothing found" />);
    expect(screen.getByText("Nothing found")).toBeInTheDocument();
  });
  it("renders song cards with reasons", () => {
    render(
      <PlaylistResults
        loading={false}
        playlist={[{ id: 1, title: "A", artist: "x", genre: "POP", reason: "fits" }]}
        criteria={{ tags: ["chill"] }}
      />
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("fits")).toBeInTheDocument();
  });
});

describe("SongCard", () => {
  it("renders title, artist, genre", () => {
    render(<SongCard song={{ id: 1, title: "A", artist: "x", genre: "POP", reason: null }} />);
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("x")).toBeInTheDocument();
    expect(screen.getByText("POP")).toBeInTheDocument();
  });
});
