import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData } from "../../types";
import { SHIFT_ARROWS } from "../../constants";
import { isOppositeArrow } from "../../solver";
import { Tile, DraggableTile } from "./Tile";
import { cn } from "../../lib/utils";
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
  isReachable?: boolean;
  onTreasureClick?: (treasureId: string, alreadyObtained: boolean) => void;
  isObtainedTreasure?: boolean;
  isCurrentTarget?: boolean;
  is3D?: boolean;
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
  isReachable,
  onTreasureClick,
  isObtainedTreasure,
  isCurrentTarget,
  is3D = false,
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
        transformStyle: is3D ? "preserve-3d" : "flat",
      }}
      className={cn(
        "relative w-full h-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer",
        isFixedSpace
          ? "bg-stone-900/40 border border-stone-800/20"
          : "border border-dashed border-stone-800/40 bg-stone-950/30 hover:bg-stone-900/10 shadow-inner",
        isOver && !tile ? "bg-theme-primary-10" : "",
        previewSlideClass,
        isReachable ? "bg-green-900/20 hover:bg-green-900/30 cursor-pointer" : "",
      )}
    >
      {tile ? (
        <DraggableTile
          tile={tile}
          onClick={isGameStarted
            ? (tile?.treasure && onTreasureClick
                ? () => {
                    // Set the treasure as the named target AND set customTargetCoords
                    // so the cell border ring also shows (same visual feedback as
                    // clicking a non-treasure tile in slide phase).
                    onTreasureClick(tile.treasure!.id, !!isObtainedTreasure);
                    onCellClick(y, x);
                  }
                : () => onCellClick(y, x))
            : () => onTileClick(tile.id)
          }
          disabled={isGameStarted}
          boardRotation={boardRotation}
          disableRotationTransition={true}
          isObtainedTreasure={isObtainedTreasure}
          isCurrentTarget={isCurrentTarget}
          is3D={is3D}
          className="w-full h-full absolute inset-0"
        />
      ) : (
        <span className="sr-only">{y},{x}</span>
      )}

      {/* Highlight border overlay — rendered above the tile's box-shadow */}
      {(isOnHoveredPath || isCustomTarget || isActiveTarget || (isOver && !tile)) && (
        <div
          className={cn(
            "absolute inset-0 rounded-2xl pointer-events-none z-40",
            isPathStart  ? "border-[3px] border-green-400" :
            isPathEnd    ? "border-[3px] border-theme-primary" :
            isCustomTarget ? "border-[3px] border-theme-primary" :
            isActiveTarget ? "border-[3px] border-amber-400" :
            isOnHoveredPath ? "border-2 border-theme-primary/60" :
            "border-2 border-theme-primary"
          )}
          aria-hidden="true"
        />
      )}

      {/* Render Pawns inside BoardSpace */}
      <div 
        className="absolute inset-0 pointer-events-none flex flex-wrap items-center justify-center gap-1 p-1 z-20 transition-all duration-300"
        style={
          is3D
            ? { transform: `rotateZ(${30 - boardRotation}deg) rotateX(-45deg) translateZ(14px)` }
            : { transform: `rotate(${-boardRotation}deg)` }
        }
      >
        {pawns.map((color) => {
          const pegColors: Record<string, string> = {
            red: "bg-red-500 text-white",
            blue: "bg-blue-500 text-white",
            green: "bg-emerald-500 text-white",
            yellow: "bg-amber-400 text-stone-950",
          };
          const styleClass = pegColors[color] || "bg-stone-500 text-white";
          return (
            <div
              key={color}
              className={cn(
                "w-5.5 h-5.5 sm:w-6.5 sm:h-6.5 rounded-full border-2 border-stone-950 dark:border-stone-950 shadow-[2px_2px_0_0_#000000] flex items-center justify-center text-[9px] sm:text-[10px] font-extrabold capitalize relative",
                styleClass
              )}
            >
              <span className="relative z-10">{color[0].toUpperCase()}</span>
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
  activePlayers?: string[];
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
  reachableCells?: { r: number; c: number }[];
  turnPhase?: "slide" | "move";
  stagedArrow?: string | null;
  onTreasureClick?: (treasureId: string, alreadyObtained: boolean) => void;
  allObtainedTreasures?: string[];
  activeTargetTreasureId?: string | null;
  is3D?: boolean;
}

export const Board: React.FC<BoardProps> = ({
  grid,
  originalGrid,
  pawnPositions,
  activePlayers,
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
  reachableCells,
  turnPhase,
  stagedArrow,
  onTreasureClick,
  allObtainedTreasures,
  activeTargetTreasureId,
  is3D = false,
}) => {

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-visible">
      {/* 3D Tray Platform Wrapper */}
      <div
        className={cn(
          "relative transition-all duration-500 overflow-visible flex items-center justify-center w-full h-full aspect-square",
          is3D
            ? "p-4 sm:p-6 md:p-8 rounded-3xl bg-stone-150 dark:bg-stone-900 border-3 sm:border-4 border-stone-950 shadow-[8px_8px_0_0_#000000]"
            : ""
        )}
        style={
          is3D
            ? {
                transform: `perspective(1200px) rotateX(45deg) rotateZ(${-30 + boardRotation}deg) scale(0.92)`,
                transformStyle: "preserve-3d",
              }
            : {
                transform: `rotate(${boardRotation}deg)`,
              }
        }
      >
        {/* CSS Grid Layout */}
        <div
          className={cn(
            "grid gap-px xs:gap-0.5 md:gap-1 justify-items-stretch items-stretch transition-all duration-500 overflow-visible aspect-square",
            is3D
              ? "w-[92%] h-[92%]"
              : "w-full h-full"
          )}
          style={{
            transformStyle: is3D ? "preserve-3d" : "flat",
            ...(isGameStarted
              ? {
                  gridTemplateColumns: "0.4fr repeat(7, 1fr) 0.4fr",
                  gridTemplateRows: "0.4fr repeat(7, 1fr) 0.4fr",
                }
              : {
                  gridTemplateColumns: "repeat(7, 1fr)",
                  gridTemplateRows: "repeat(7, 1fr)",
                }),
          }}
        >
        {/* Render Shifting Arrows */}
        {isGameStarted &&
          SHIFT_ARROWS.map((arrow) => {
            const isForbidden = !!(lastShiftArrowId && isOppositeArrow(arrow.id, lastShiftArrowId));
            const isHighlighted = hoveredSolutionArrow === arrow.id;
            const isStaged = stagedArrow === arrow.id;

            return (
              <button
                key={arrow.id}
                onClick={() => !isForbidden && onArrowClick(arrow.id)}
                disabled={isForbidden || turnPhase === "move"}
                style={{
                  gridRow: arrow.gridRow,
                  gridColumn: arrow.gridColumn,
                }}
                className={cn(
                  "w-full h-full max-w-[85%] max-h-[85%] mx-auto p-1 rounded-xl transition-all focus:outline-none flex items-center justify-center",
                  isForbidden
                    ? "opacity-20 cursor-not-allowed border border-stone-850 text-stone-600 bg-stone-950/60"
                    : turnPhase === "move"
                    ? "opacity-25 cursor-not-allowed border border-stone-850 text-stone-600 bg-stone-950/60"
                    : isStaged
                    ? "neo-brutalism-button border-stone-950 bg-theme-primary text-stone-950 scale-105 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000] cursor-pointer"
                    : isHighlighted
                    ? "neo-brutalism-button border-stone-950 bg-theme-primary-20 text-theme-primary scale-105 cursor-pointer"
                    : "neo-brutalism-button border-stone-950 bg-card text-foreground hover:bg-theme-primary hover:text-stone-950 cursor-pointer",
                )}
                title={
                  isForbidden
                    ? "Forbidden: Cannot immediately reverse the previous shift"
                    : isStaged
                    ? "Click again to rotate tile — then use Commit in the panel"
                    : `Stage tile into ${arrow.label}`
                }
                aria-label={
                  isForbidden
                    ? `Forbidden: Cannot reverse previous shift into ${arrow.label}`
                    : isStaged
                    ? `Rotate staged tile for ${arrow.label}`
                    : `Stage spare tile into ${arrow.label}`
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
              .filter(([color, pos]) => pos.r === r && pos.c === c && (!activePlayers || activePlayers.includes(color)))
              .map(([color]) => color);

            // Path overlays state
            const isOnHoveredPath = hoveredPath ? hoveredPath.some((cell: { r: number; c: number }) => cell.r === r && cell.c === c) : false;
            const isPathStart = !!(hoveredPath && hoveredPath.length > 0 && hoveredPath[0].r === r && hoveredPath[0].c === c);
            const isPathEnd = !!(hoveredPath && hoveredPath.length > 1 && hoveredPath[hoveredPath.length - 1].r === r && hoveredPath[hoveredPath.length - 1].c === c);
 
            const isCustomTarget = !!(customTargetCoords && customTargetCoords.r === r && customTargetCoords.c === c);
            const isActiveTarget = !!(activeTargetCoords && activeTargetCoords.r === r && activeTargetCoords.c === c && !isCustomTarget);
            const isObtainedTreasure = !!(tile?.treasure && allObtainedTreasures?.includes(tile.treasure.id));
            const isCurrentTarget = !!(tile?.treasure && tile.treasure.id === activeTargetTreasureId);
            const isReachable = !!(reachableCells?.some(cell => cell.r === r && cell.c === c));

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
                isReachable={isReachable}
                is3D={is3D}
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
              style={{ gridRow, gridColumn, zIndex: 30 }}
              className={cn("relative w-full h-full aspect-square rounded-xl overflow-hidden border-2 border-stone-950 pointer-events-none shadow-[4px_4px_0_0_#000000]", animClass)}
            >
              <Tile tile={pushedTile} boardRotation={boardRotation} disableRotationTransition={true} is3D={is3D} className="absolute inset-0 w-full h-full" />
            </div>
          );
        })()}
      </div>

      {/* SVG Solved Path Overlay — sibling to grid, absolute over tray, avoids gap math */}
      {isGameStarted && hoveredPath && hoveredPath.length > 0 && (() => {
        // pct(i): center of tile i in the 0.4fr repeat(7,1fr) 0.4fr template as a %
        const pct = (i: number) => ((i + 0.9) / 7.8 * 100).toFixed(3);
        const pts = hoveredPath.map(p => `${pct(p.c)},${pct(p.r)}`).join(" ");
        const s = hoveredPath[0];
        const e = hoveredPath[hoveredPath.length - 1];
        const sw = (1 / 7.8 * 100 * 0.1).toFixed(3);   // ~1.3 in pct units
        const swThin = (1 / 7.8 * 100 * 0.065).toFixed(3);
        const da = (1 / 7.8 * 100 * 0.18).toFixed(3);
        const dg = (1 / 7.8 * 100 * 0.12).toFixed(3);
        const rSq = (1 / 7.8 * 100 * 0.13).toFixed(3);
        const rSqI = (1 / 7.8 * 100 * 0.08).toFixed(3);
        const rCir = (1 / 7.8 * 100 * 0.13).toFixed(3);
        const rCirI = (1 / 7.8 * 100 * 0.08).toFixed(3);
        return (
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none z-30"
            aria-hidden="true"
          >
            <polyline points={pts} fill="none" stroke="#000000"
              strokeWidth={sw} strokeDasharray={`${da},${dg}`}
              strokeLinecap="round" strokeLinejoin="round"
              opacity="0.45" className="animate-path-crawl" />
            <polyline points={pts} fill="none" stroke="var(--theme-color)"
              strokeWidth={swThin} strokeDasharray={`${da},${dg}`}
              strokeLinecap="round" strokeLinejoin="round"
              opacity="0.7" className="animate-path-crawl" />
            <rect x={+pct(s.c) - +rSq} y={+pct(s.r) - +rSq} width={+rSq * 2} height={+rSq * 2} fill="#000000" />
            <rect x={+pct(s.c) - +rSqI} y={+pct(s.r) - +rSqI} width={+rSqI * 2} height={+rSqI * 2} fill="var(--theme-color)" />
            {hoveredPath.length > 1 && <>
              <circle cx={pct(e.c)} cy={pct(e.r)} r={rCir} fill="#000000" />
              <circle cx={pct(e.c)} cy={pct(e.r)} r={rCirI} fill="var(--theme-color)" />
            </>}
          </svg>
        );
      })()}
      </div>
    </div>
  );
};