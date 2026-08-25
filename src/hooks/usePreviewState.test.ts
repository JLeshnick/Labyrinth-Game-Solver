import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePreviewState, computePreviewPawnPositions } from "./usePreviewState";
import { DEFAULT_PAWN_POSITIONS, EMPTY_PLAYER_TARGETS } from "../constants";
import { toSolverBoard, toSolverSpare } from "../lib/solverAdapter";
import type { TileData, PawnPositions } from "../types";

function createMockGrid(): (TileData | null)[][] {
  return Array(7)
    .fill(null)
    .map((_, r) =>
      Array(7)
        .fill(null)
        .map((_, c) => ({
          id: `tile_${r}_${c}`,
          shape: "straight" as const,
          rotation: 0 as const,
          isFixed: false,
          treasure: r === 1 && c === 1 ? { id: "gem", name: "Gem", image: "" } : undefined,
        }))
    );
}

describe("computePreviewPawnPositions", () => {
  it("shifts pawns along a row correctly", () => {
    const pawns: PawnPositions = {
      ...DEFAULT_PAWN_POSITIONS,
      red: { r: 1, c: 2 },
      blue: { r: 3, c: 5 },
    };
    const shifted = computePreviewPawnPositions(
      { type: "row", index: 1, dir: "left" },
      pawns
    );
    expect(shifted.red).toEqual({ r: 1, c: 3 });
    expect(shifted.blue).toEqual({ r: 3, c: 5 }); // unaffected
  });

  it("wraps pawns around edges", () => {
    const pawns: PawnPositions = {
      ...DEFAULT_PAWN_POSITIONS,
      red: { r: 1, c: 6 },
    };
    const shifted = computePreviewPawnPositions(
      { type: "row", index: 1, dir: "left" },
      pawns
    );
    expect(shifted.red).toEqual({ r: 1, c: 0 });
  });
});

describe("usePreviewState", () => {
  it("returns null preview when no solution or staged slide is present", () => {
    const grid = createMockGrid();
    const spareTile: TileData = { id: "spare", shape: "straight", rotation: 0, isFixed: false };
    const { result } = renderHook(() =>
      usePreviewState({
        grid,
        pawnPositions: DEFAULT_PAWN_POSITIONS,
        spareTile,
        isGameStarted: true,
        activePawn: "red",
        playerActiveTargets: EMPTY_PLAYER_TARGETS,
        turnPhase: "slide",
        hoveredSolution: null,
        stagedArrow: null,
        stagedRotation: 0,
        hoveredHistoryIndex: null,
        history: null,
        getSolverFormattedBoard: toSolverBoard,
        getSolverFormattedSpare: toSolverSpare,
      })
    );

    expect(result.current.previewState).toBeNull();
    expect(result.current.stagedPreviewState).toBeNull();
    expect(result.current.effectivePreview).toBeNull();
  });

  it("generates stagedPreviewState when an arrow is staged", () => {
    const grid = createMockGrid();
    const spareTile: TileData = { id: "spare", shape: "straight", rotation: 0, isFixed: false };
    const { result } = renderHook(() =>
      usePreviewState({
        grid,
        pawnPositions: DEFAULT_PAWN_POSITIONS,
        spareTile,
        isGameStarted: true,
        activePawn: "red",
        playerActiveTargets: EMPTY_PLAYER_TARGETS,
        turnPhase: "slide",
        hoveredSolution: null,
        stagedArrow: "col-1-top",
        stagedRotation: 90,
        hoveredHistoryIndex: null,
        history: null,
        getSolverFormattedBoard: toSolverBoard,
        getSolverFormattedSpare: toSolverSpare,
      })
    );

    expect(result.current.stagedPreviewState).not.toBeNull();
    expect(result.current.effectivePreview).toBe(result.current.stagedPreviewState);
  });

  it("finds active target coords on grid", () => {
    const grid = createMockGrid();
    const spareTile: TileData = { id: "spare", shape: "straight", rotation: 0, isFixed: false };
    const { result } = renderHook(() =>
      usePreviewState({
        grid,
        pawnPositions: DEFAULT_PAWN_POSITIONS,
        spareTile,
        isGameStarted: true,
        activePawn: "red",
        playerActiveTargets: { ...EMPTY_PLAYER_TARGETS, red: "gem" },
        turnPhase: "move",
        hoveredSolution: null,
        stagedArrow: null,
        stagedRotation: 0,
        hoveredHistoryIndex: null,
        history: null,
        getSolverFormattedBoard: toSolverBoard,
        getSolverFormattedSpare: toSolverSpare,
      })
    );

    expect(result.current.activeTargetCoords).toEqual({ r: 1, c: 1 });
  });
});
