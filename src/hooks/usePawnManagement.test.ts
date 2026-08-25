import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePawnManagement } from "./usePawnManagement";
import { DEFAULT_PAWN_POSITIONS } from "../constants";

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

describe("usePawnManagement", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("rotates turn through active players", () => {
    const { result } = renderHook(() => usePawnManagement());
    expect(result.current.activePawn).toBe("red");

    act(() => {
      result.current.switchToNextPawn();
    });
    expect(result.current.activePawn).toBe("blue");

    act(() => {
      result.current.switchToNextPawn();
    });
    expect(result.current.activePawn).toBe("green");

    act(() => {
      result.current.switchToNextPawn();
    });
    expect(result.current.activePawn).toBe("yellow");

    act(() => {
      result.current.switchToNextPawn();
    });
    expect(result.current.activePawn).toBe("red");
  });

  it("tracks pawn moves and treasures found", () => {
    const { result } = renderHook(() => usePawnManagement());

    act(() => {
      result.current.trackPawnMove("red", 3);
      result.current.trackPawnTreasure("red");
    });

    expect(result.current.pawnStats.red?.tilesMoved).toBe(3);
    expect(result.current.pawnStats.red?.treasuresFound).toBe(1);
  });

  it("resets pawn positions and stats on resetPawnState", () => {
    const { result } = renderHook(() => usePawnManagement());

    act(() => {
      result.current.setPawnPositions({ ...DEFAULT_PAWN_POSITIONS, red: { r: 3, c: 3 } });
      result.current.trackPawnMove("red", 5);
      result.current.resetPawnState();
    });

    expect(result.current.pawnPositions.red).toEqual({ r: 0, c: 0 });
    expect(result.current.pawnStats).toEqual({});
  });
});
