import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { SHIFT_ARROWS, PAWNS } from "../constants";
import { isOppositeArrow, getReachableCells } from "../solver";
import { toSolverBoard } from "../lib/solverAdapter";
import { Tile } from "./Tile";
import { cn } from "../lib/utils";
import { ChevronRight } from "lucide-react";

interface BoardSpaceProps {
  x: number;
  y: number;
  tile: TileData | null;
  pawns: string[];
  isGameStarted: boolean;
  isReachable: boolean;
  isOnHoveredPath: boolean;
  isPathStart: boolean;
  isPathEnd: boolean;
  onCellClick: (r: number, c: number) => void;
  onTileClick: (id: string) => void;
  boardRotation: number;
  isCustomTarget?: boolean;
}

const BoardSpace: React.FC<BoardSpaceProps> = ({
  x,
  y,
  tile,
  pawns,
  isGameStarted,
  isReachable,
  isOnHoveredPath,
  isPathStart,
  isPathEnd,
  onCellClick,
  onTileClick,
  boardRotation,
  isCustomTarget,
}) => {
  const isFixedSpace = x % 2 === 0 && y % 2 === 0;
  const id = `board_${x}_${y}`;
  const { setNodeRef, isOver } = useDroppable({
    id,
    disabled: isGameStarted || isFixedSpace || tile !== null,
    data: { x, y, type: "board" },
  });

  return (
    <div
      ref={setNodeRef}
      role="button"
      tabIndex={isGameStarted ? 0 : -1}
      onClick={() => onCellClick(y, x)}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onCellClick(y, x); } }}
      aria-label={`Board cell row ${y} column ${x}${tile ? ` — ${tile.isFixed ? "fixed" : ""} tile` : " — empty"}`}
      style={{
        gridRow: isGameStarted ? y + 2 : y + 1,
        gridColumn: isGameStarted ? x + 2 : x + 1,
      }}
      className={cn(
        "relative w-full h-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer",
        isFixedSpace
          ? "bg-stone-900/40 border border-stone-800/20"
          : "border border-dashed border-stone-800/40 bg-stone-950/30 hover:bg-stone-900/10 shadow-inner",
        isOver && !tile ? "ring-2 ring-theme-primary ring-inset bg-theme-primary-10" : "",
        isReachable ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-stone-950" : "",
        isOnHoveredPath ? "ring-2 ring-theme-primary ring-offset-2 ring-offset-stone-950 shadow-[0_0_12px_rgba(var(--theme-color-rgb),0.3)]" : "",
        isCustomTarget ? "ring-2 ring-theme-primary ring-offset-2 ring-offset-stone-950 shadow-[0_0_15px_rgba(var(--theme-color-rgb),0.55)] z-10" : ""
      )}
    >
      {isCustomTarget && (
        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-theme-primary animate-ping pointer-events-none z-30" />
      )}
      {tile ? (
        <Tile
          tile={tile}
          onClick={() => onTileClick(tile.id)}
          disabled={isGameStarted}
          boardRotation={boardRotation}
          className={cn(
            "absolute inset-0 w-full h-full",
            isOnHoveredPath && "border-theme-primary",
            isPathStart && "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]",
            isPathEnd && "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          )}
        />
      ) : (
        <span className="sr-only">{y},{x}</span>
      )}

      {/* Render Pawns inside BoardSpace */}
      <div 
        className="absolute inset-0 pointer-events-none flex flex-wrap items-center justify-center gap-1 p-1 z-20 transition-transform duration-300"
        style={{ transform: `rotate(${-boardRotation}deg)` }}
      >
        {pawns.map((color) => {
          const pawn = PAWNS.find((p) => p.id === color);
          return (
            <div
              key={color}
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 rounded-full ring-2 ring-white shadow-lg flex items-center justify-center text-[8px] sm:text-[9px] font-bold capitalize",
                pawn?.tokenClass ?? "bg-stone-500 ring-stone-300 text-white"
              )}
            >
              {color[0]}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface BoardProps {
  grid: (TileData | null)[][];
  pawnPositions: Record<string, { r: number; c: number }>;
  onCellClick: (r: number, c: number) => void;
  onTileClick: (id: string) => void;
  isGameStarted: boolean;
  activePawn: string;
  lastShiftArrowId: string | null;
  onArrowClick: (arrowId: string) => void;
  hoveredPath: { r: number; c: number }[] | null;
  hoveredSolutionArrow: string | null;
  boardRotation?: number;
  customTargetCoords?: { r: number; c: number } | null;
}

export const Board: React.FC<BoardProps> = ({
  grid,
  pawnPositions,
  onCellClick,
  onTileClick,
  isGameStarted,
  activePawn,
  lastShiftArrowId,
  onArrowClick,
  hoveredPath,
  hoveredSolutionArrow,
  boardRotation = 0,
  customTargetCoords,
}) => {
  // Compute reachable cells in Play mode
  const reachableCells = React.useMemo(() => {
    if (!isGameStarted) return [];
    const activePos = pawnPositions[activePawn];
    if (!activePos) return [];
 
    const solverBoard = toSolverBoard(grid, pawnPositions);
    const { cells } = getReachableCells(solverBoard, activePos.r, activePos.c);
    return cells;
  }, [grid, pawnPositions, activePawn, isGameStarted]);

  return (
    <div className="p-3 sm:p-5 bg-stone-900 border-4 border-stone-800 rounded-3xl shadow-2xl relative w-full h-full flex items-center justify-center">
      {/* CSS Grid Layout */}
      <div 
        className={cn(
          "grid gap-1.5 w-full h-full justify-items-stretch items-stretch transition-transform duration-300 relative",
          isGameStarted ? "grid-cols-9 grid-rows-9" : "grid-cols-7 grid-rows-7"
        )}
        style={{ transform: `rotate(${boardRotation}deg)` }}
      >
        {/* SVG Solved Path Overlay */}
        {isGameStarted && hoveredPath && hoveredPath.length > 0 && (
          <svg
            viewBox="0 0 9 9"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
          >
            {hoveredPath.map((cell, idx) => {
              if (idx === 0) return null;
              const parent = hoveredPath[idx - 1];
              return (
                <line
                  key={idx}
                  x1={parent.c + 1.5}
                  y1={parent.r + 1.5}
                  x2={cell.c + 1.5}
                  y2={cell.r + 1.5}
                  stroke="var(--theme-color)"
                  strokeWidth="0.08"
                  strokeDasharray="0.12,0.12"
                  className="animate-dash"
                  strokeLinecap="round"
                  opacity="0.9"
                />
              );
            })}
          </svg>
        )}
        {/* Shifting tracks graphics */}
        {isGameStarted && (
          <div className="absolute inset-y-12 left-0 right-0 border-t border-stone-800 pointer-events-none opacity-20" />
        )}

        {/* Render Shifting Arrows */}
        {isGameStarted &&
          SHIFT_ARROWS.map((arrow) => {
            const isForbidden = !!(lastShiftArrowId && isOppositeArrow(arrow.id, lastShiftArrowId));
            const isHighlighted = hoveredSolutionArrow === arrow.id;

            return (
              <button
                key={arrow.id}
                onClick={() => !isForbidden && onArrowClick(arrow.id)}
                disabled={isForbidden}
                style={{
                  gridRow: arrow.gridRow,
                  gridColumn: arrow.gridColumn,
                }}
                className={cn(
                  "w-full h-full max-w-[85%] max-h-[85%] mx-auto p-1 rounded-lg border border-stone-800 bg-stone-950 text-theme-primary hover:text-theme-primary-200 hover:bg-stone-900 transition-all focus:outline-none flex items-center justify-center",
                  isForbidden
                    ? "opacity-20 cursor-not-allowed border-red-950/40 text-red-700"
                    : "cursor-pointer hover:scale-105 active:scale-95",
                  isHighlighted
                    ? "animate-pulse ring-2 ring-theme-primary bg-theme-primary-20 scale-110"
                    : ""
                )}
                title={
                  isForbidden
                    ? "Forbidden: Cannot immediately reverse the previous shift"
                    : `Insert spare tile into ${arrow.label}`
                }
                aria-label={
                  isForbidden
                    ? `Forbidden: Cannot reverse previous shift into ${arrow.label}`
                    : `Insert spare tile into ${arrow.label}`
                }
              >
                <ChevronRight
                  className="w-4 h-4 sm:w-5 sm:h-5"
                  style={{
                    transform: `rotate(${
                      arrow.dir === "left"
                        ? 0
                        : arrow.dir === "right"
                        ? 180
                        : arrow.dir === "top"
                        ? 90
                        : -90
                    }deg)`,
                  }}
                />
              </button>
            );
          })}

        {/* Render 7x7 Grid */}
        {grid.map((row, r) =>
          row.map((tile, c) => {
            const pawnsAtCell = Object.entries(pawnPositions)
              .filter(([_, pos]) => pos.r === r && pos.c === c)
              .map(([color]) => color);

            const isReachable = reachableCells.some((cell: { r: number; c: number }) => cell.r === r && cell.c === c);

            // Path overlays state
            const isOnHoveredPath = hoveredPath ? hoveredPath.some((cell: { r: number; c: number }) => cell.r === r && cell.c === c) : false;
            const isPathStart = hoveredPath && hoveredPath.length > 0 ? (hoveredPath[0].r === r && hoveredPath[0].c === c) : false;
            const isPathEnd = hoveredPath && hoveredPath.length > 0 ? (hoveredPath[hoveredPath.length - 1].r === r && hoveredPath[hoveredPath.length - 1].c === c) : false;

            const isCustomTarget = !!(customTargetCoords && customTargetCoords.r === r && customTargetCoords.c === c);

            return (
              <BoardSpace
                key={`${r}-${c}`}
                x={c}
                y={r}
                tile={tile}
                pawns={pawnsAtCell}
                isGameStarted={isGameStarted}
                isReachable={isReachable}
                isOnHoveredPath={isOnHoveredPath}
                isPathStart={isPathStart}
                isPathEnd={isPathEnd}
                onCellClick={onCellClick}
                onTileClick={onTileClick}
                boardRotation={boardRotation}
                isCustomTarget={isCustomTarget}
              />
            );
          })
        )}
      </div>
    </div>
  );
};
