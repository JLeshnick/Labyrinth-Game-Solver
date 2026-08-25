import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SetupPanel } from "./SetupPanel";

function renderPanel(overrides: Partial<Parameters<typeof SetupPanel>[0]> = {}) {
  const setSetupTab = vi.fn();
  const props = {
    looseTiles: [],
    activePlayers: ["red", "blue", "green", "yellow"],
    setActivePlayers: vi.fn(),
    activePawn: "red",
    setActivePawn: vi.fn(),
    isMuted: true,
    playerHands: {},
    onTileClick: vi.fn(),
    onRandomizeBoard: vi.fn(),
    onResetBoard: vi.fn(),
    onAddCard: vi.fn(),
    onRemoveCard: vi.fn(),
    setupTab: "tiles" as const,
    setSetupTab,
    canStartGame: false,
    onStartGame: vi.fn(),
    showToast: vi.fn(),
    ...overrides,
  };
  const utils = render(<SetupPanel {...props} />);
  return { ...utils, setSetupTab };
}

describe("SetupPanel — Pawns placement removed", () => {
  it("renders Tiles, Mode, Players, and Cards tabs (no manual pawn-placement tab)", () => {
    renderPanel();
    expect(screen.getByRole("button", { name: /tiles/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /mode/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /players/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /cards/i })).toBeTruthy();
  });

  it("does not render a 'Pawn Spawns Placed' checklist row", () => {
    renderPanel();
    expect(screen.queryByText(/pawn spawns placed/i)).toBeNull();
  });

  it("switches to the Players tab when clicked", () => {
    const { setSetupTab } = renderPanel();
    fireEvent.click(screen.getByRole("button", { name: /players/i }));
    expect(setSetupTab).toHaveBeenCalledWith("players");
  });

  it("renders active player toggles when setupTab is 'players'", () => {
    renderPanel({ setupTab: "players" });
    expect(screen.getAllByText(/active players/i).length).toBeGreaterThan(0);
  });

  it("renders the Cards tab content when setupTab is 'cards'", () => {
    renderPanel({ setupTab: "cards" });
    expect(screen.getByText(/select player/i)).toBeTruthy();
  });

  it("renders the Reset button with proper label", () => {
    const onResetAllDefaults = vi.fn();
    renderPanel({ setupTab: "tiles", onResetAllDefaults });
    const resetBtn = screen.getByRole("button", { name: /reset all defaults/i });
    expect(resetBtn).toBeTruthy();
    expect(resetBtn.textContent).toContain("Reset");
    fireEvent.click(resetBtn);
    expect(onResetAllDefaults).toHaveBeenCalledTimes(1);
  });
});
