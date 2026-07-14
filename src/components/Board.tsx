import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { SHIFT_ARROWS, PAWNS } from "../constants";
import { isOppositeArrow } from "../solver";
import { Tile } from "./Tile";
import { cn } from "../lib/utils";
import { ChevronRight } from "lucide-react";

interface BoardSpaceProps {
  x: number;
  y: number;
  tile: TileData | null;
  pawns: string[];
  isGameStarted: boolean;
  isOnHoveredPath: boolean;
  isPathStart: boolean;
  isPathEnd: boolean;
  onCellClick: (r: number, c: number) => void;
  onTileClick: (id: string) => void;
  boardRotation: number;
  isCustomTarget?: boolean;
  isActiveTarget?: boolean;
  previewSlideClass?: string;
  onTreasureClick?: (treasureId: string, alreadyObtained: boolean) => void;
  isObtainedTreasure?: boolean;
  isCurrentTarget?: boolean;
}

const BoardSpace: React.FC<BoardSpaceProps> = ({
  x,
  y,
  tile,
  pawns,
  isGameStarted,
  isOnHoveredPath,
  isPathStart,
  isPathEnd,
  onCellClick,
  onTileClick,
  boardRotation,
  isCustomTarget,
  isActiveTarget,
  previewSlideClass,
  onTreasureClick,
  isObtainedTreasure,
  isCurrentTarget,
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
      onClick={() => {
        if (isGameStarted && tile?.treasure && onTreasureClick) {
          onTreasureClick(tile.treasure.id, !!isObtainedTreasure);
        } else {
          onCellClick(y, x);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          if (isGameStarted && tile?.treasure && onTreasureClick) {
            onTreasureClick(tile.treasure.id, !!isObtainedTreasure);
          } else {
            onCellClick(y, x);
          }
        }
      }}
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
        isOnHoveredPath ? "ring-2 ring-theme-primary ring-offset-2 ring-offset-stone-950 shadow-[0_0_12px_rgba(var(--theme-color-rgb),0.3)]" : "",
        isCustomTarget ? "ring-2 ring-theme-primary ring-offset-2 ring-offset-stone-950 shadow-[0_0_15px_rgba(var(--theme-color-rgb),0.55)] z-10" : "",
        previewSlideClass,
        isActiveTarget ? "ring-4 ring-amber-300 ring-offset-2 ring-offset-stone-950 shadow-[0_0_20px_rgba(251,191,36,0.6)] animate-pulse-border" : ""
      )}
    >
      {isCustomTarget && (
        <div className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-theme-primary animate-ping pointer-events-none z-30" />
      )}
      {isActiveTarget && (
        <div className="absolute top-1 left-1 w-3 h-3 rounded-full bg-amber-300 animate-ping pointer-events-none z-30 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
      )}
      {tile ? (
        <Tile
          tile={tile}
          onClick={() => onTileClick(tile.id)}
          disabled={isGameStarted}
          boardRotation={boardRotation}
          disableRotationTransition={true}
          isObtainedTreasure={isObtainedTreasure}
          isCurrentTarget={isCurrentTarget}
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
  originalGrid?: (TileData | null)[][];
  pawnPositions: Record<string, { r: number; c: number }>;
  onCellClick: (r: number, c: number) => void;
  onTileClick: (id: string) => void;
  isGameStarted: boolean;
  lastShiftArrowId: string | null;
  onArrowClick: (arrowId: string) => void;
  hoveredPath: { r: number; c: number }[] | null;
  hoveredSolutionArrow: string | null;
  boardRotation?: number;
  customTargetCoords?: { r: number; c: number } | null;
  activeTargetCoords?: { r: number; c: number } | null;
  onTreasureClick?: (treasureId: string, alreadyObtained: boolean) => void;
  allObtainedTreasures?: string[];
  activeTargetTreasureId?: string | null;
}

export const Board: React.FC<BoardProps> = ({
  grid,
  originalGrid,
  pawnPositions,
  onCellClick,
  onTileClick,
  isGameStarted,
  lastShiftArrowId,
  onArrowClick,
  hoveredPath,
  hoveredSolutionArrow,
  boardRotation = 0,
  customTargetCoords,
  activeTargetCoords,
  onTreasureClick,
  allObtainedTreasures,
  activeTargetTreasureId,
}) => {

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {/* CSS Grid Layout */}
      <div 
        className={cn(
          "grid gap-1.5 w-full h-full justify-items-stretch items-stretch transition-transform duration-300 overflow-visible",
          isGameStarted ? "grid-cols-9 grid-rows-9" : "grid-cols-7 grid-rows-7"
        )}
        style={{ transform: `rotate(${boardRotation}deg)` }}
      >
        {/* SVG Solved Path Overlay */}
        {isGameStarted && hoveredPath && hoveredPath.length > 0 && (
          <svg
            viewBox="0 0 9 9"
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            aria-hidden="true"
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

            // Path overlays state
            const isOnHoveredPath = hoveredPath ? hoveredPath.some((cell: { r: number; c: number }) => cell.r === r && cell.c === c) : false;
            const isPathStart = hoveredPath && hoveredPath.length > 0 ? (hoveredPath[0].r === r && hoveredPath[0].c === c) : false;
            const isPathEnd = hoveredPath && hoveredPath.length > 0 ? (hoveredPath[hoveredPath.length - 1].r === r && hoveredPath[hoveredPath.length - 1].c === c) : false;
 
            const isCustomTarget = !!(customTargetCoords && customTargetCoords.r === r && customTargetCoords.c === c);
            const isActiveTarget = !!(activeTargetCoords && activeTargetCoords.r === r && activeTargetCoords.c === c && !isCustomTarget);
            const isObtainedTreasure = !!(tile?.treasure && allObtainedTreasures?.includes(tile.treasure.id));
            const isCurrentTarget = !!(tile?.treasure && tile.treasure.id === activeTargetTreasureId);
 
            let previewSlideClass = "";
            if (hoveredSolutionArrow) {
              const arrow = SHIFT_ARROWS.find((a) => a.id === hoveredSolutionArrow);
              if (arrow) {
                if (arrow.type === "row" && arrow.index === r) {
                  previewSlideClass = arrow.dir === "left" ? "animate-preview-slide-right" : "animate-preview-slide-left";
                } else if (arrow.type === "col" && arrow.index === c) {
                  previewSlideClass = arrow.dir === "top" ? "animate-preview-slide-down" : "animate-preview-slide-up";
                }
              }
            }
 
            return (
              <BoardSpace
                key={`${r}-${c}`}
                x={c}
                y={r}
                tile={tile}
                pawns={pawnsAtCell}
                isGameStarted={isGameStarted}
                isOnHoveredPath={isOnHoveredPath}
                isPathStart={isPathStart}
                isPathEnd={isPathEnd}
                onCellClick={onCellClick}
                onTileClick={onTileClick}
                boardRotation={boardRotation}
                isCustomTarget={isCustomTarget}
                isActiveTarget={isActiveTarget}
                previewSlideClass={previewSlideClass}
                onTreasureClick={onTreasureClick}
                isObtainedTreasure={isObtainedTreasure}
                isCurrentTarget={isCurrentTarget}
              />
            );
          })
        )}
 
      {/* Render Pushed-Out Tile Preview */}
        {isGameStarted && hoveredSolutionArrow && (() => {
          const arrow = SHIFT_ARROWS.find((a) => a.id === hoveredSolutionArrow);
          if (!arrow) return null;
          
          const sourceGrid = originalGrid || grid;
          let pushedTile: TileData | null = null;
          let gridRow = 0;
          let gridColumn = 0;
          let animClass = "";
  
          if (arrow.type === "row") {
            const r = arrow.index;
            if (arrow.dir === "left") {
              pushedTile = sourceGrid[r][6];
              gridRow = r + 2;
              gridColumn = 9;
              animClass = "animate-preview-slide-right";
            } else {
              pushedTile = sourceGrid[r][0];
              gridRow = r + 2;
              gridColumn = 1;
              animClass = "animate-preview-slide-left";
            }
          } else {
            const c = arrow.index;
            if (arrow.dir === "top") {
              pushedTile = sourceGrid[6][c];
              gridRow = 9;
              gridColumn = c + 2;
              animClass = "animate-preview-slide-down";
            } else {
              pushedTile = sourceGrid[0][c];
              gridRow = 1;
              gridColumn = c + 2;
              animClass = "animate-preview-slide-up";
            }
          }
  
          if (!pushedTile) return null;
  
          return (
            <div
              style={{ gridRow, gridColumn }}
              className={cn("w-full h-full aspect-square rounded-lg overflow-hidden border border-stone-800 bg-stone-950 pointer-events-none opacity-60 shadow-2xl", animClass)}
            >
              <Tile tile={pushedTile} disabled boardRotation={boardRotation} disableRotationTransition={true} className="absolute inset-0 w-full h-full" />
            </div>
          );
        })()}
      </div>
    </div>
  );
};