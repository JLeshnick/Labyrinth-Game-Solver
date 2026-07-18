import type { TileData, PawnPositions } from "../types";
import { PAWNS } from "../constants";

const CELL = 10; // px per cell
const TOTAL = CELL * 7; // 70px

// Pawn color hex map for SVG fills
const PAWN_COLORS: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#22c55e",
  yellow: "#facc15",
};

// Tile corridor geometry: which edges are open for each shape+rotation combo
// Returns { n, s, e, w } booleans
function getOpenEdges(shape: string, rotation: number): { n: boolean; s: boolean; e: boolean; w: boolean } {
  const r = ((rotation % 360) + 360) % 360;
  if (shape === "straight") {
    const horiz = r === 90 || r === 270;
    return { n: !horiz, s: !horiz, e: horiz, w: horiz };
  }
  if (shape === "corner") {
    if (r === 0)   return { n: true,  s: false, e: true,  w: false };
    if (r === 90)  return { n: false, s: true,  e: true,  w: false };
    if (r === 180) return { n: false, s: true,  e: false, w: true  };
    return             { n: true,  s: false, e: false, w: true  };
  }
  // t-junction
  if (r === 0)   return { n: true,  s: false, e: true,  w: true  };
  if (r === 90)  return { n: true,  s: true,  e: true,  w: false };
  if (r === 180) return { n: false, s: true,  e: true,  w: true  };
  return             { n: true,  s: true,  e: false, w: true  };
}

interface CellRects {
  rects: { x: number; y: number; w: number; h: number }[];
}

function buildCorridorRects(ox: number, oy: number, edges: ReturnType<typeof getOpenEdges>): CellRects {
  const third = CELL / 3;
  const rects: { x: number; y: number; w: number; h: number }[] = [];

  // Center cross
  rects.push({ x: ox + third, y: oy + third, w: third, h: third });
  if (edges.n) rects.push({ x: ox + third, y: oy, w: third, h: third });
  if (edges.s) rects.push({ x: ox + third, y: oy + third * 2, w: third, h: third });
  if (edges.e) rects.push({ x: ox + third * 2, y: oy + third, w: third, h: third });
  if (edges.w) rects.push({ x: ox, y: oy + third, w: third, h: third });

  return { rects };
}

interface Props {
  board: (TileData | null)[][];
  pawnPositions: PawnPositions;
  activePlayers?: string[];
  movedPawn?: string;
  pawnPath?: { r: number; c: number }[];
}

export function MiniBoardSnapshot({ board, pawnPositions, activePlayers, movedPawn, pawnPath }: Props) {
  const allRects: { x: number; y: number; w: number; h: number; fill: string }[] = [];

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      const ox = col * CELL;
      const oy = row * CELL;
      const tile = board[row]?.[col];
      // Wall background
      allRects.push({ x: ox, y: oy, w: CELL, h: CELL, fill: "#78350f" });
      if (tile) {
        const edges = getOpenEdges(tile.shape, tile.rotation);
        const { rects } = buildCorridorRects(ox, oy, edges);
        for (const r of rects) allRects.push({ ...r, fill: "#f5f0e8" });
      }
    }
  }

  // Pawn path polyline points
  const pathPoints = pawnPath && pawnPath.length > 1
    ? pawnPath.map((p) => `${p.c * CELL + CELL / 2},${p.r * CELL + CELL / 2}`).join(" ")
    : null;
  const pathColor = movedPawn ? (PAWN_COLORS[movedPawn] ?? "#f59e0b") : "#f59e0b";

  return (
    <svg
      width={TOTAL}
      height={TOTAL}
      viewBox={`0 0 ${TOTAL} ${TOTAL}`}
      className="rounded overflow-hidden shrink-0"
      aria-hidden="true"
    >
      {allRects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} />
      ))}

      {/* Pawn movement path */}
      {pathPoints && (
        <polyline
          points={pathPoints}
          fill="none"
          stroke={pathColor}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />
      )}

      {/* Pawn dots */}
      {PAWNS
        .filter((p) => !activePlayers || activePlayers.includes(p.id))
        .map((p) => {
          const pos = pawnPositions[p.id];
          if (!pos) return null;
          const cx = pos.c * CELL + CELL / 2;
          const cy = pos.r * CELL + CELL / 2;
          const isActive = p.id === movedPawn;
          return (
            <circle
              key={p.id}
              cx={cx}
              cy={cy}
              r={isActive ? 2.5 : 2}
              fill={PAWN_COLORS[p.id] ?? "#888"}
              stroke="white"
              strokeWidth="0.5"
            />
          );
        })}
    </svg>
  );
}
