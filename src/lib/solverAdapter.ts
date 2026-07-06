import { TREASURES } from "../constants";
import type { TileData, Shape, Rotation } from "../types";

// ── Mapping constants (React ↔ solver) ──────────────────────────────────────

export const SHAPE_TO_SOLVER: Record<Shape, string> = {
  straight: "I",
  corner: "L",
  "t-junction": "T",
};

export const DIR_TO_SOLVER: Record<Rotation, number> = {
  0: 0,
  90: 1,
  180: 2,
  270: 3,
};

export const SHAPE_FROM_SOLVER: Record<string, Shape> = {
  I: "straight",
  L: "corner",
  T: "t-junction",
};

export const DIR_FROM_SOLVER: Record<number, Rotation> = {
  0: 0,
  1: 90,
  2: 180,
  3: 270,
};

// ── Solver cell type ─────────────────────────────────────────────────────────

export interface SolverCell {
  r: number;
  c: number;
  shape: string;
  dir: number;
  treasure: string | null;
  isFixed: boolean;
  pawns: string[];
}

// ── Conversion helpers ───────────────────────────────────────────────────────

/** Convert the React 7×7 grid + pawn positions into solver board format. */
export function toSolverBoard(
  grid: (TileData | null)[][],
  pawnPositions: Record<string, { r: number; c: number }>
): SolverCell[][] {
  return grid.map((row, r) =>
    row.map((tile, c) => {
      const pawns: string[] = Object.entries(pawnPositions)
        .filter(([, pos]) => pos.r === r && pos.c === c)
        .map(([color]) => color);

      if (!tile) {
        return { r, c, shape: "I", dir: 0, treasure: null, isFixed: false, pawns };
      }
      return {
        r,
        c,
        shape: SHAPE_TO_SOLVER[tile.shape],
        dir: DIR_TO_SOLVER[tile.rotation],
        treasure: tile.treasure?.id ?? null,
        isFixed: tile.isFixed,
        pawns,
      };
    })
  );
}

/** Convert a single spare TileData into solver spare format. */
export function toSolverSpare(tile: TileData): Omit<SolverCell, "r" | "c"> {
  return {
    shape: SHAPE_TO_SOLVER[tile.shape],
    dir: DIR_TO_SOLVER[tile.rotation],
    treasure: tile.treasure?.id ?? null,
    isFixed: false,
    pawns: [],
  };
}

/**
 * Rebuild the React grid from a post-slide solver board.
 * Fixed tiles are left untouched (taken from prevGrid).
 * Movable tiles are mapped back using idFallback for cells that had no tile.
 */
export function fromSolverGrid(
  prevGrid: (TileData | null)[][],
  solverBoard: SolverCell[][],
  nextTileId: () => string
): (TileData | null)[][] {
  const next = prevGrid.map((row) => [...row]);
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (prevGrid[r][c]?.isFixed) continue;
      const cell = solverBoard[r][c];
      const original = prevGrid[cell.r]?.[cell.c] ?? {
        id: nextTileId(),
        isFixed: false,
        shape: "straight" as Shape,
        rotation: 0 as Rotation,
      };
      next[r][c] = {
        ...original,
        shape: SHAPE_FROM_SOLVER[cell.shape],
        rotation: DIR_FROM_SOLVER[cell.dir],
        treasure: TREASURES.find((t) => t.id === cell.treasure),
      };
    }
  }
  return next;
}

/** Convert a solver spare cell back to a TileData spare. */
export function fromSolverSpare(
  solverSpare: Pick<SolverCell, "shape" | "dir" | "treasure">,
  idBase: string
): TileData {
  return {
    id: `spare_${idBase}`,
    shape: SHAPE_FROM_SOLVER[solverSpare.shape],
    rotation: DIR_FROM_SOLVER[solverSpare.dir],
    treasure: TREASURES.find((t) => t.id === solverSpare.treasure),
    isFixed: false,
  };
}
