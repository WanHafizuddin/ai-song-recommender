import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { UsernameProvider } from "./UsernameContext.jsx";
import UsernameGate from "../components/UsernameGate.jsx";

function Protected() {
  return <p>secret content</p>;
}

beforeEach(() => localStorage.clear());

describe("UsernameGate + context", () => {
  it("blocks content until a username is set, then persists it", async () => {
    render(
      <UsernameProvider>
        <UsernameGate>
          <Protected />
        </UsernameGate>
      </UsernameProvider>
    );
    expect(screen.queryByText("secret content")).not.toBeInTheDocument();
    await userEvent.type(screen.getByPlaceholderText("Your name"), "wan");
    await userEvent.click(screen.getByRole("button", { name: /continue/i }));
    expect(screen.getByText("secret content")).toBeInTheDocument();
    expect(localStorage.getItem("asr:username")).toBe("wan");
  });
});
