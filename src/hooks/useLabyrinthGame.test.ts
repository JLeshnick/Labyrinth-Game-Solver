import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabyrinthGame } from "./useLabyrinthGame";

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, "localStorage", { value: localStorageMock, writable: true });
Object.defineProperty(global, "localStorage", { value: localStorageMock, writable: true });

function renderGame() {
  return renderHook(() => useLabyrinthGame({ isMuted: true, onToast: () => {} }));
}

beforeEach(() => {
  window.localStorage.clear();
});

describe("useLabyrinthGame — switchToNextPawn", () => {
  it("advances activePawn to the next player in activePlayers order", () => {
    const { result } = renderGame();
    expect(result.current.activePawn).toBe("red");

    act(() => {
      result.current.switchToNextPawn();
    });

    expect(result.current.activePawn).toBe("blue");
  });

  it("wraps around to the first player after the last", () => {
    const { result } = renderGame();

    act(() => {
      result.current.setActivePawn("yellow");
    });
    act(() => {
      result.current.switchToNextPawn();
    });

    expect(result.current.activePawn).toBe("red");
  });

  it("clears customTargetCoords on turn advance", () => {
    const { result } = renderGame();

    act(() => {
      result.current.setCustomTargetCoords({ r: 2, c: 3 });
    });
    expect(result.current.customTargetCoords).toEqual({ r: 2, c: 3 });

    act(() => {
      result.current.switchToNextPawn();
    });

    expect(result.current.customTargetCoords).toBeNull();
  });
});

describe("useLabyrinthGame — setup state (Pawns placement removed)", () => {
  it("setupTab only takes 'tiles', 'players', or 'cards'", () => {
    const { result } = renderGame();
    expect(result.current.setupTab).toBe("tiles");

    act(() => {
      result.current.setSetupTab("players");
    });
    expect(result.current.setupTab).toBe("players");

    act(() => {
      result.current.setSetupTab("cards");
    });
    expect(result.current.setupTab).toBe("cards");
  });

  it("does not expose pawn-placement state (activePawnPlacementColor)", () => {
    const { result } = renderGame();
    expect((result.current as Record<string, unknown>).activePawnPlacementColor).toBeUndefined();
  });

  it("resetBoardToInitialPresets assigns pawns to their default home corners", () => {
    const { result } = renderGame();

    act(() => {
      result.current.resetBoardToInitialPresets();
    });

    expect(result.current.pawnPositions).toEqual({
      red: { r: 0, c: 0 },
      blue: { r: 6, c: 6 },
      green: { r: 6, c: 0 },
      yellow: { r: 0, c: 6 },
    });
  });
});
