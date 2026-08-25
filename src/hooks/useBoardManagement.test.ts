import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoardManagement, createInitialPresetGrid } from "./useBoardManagement";

describe("useBoardManagement", () => {
  it("initializes a 7x7 grid with 16 fixed preset tiles", () => {
    const grid = createInitialPresetGrid();
    expect(grid.length).toBe(7);
    expect(grid[0].length).toBe(7);

    let fixedCount = 0;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (grid[r][c]?.isFixed) fixedCount++;
      }
    }
    expect(fixedCount).toBe(16);
  });

  it("rotates spare tile on handleTileClick", () => {
    const { result } = renderHook(() => useBoardManagement());
    expect(result.current.spareTile.rotation).toBe(0);

    act(() => {
      result.current.handleTileClick(result.current.spareTile.id, false, true);
    });
    expect(result.current.spareTile.rotation).toBe(90);

    act(() => {
      result.current.handleTileClick(result.current.spareTile.id, false, true);
    });
    expect(result.current.spareTile.rotation).toBe(180);
  });

  it("resets board presets properly", () => {
    const { result } = renderHook(() => useBoardManagement());
    act(() => {
      result.current.setLastShiftArrowId("col-1-top");
      result.current.resetBoardPresets();
    });
    expect(result.current.lastShiftArrowId).toBeNull();
    expect(result.current.grid.length).toBe(7);
  });
});
