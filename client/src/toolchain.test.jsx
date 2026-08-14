import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

function Hello() {
  return <p>hello vitest</p>;
}

describe("toolchain", () => {
  it("renders a component with RTL + jsdom", () => {
    render(<Hello />);
    expect(screen.getByText("hello vitest")).toBeInTheDocument();
  });
});
