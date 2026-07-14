import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LandingPage } from "./LandingPage";

describe("LandingPage", () => {
  it("renders without crashing", () => {
    render(
      <LandingPage
        allSlots={[]}
        onNewGame={vi.fn()}
        onLoadSlot={vi.fn()}
      />
    );
    expect(screen.getByText(/Labyrinth Game Solver/i)).toBeTruthy();
  });

  it("shows New Game button", () => {
    render(
      <LandingPage
        allSlots={[]}
        onNewGame={vi.fn()}
        onLoadSlot={vi.fn()}
      />
    );
    expect(screen.getByText(/New Game/i)).toBeTruthy();
  });

  it("shows load game section when slots are provided", () => {
    const slots = [{ key: "slot_1", name: "My Game", timestamp: Date.now() }];
    render(
      <LandingPage
        allSlots={slots}
        onNewGame={vi.fn()}
        onLoadSlot={vi.fn()}
      />
    );
    expect(screen.getByText("My Game")).toBeTruthy();
  });
});
