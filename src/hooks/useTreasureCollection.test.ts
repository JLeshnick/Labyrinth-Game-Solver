import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTreasureCollection } from "./useTreasureCollection";

describe("useTreasureCollection", () => {
  it("adds and removes cards from player hands", () => {
    const { result } = renderHook(() => useTreasureCollection());

    act(() => {
      result.current.handleAddCard("gem", "red");
    });
    expect(result.current.playerHands.red).toContain("gem");
    expect(result.current.playerActiveTargets.red).toBe("gem");

    act(() => {
      result.current.handleRemoveCard("gem", "red");
    });
    expect(result.current.playerHands.red).not.toContain("gem");
    expect(result.current.playerActiveTargets.red).toBeNull();
  });

  it("handles adding all cards and clearing all cards", () => {
    const { result } = renderHook(() => useTreasureCollection());

    act(() => {
      result.current.handleAddAllCards("red");
    });
    expect(result.current.playerHands.red.length).toBeGreaterThan(0);
    expect(result.current.playerActiveTargets.red).not.toBeNull();

    act(() => {
      result.current.handleClearAllCards("red");
    });
    expect(result.current.playerHands.red.length).toBe(0);
    expect(result.current.playerActiveTargets.red).toBeNull();
  });

  it("resets all treasure states on resetTreasureState", () => {
    const { result } = renderHook(() => useTreasureCollection());

    act(() => {
      result.current.handleAddCard("gem", "red");
      result.current.setCoopObtainedTreasures(["gem"]);
      result.current.resetTreasureState();
    });

    expect(result.current.playerHands.red).toEqual([]);
    expect(result.current.coopObtainedTreasures).toEqual([]);
  });
});
