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

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("useLabyrinthStorage — autosave", () => {
  it("saveAutosave persists to localStorage and loadAutosave retrieves it", () => {
    const { result } = renderHook(() => useLabyrinthStorage());

    act(() => {
      result.current.saveAutosave(MINIMAL_STATE);
    });

    const raw = localStorage.getItem(AUTOSAVE_KEY);
    expect(raw).not.toBeNull();

    const loaded = result.current.loadAutosave();
    expect(loaded?.activePawn).toBe("red");
    expect(loaded?.isGameStarted).toBe(false);
  });
});

describe("useLabyrinthStorage — named slots", () => {
  it("saveSlot creates a slot and loadSlot retrieves it", async () => {
    const { result } = renderHook(() => useLabyrinthStorage());

    let success = false;
    await act(async () => {
      success = await result.current.saveSlot("My Game", MINIMAL_STATE as AppGameState);
    });

    expect(success).toBe(true);
    expect(result.current.slots.length).toBeGreaterThan(0);
    expect(result.current.slots[0].name).toBe("My Game");

    const slotKey = result.current.slots[0].key;
    const loaded = await act(async () => result.current.loadSlot(slotKey));

    expect(loaded).not.toBeNull();
    expect((loaded as Partial<AppGameState>).activePawn).toBe("red");
  });

  it("deleteSlot removes the slot from the list", async () => {
    const { result } = renderHook(() => useLabyrinthStorage());

    await act(async () => {
      await result.current.saveSlot("To Delete", MINIMAL_STATE as AppGameState);
    });

    const slotKey = result.current.slots[0].key;

    await act(async () => {
      await result.current.deleteSlot(slotKey);
    });

    expect(result.current.slots.find((s) => s.key === slotKey)).toBeUndefined();
  });
});
