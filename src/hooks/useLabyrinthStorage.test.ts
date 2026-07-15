import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabyrinthStorage, AUTOSAVE_KEY } from "./useLabyrinthStorage";
import type { AppGameState } from "../types";
import { EMPTY_PLAYER_HANDS, EMPTY_PLAYER_TARGETS, EMPTY_OBTAINED_TREASURES, DEFAULT_PAWN_POSITIONS } from "../constants";

const MINIMAL_STATE: Partial<AppGameState> = {
  board: [],
  looseTiles: [],
  spareTile: { id: "t", shape: "straight", rotation: 0, isFixed: false },
  activePawn: "red",
  playerHands: EMPTY_PLAYER_HANDS,
  playerActiveTargets: EMPTY_PLAYER_TARGETS,
  obtainedTreasures: EMPTY_OBTAINED_TREASURES,
  lastShiftArrowId: null,
  isGameStarted: false,
  gameStartState: null,
  pawnPositions: DEFAULT_PAWN_POSITIONS,
};

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = String(value); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
Object.defineProperty(global, 'localStorage', { value: localStorageMock, writable: true });

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useLabyrinthStorage — autosave", () => {
  it("saveAutosave persists to localStorage and loadAutosave retrieves it", () => {
    const { result } = renderHook(() => useLabyrinthStorage());

    act(() => {
      result.current.saveAutosave(MINIMAL_STATE);
    });

    const raw = window.localStorage.getItem(AUTOSAVE_KEY);
    expect(raw).not.toBeNull();

    const loaded = result.current.loadAutosave();
    expect(loaded?.activePawn).toBe("red");
    expect(loaded?.isGameStarted).toBe(false);
  });
});
