import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { SHIFT_ARROWS } from "../constants";
import { isOppositeArrow, getReachableCells } from "../solver";
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
      onClick={() => onCellClick(y, x)}
      style={{
        gridRow: y + 2,
        gridColumn: x + 2,
      }}
      className={cn(
        "relative w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 lg:w-18 lg:h-18 xl:w-20 xl:h-20 rounded-lg flex items-center justify-center transition-all cursor-pointer",
        isFixedSpace
          ? "bg-stone-900/40 border border-stone-800/20"
          : "border border-dashed border-stone-800/40 bg-stone-950/30 hover:bg-stone-900/10 shadow-inner",
        isOver && !tile ? "ring-2 ring-amber-500 ring-inset bg-amber-500/10" : "",
        isReachable ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-stone-950" : "",
        isOnHoveredPath ? "ring-2 ring-amber-400 ring-offset-2 ring-offset-stone-950 shadow-[0_0_12px_rgba(245,158,11,0.3)]" : ""
      )}
    >
      {tile ? (
        <Tile
          tile={tile}
          onClick={() => onTileClick(tile.id)}
          disabled={isGameStarted}
          boardRotation={boardRotation}
          className={cn(
            "absolute inset-0 w-full h-full",
            isOnHoveredPath && "border-amber-400",
            isPathStart && "border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.4)]",
            isPathEnd && "border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
          )}
        />
      ) : (
        <span className="text-[10px] text-stone-800 font-bold select-none">
          {y},{x}
        </span>
      )}

      {/* Render Pawns inside BoardSpace */}
      <div 
        className="absolute inset-0 pointer-events-none flex flex-wrap items-center justify-center gap-1 p-1 z-20 transition-transform duration-300"
        style={{ transform: `rotate(${-boardRotation}deg)` }}
      >
        {pawns.map((color) => {
          const colors: Record<string, string> = {
            red: "bg-red-500 ring-red-300 shadow-red-500/50",
            blue: "bg-blue-500 ring-blue-300 shadow-blue-500/50",
            green: "bg-green-500 ring-green-300 shadow-green-500/50",
            yellow: "bg-yellow-400 ring-yellow-200 text-stone-950 shadow-yellow-500/50",
          };
          return (
            <div
              key={color}
              className={cn(
                "w-4 h-4 sm:w-5 sm:h-5 rounded-full ring-2 ring-white shadow-lg flex items-center justify-center text-[8px] sm:text-[9px] font-bold capitalize text-white",
                colors[color]
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
}) => {
  // Compute reachable cells in Play mode
  const reachableCells = React.useMemo(() => {
    if (!isGameStarted) return [];
    const activePos = pawnPositions[activePawn];
    if (!activePos) return [];

    // Helper to format grid cell shape/dir for solver
    const shapeMap: Record<string, string> = {
      straight: "I",
      corner: "L",
      "t-junction": "T",
    };
    const dirMap: Record<number, number> = {
      0: 0,
      90: 1,
      180: 2,
      270: 3,
    };

    const solverBoard = grid.map((row, r) =>
      row.map((cell, c) => {
        if (!cell) {
          return { r, c, shape: "I", dir: 0, treasure: null, isFixed: false, pawns: [] };
        }
        return {
          r,
          c,
          shape: shapeMap[cell.shape],
          dir: dirMap[cell.rotation],
          treasure: cell.treasure?.id || null,
          isFixed: cell.isFixed,
          pawns: [],
        };
      })
    );

    const { cells } = getReachableCells(solverBoard, activePos.r, activePos.c);
    return cells;
  }, [grid, pawnPositions, activePawn, isGameStarted]);

  return (
    <div className="p-3 sm:p-5 bg-stone-900 border-4 border-stone-800 rounded-3xl shadow-2xl relative">
      {/* 9x9 CSS Grid Layout */}
      <div 
        className="grid grid-cols-9 grid-rows-9 gap-1.5 justify-items-center items-center transition-transform duration-300"
        style={{ transform: `rotate(${boardRotation}deg)` }}
      >
        {/* Shifting tracks graphics */}
        <div className="absolute inset-y-12 left-0 right-0 border-t border-stone-800 pointer-events-none opacity-20" />

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
                  "p-1.5 rounded-lg border border-stone-800 bg-stone-950 text-amber-500/80 hover:text-amber-400 hover:bg-stone-900 transition-all focus:outline-none flex items-center justify-center",
                  isForbidden
                    ? "opacity-20 cursor-not-allowed border-red-950/40 text-red-700"
                    : "cursor-pointer hover:scale-105 active:scale-95",
                  isHighlighted
                    ? "animate-pulse ring-2 ring-amber-400 bg-amber-500/20 scale-110"
                    : ""
                )}
                title={
                  isForbidden
                    ? "Forbidden: Cannot immediately reverse the previous shift"
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
              />
            );
          })
        )}
      </div>
    </div>
  );
};
