import { useMemo } from "react";
import { SHIFT_ARROWS, ROTATIONS } from "../constants";
import type {
  TileData,
  Rotation,
  PawnPositions,
  SolverSolutionStep,
  HistoryRecord,
} from "../types";
import type { SolverCell } from "../lib/solverAdapter";
import { fromSolverGrid } from "../lib/solverAdapter";
import { executeSlideInGrid, getReachableCells } from "../solver";

export interface PreviewStateResult {
  grid: (TileData | null)[][];
  pawnPositions: PawnPositions;
  spareTile: TileData;
  pawnPath?: { r: number; c: number }[];
  movedPawn?: string;
}

export function computePreviewPawnPositions(
  arrow: { type: "row" | "col" | string; index: number; dir: string },
  pawnPositions: PawnPositions
): PawnPositions {
  const previewPawnPositions = { ...pawnPositions };
  Object.entries(pawnPositions).forEach(([color, pos]) => {
    let nr = pos.r,
      nc = pos.c;
    if (arrow.type === "row" && arrow.index === pos.r) {
      nc =
        arrow.dir === "left"
          ? pos.c === 6
            ? 0
            : pos.c + 1
          : pos.c === 0
          ? 6
          : pos.c - 1;
    } else if (arrow.type === "col" && arrow.index === pos.c) {
      nr =
        arrow.dir === "top"
          ? pos.r === 6
            ? 0
            : pos.r + 1
          : pos.r === 0
          ? 6
          : pos.r - 1;
    }
    previewPawnPositions[color] = { r: nr, c: nc };
  });
  return previewPawnPositions;
}

export interface UsePreviewStateParams {
  grid: (TileData | null)[][];
  pawnPositions: PawnPositions;
  spareTile: TileData;
  isGameStarted: boolean;
  activePawn: string;
  playerActiveTargets: Record<string, string | null>;
  turnPhase: "slide" | "move";
  hoveredSolution: SolverSolutionStep[] | null;
  stagedArrow: string | null;
  stagedRotation: Rotation;
  hoveredHistoryIndex: number | null;
  history: HistoryRecord[] | null;
  getSolverFormattedBoard: (
    currentGrid: (TileData | null)[][],
    currentPawns: PawnPositions
  ) => SolverCell[][];
  getSolverFormattedSpare: (spare: TileData) => {
    shape: string;
    dir: number;
    treasure: string | null;
  };
}

export function usePreviewState({
  grid,
  pawnPositions,
  spareTile,
  isGameStarted,
  activePawn,
  playerActiveTargets,
  turnPhase,
  hoveredSolution,
  stagedArrow,
  stagedRotation,
  hoveredHistoryIndex,
  history,
  getSolverFormattedBoard,
  getSolverFormattedSpare,
}: UsePreviewStateParams) {
  // Preview state for hovered solver suggestion
  const previewState = useMemo<PreviewStateResult | null>(() => {
    if (!hoveredSolution || hoveredSolution.length === 0) return null;
    const turn1 = hoveredSolution[0];
    const arrow = SHIFT_ARROWS.find((a) => a.id === turn1.arrowId);
    if (!arrow) return null;
    try {
      const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
      const rotDegrees = (ROTATIONS as unknown as Rotation[])[turn1.rotation];
      const solverSpare = getSolverFormattedSpare({
        ...spareTile,
        rotation: rotDegrees,
      });
      executeSlideInGrid(solverBoard, solverSpare, arrow.type, arrow.index, arrow.dir);
      const previewGrid = fromSolverGrid(
        grid,
        solverBoard,
        () => "preview_temp_inserted"
      );
      const previewPawns = computePreviewPawnPositions(arrow, pawnPositions);
      return {
        grid: previewGrid,
        pawnPositions: previewPawns,
        spareTile: { ...spareTile, rotation: rotDegrees },
      };
    } catch {
      return null;
    }
  }, [
    hoveredSolution,
    grid,
    pawnPositions,
    spareTile,
    getSolverFormattedBoard,
    getSolverFormattedSpare,
  ]);

  // Preview state for staged slide arrow
  const stagedPreviewState = useMemo<PreviewStateResult | null>(() => {
    if (hoveredSolution || !stagedArrow || turnPhase !== "slide") return null;
    const arrow = SHIFT_ARROWS.find((a) => a.id === stagedArrow);
    if (!arrow) return null;
    try {
      const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
      const solverSpare = getSolverFormattedSpare({
        ...spareTile,
        rotation: stagedRotation,
      });
      executeSlideInGrid(solverBoard, solverSpare, arrow.type, arrow.index, arrow.dir);
      const previewGrid = fromSolverGrid(
        grid,
        solverBoard,
        () => "staged_preview"
      );
      const previewPawns = computePreviewPawnPositions(arrow, pawnPositions);
      return {
        grid: previewGrid,
        pawnPositions: previewPawns,
        spareTile: { ...spareTile, rotation: stagedRotation },
      };
    } catch {
      return null;
    }
  }, [
    hoveredSolution,
    stagedArrow,
    stagedRotation,
    turnPhase,
    grid,
    pawnPositions,
    spareTile,
    getSolverFormattedBoard,
    getSolverFormattedSpare,
  ]);

  // Effective preview combines hovered history, hovered solution, or staged arrow
  const effectivePreview = useMemo<PreviewStateResult | null>(() => {
    if (hoveredHistoryIndex !== null && history && history[hoveredHistoryIndex]) {
      const hist = history[hoveredHistoryIndex];
      return {
        grid: hist.board,
        pawnPositions: hist.pawnPositions || pawnPositions,
        spareTile: hist.spareTile || spareTile,
        pawnPath: hist.pawnPath,
        movedPawn: hist.movedPawn,
      };
    }
    return previewState || stagedPreviewState;
  }, [hoveredHistoryIndex, history, pawnPositions, spareTile, previewState, stagedPreviewState]);

  // Active target coordinates derived from effective grid
  const activeTargetCoords = useMemo<{ r: number; c: number } | null>(() => {
    const targetId = playerActiveTargets[activePawn];
    if (!targetId) return null;
    const gridToSearch = previewState?.grid ?? grid;
    if (!gridToSearch.length) return null;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = gridToSearch[r]?.[c];
        if (cell?.treasure?.id === targetId) return { r, c };
      }
    }
    return null;
  }, [playerActiveTargets, activePawn, grid, previewState]);

  // Reachable cells calculation based on turnPhase & staged preview
  const reachableCells = useMemo<{ r: number; c: number }[]>(() => {
    if (!isGameStarted) return [];
    if (turnPhase === "move") {
      const pawnPos = pawnPositions[activePawn];
      if (!pawnPos) return [];
      try {
        const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
        const { cells } = getReachableCells(solverBoard, pawnPos.r, pawnPos.c);
        return cells as { r: number; c: number }[];
      } catch {
        return [];
      }
    }
    if (turnPhase === "slide" && stagedPreviewState) {
      const pawnPos = stagedPreviewState.pawnPositions[activePawn];
      if (!pawnPos) return [];
      try {
        const solverBoard = getSolverFormattedBoard(
          stagedPreviewState.grid,
          stagedPreviewState.pawnPositions
        );
        const { cells } = getReachableCells(solverBoard, pawnPos.r, pawnPos.c);
        return cells as { r: number; c: number }[];
      } catch {
        return [];
      }
    }
    return [];
  }, [
    isGameStarted,
    turnPhase,
    grid,
    pawnPositions,
    activePawn,
    getSolverFormattedBoard,
    stagedPreviewState,
  ]);

  return {
    previewState,
    stagedPreviewState,
    effectivePreview,
    activeTargetCoords,
    reachableCells,
  };
}
