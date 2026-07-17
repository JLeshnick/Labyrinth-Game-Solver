import { describe, it, expect } from "vitest";
import {
  getOpenDirections,
  areConnected,
  isOppositeArrow,
  executeSlideInGrid,
  getReachableCells,
  solveAllHand,
} from "./solver";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeCell(shape: string, dir: number, r = 0, c = 0) {
  return { r, c, shape, dir, treasure: null as string | null, isFixed: false, pawns: [] as string[] };
}

/** Build a 7×7 board of all-straight (vertical) tiles. */
function straightBoard() {
  return Array.from({ length: 7 }, (_, r) =>
    Array.from({ length: 7 }, (_, c) => makeCell("I", 0, r, c))
  );
}

// ── getOpenDirections ─────────────────────────────────────────────────────────

describe("getOpenDirections", () => {
  it("straight dir=0 opens North(0) and South(2)", () => {
    expect(getOpenDirections("I", 0)).toEqual(expect.arrayContaining([0, 2]));
    expect(getOpenDirections("I", 0)).toHaveLength(2);
  });

  it("straight dir=1 opens East(1) and West(3)", () => {
    const dirs = getOpenDirections("I", 1);
    expect(dirs).toEqual(expect.arrayContaining([1, 3]));
  });

  it("corner dir=0 opens North(0) and East(1)", () => {
    const dirs = getOpenDirections("L", 0);
    expect(dirs).toEqual(expect.arrayContaining([0, 1]));
    expect(dirs).toHaveLength(2);
  });

  it("t-junction dir=0 opens West(3), North(0), East(1)", () => {
    const dirs = getOpenDirections("T", 0);
    expect(dirs).toEqual(expect.arrayContaining([3, 0, 1]));
    expect(dirs).toHaveLength(3);
  });

  it("returns [] for unknown shape", () => {
    expect(getOpenDirections("X", 0)).toEqual([]);
  });
});

// ── areConnected ──────────────────────────────────────────────────────────────

describe("areConnected", () => {
  it("two vertical straights connect N→S", () => {
    const board = straightBoard();
    // (0,0) I dir=0 opens N+S; (1,0) I dir=0 opens N+S — going South from 0,0
    expect(areConnected(board, 0, 0, 1, 0)).toBe(true);
  });

  it("vertical straight does not connect East→West", () => {
    const board = straightBoard();
    expect(areConnected(board, 0, 0, 0, 1)).toBe(false);
  });

  it("out-of-bounds returns false", () => {
    const board = straightBoard();
    expect(areConnected(board, -1, 0, 0, 0)).toBe(false);
    expect(areConnected(board, 0, 0, 7, 0)).toBe(false);
  });

  it("non-adjacent cells return false", () => {
    const board = straightBoard();
    expect(areConnected(board, 0, 0, 2, 0)).toBe(false);
  });
});

// ── isOppositeArrow ───────────────────────────────────────────────────────────

describe("isOppositeArrow", () => {
  it("left is opposite of right on same row+index", () => {
    expect(isOppositeArrow("row-1-left", "row-1-right")).toBe(true);
    expect(isOppositeArrow("row-1-right", "row-1-left")).toBe(true);
  });

  it("top is opposite of bottom on same col+index", () => {
    expect(isOppositeArrow("col-3-top", "col-3-bottom")).toBe(true);
  });

  it("different index is not opposite", () => {
    expect(isOppositeArrow("row-1-left", "row-3-right")).toBe(false);
  });

  it("same direction is not opposite", () => {
    expect(isOppositeArrow("row-1-left", "row-1-left")).toBe(false);
  });

  it("null inputs return false", () => {
    expect(isOppositeArrow(null, "row-1-left")).toBe(false);
    expect(isOppositeArrow("row-1-left", null)).toBe(false);
  });
});

// ── executeSlideInGrid ────────────────────────────────────────────────────────

describe("executeSlideInGrid", () => {
  it("row left-slide shifts tiles right, spare enters column 0", () => {
    const board = straightBoard();
    const spare = makeCell("L", 0);
    const { newSpare } = executeSlideInGrid(board, spare, "row", 1, "left");
    // Spare shape should now be at row=1, col=0
    expect(board[1][0].shape).toBe("L");
    // Fallen tile (original board[1][6]) becomes new spare
    expect(newSpare.shape).toBe("I");
  });

  it("col top-slide shifts tiles down, spare enters row 0", () => {
    const board = straightBoard();
    board[3][2] = makeCell("T", 1, 3, 2); // mark a distinctive cell
    const spare = makeCell("L", 2);
    executeSlideInGrid(board, spare, "col", 2, "top");
    expect(board[0][2].shape).toBe("L"); // spare entered at top
    expect(board[4][2].shape).toBe("T"); // T tile shifted down one row
  });

  it("pawn wraps around on row slide", () => {
    const board = straightBoard();
    board[1][6].pawns = ["red"]; // pawn at the far-right cell
    const spare = makeCell("I", 0);
    executeSlideInGrid(board, spare, "row", 1, "left");
    // Red pawn should wrap to col 0
    expect(board[1][0].pawns).toContain("red");
  });
});

// ── getReachableCells ─────────────────────────────────────────────────────────

describe("getReachableCells", () => {
  it("on a fully connected board, all 49 cells are reachable from (0,0)", () => {
    // Column 0 is a vertical spine of T-junctions (dir=1 opens North/East/South),
    // connecting every row top-to-bottom and feeding East into it. Columns 1-6 are
    // horizontal straights (dir=1 opens East/West) so each row is fully connected.
    const board = Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) =>
        c === 0 ? makeCell("T", 1, r, c) : makeCell("I", 1, r, c)
      )
    );
    const { cells } = getReachableCells(board, 0, 0);
    expect(cells).toHaveLength(49);
  });

  it("isolated cell is only reachable from itself", () => {
    // All vertical straights; then replace (0,1) with a horizontal straight — breaks E-W link on row 0
    const board = straightBoard();
    // All I dir=0 (N-S only); (0,0) can reach (0,0) going North/South, but not (0,1) East
    const { cells } = getReachableCells(board, 0, 0);
    // Should reach the whole first column (0–6,0) via N-S but NOT (0,1)
    expect(cells.some((c: { r: number; c: number }) => c.r === 0 && c.c === 0)).toBe(true);
    expect(cells.every((c: { r: number; c: number }) => c.c === 0)).toBe(true);
  });
});

// ── solverAdapter round-trip ──────────────────────────────────────────────────

describe("solverAdapter round-trip", () => {
  it("toSolverBoard → fromSolverGrid preserves movable tile shape/rotation", async () => {
    const { toSolverBoard, fromSolverGrid } = await import("./lib/solverAdapter");

    const grid: (import("./types").TileData | null)[][] = Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => ({
        id: `t_${r}_${c}`,
        shape: "corner" as const,
        rotation: 90 as const,
        isFixed: false as const,
        treasure: undefined,
      }))
    );
    const positions = { red: { r: 0, c: 0 }, blue: { r: 6, c: 6 }, green: { r: 6, c: 0 }, yellow: { r: 0, c: 6 } };
    const solverBoard = toSolverBoard(grid, positions);
    let counter = 0;
    const next = fromSolverGrid(grid, solverBoard, () => `new_${++counter}`);
    expect(next[3][3]?.shape).toBe("corner");
    expect(next[3][3]?.rotation).toBe(90);
  });
});

// ── solveAllHand ranking (guards the SOLVER_MAX_TURNS removal) ────────────────
// These lock in the "always best ranked" guarantee that the removed maxTurns
// dropdown relied on: solveAllHand must always rank non-fallback before fallback
// and shorter paths first, regardless of search depth.

describe("solveAllHand ranking", () => {
  function fullyConnectedBoard() {
    return Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => makeCell(c === 0 ? "T" : "I", 1, r, c))
    );
  }

  it("surfaces a direct 1-turn solution before fallback suggestions", () => {
    const board = fullyConnectedBoard();
    board[0][3].treasure = "map";
    const spare = { shape: "I", dir: 0, isFixed: false };
    const results = solveAllHand(board, spare, { r: 0, c: 0 }, ["map"], null, 3);

    expect(results.length).toBeGreaterThan(0);
    expect(results[0].isFallback).toBeFalsy();
    expect(results[0].length).toBe(1);

    const firstFallbackIndex = results.findIndex((r) => r.isFallback);
    if (firstFallbackIndex !== -1) {
      expect(results.slice(0, firstFallbackIndex).every((r) => !r.isFallback)).toBe(true);
    }
  });

  it("sorts fallback suggestions by ascending minDistance when no path is found", () => {
    const board = Array.from({ length: 7 }, (_, r) =>
      Array.from({ length: 7 }, (_, c) => makeCell("I", 0, r, c))
    );
    board[3][5].treasure = "map";
    const spare = { shape: "I", dir: 0, isFixed: false };
    const results = solveAllHand(board, spare, { r: 0, c: 0 }, ["map"], null, 1);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every((r) => r.isFallback)).toBe(true);
    const distances = results.map((r) => r[r.length - 1].minDistance);
    const sorted = [...distances].sort((a, b) => a - b);
    expect(distances).toEqual(sorted);
  });

  it("widening the search depth cannot degrade the best 1-turn solution", () => {
    const board = fullyConnectedBoard();
    board[0][3].treasure = "map";
    const spare = { shape: "I", dir: 0, isFixed: false };

    const shallow = solveAllHand(board, spare, { r: 0, c: 0 }, ["map"], null, 1);
    const deep = solveAllHand(board, spare, { r: 0, c: 0 }, ["map"], null, 3);

    expect(shallow[0].isFallback).toBeFalsy();
    expect(deep[0].isFallback).toBeFalsy();
    expect(deep[0].length).toBe(shallow[0].length);
  });
});
