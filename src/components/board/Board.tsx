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
  isTargetCoords?: boolean;
  is3D?: boolean;
  activePawn?: string;
  allObtainedTreasures?: string[];
  activeTargetTreasureId?: string | null;
  travelingPawn?: {
    color: string;
    path: { r: number; c: number }[];
    currentStepIndex?: number;
    key: number;
  } | null;
}

const PAWN_HEX_COLORS: Record<string, string> = {
  red: "#ef4444",
  blue: "#3b82f6",
  green: "#10b981",
  yellow: "#f59e0b",
};

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
  activePawn = "red",
  travelingPawn,
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
            isGameStarted ? "grid-cols-9 grid-rows-9" : "grid-cols-7 grid-rows-7",
            is3D
              ? "w-[92%] h-[92%]"
              : "w-full h-full"
          )}
          style={{ transformStyle: is3D ? "preserve-3d" : "flat" }}
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
                  "w-full h-full max-w-[70%] max-h-[70%] mx-auto p-0.5 rounded-lg transition-all focus:outline-none flex items-center justify-center",
                  isForbidden
                    ? "opacity-20 cursor-not-allowed border border-stone-700 text-stone-600 bg-stone-950/60"
                    : turnPhase === "move"
                    ? "opacity-25 cursor-not-allowed border border-stone-700 text-stone-600 bg-stone-950/60"
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
 
        {/* Pushed-Out Tile Preview — grid-placed, same 1fr cell size as tiles */}
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
            if (arrow.dir === "left") { pushedTile = sourceGrid[r][6]; gridRow = r + 2; gridColumn = 9; animClass = "animate-preview-slide-right"; }
            else                      { pushedTile = sourceGrid[r][0]; gridRow = r + 2; gridColumn = 1; animClass = "animate-preview-slide-left"; }
          } else {
            const c = arrow.index;
            if (arrow.dir === "top") { pushedTile = sourceGrid[6][c]; gridRow = 9; gridColumn = c + 2; animClass = "animate-preview-slide-down"; }
            else                     { pushedTile = sourceGrid[0][c]; gridRow = 1; gridColumn = c + 2; animClass = "animate-preview-slide-up"; }
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

        {/* SVG Path Overlay — absolute over the 9×9 grid, viewBox 0 0 9 9, tile center = c+1.5 */}
        {isGameStarted && hoveredPath && hoveredPath.length > 0 && (() => {
          const tc = (i: number) => i + 1.5;
          // If pawn is traveling along this solution path, erode the path behind it as it moves!
          let visiblePath = hoveredPath;
          if (travelingPawn && travelingPawn.path && travelingPawn.path.length > 0) {
            const stepIdx = travelingPawn.currentStepIndex ?? 0;
            visiblePath = travelingPawn.path.slice(stepIdx);
          }
          if (visiblePath.length === 0) return null;

          const pts = visiblePath.map(p => `${tc(p.c)},${tc(p.r)}`).join(" ");
          const s = visiblePath[0];
          const e = visiblePath[visiblePath.length - 1];
          const pathPawnColor = (hoveredPath as any).pawnColor || activePawn;
          const strokeColor = PAWN_HEX_COLORS[pathPawnColor] || "#f59e0b";
          return (
            <svg viewBox="0 0 9 9" className="absolute inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true">
              <polyline points={pts} fill="none" stroke="#000000" strokeWidth="0.10" strokeDasharray="0.18,0.12" strokeLinecap="round" strokeLinejoin="round" opacity="0.45" className="animate-path-crawl" />
              <polyline points={pts} fill="none" stroke={strokeColor} strokeWidth="0.06" strokeDasharray="0.18,0.12" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" className="animate-path-crawl" />
              <circle cx={tc(s.c)} cy={tc(s.r)} r="0.13" fill="#000000" />
              <circle cx={tc(s.c)} cy={tc(s.r)} r="0.08" fill={strokeColor} />
              {visiblePath.length > 1 && <>
                <circle cx={tc(e.c)} cy={tc(e.r)} r="0.13" fill="#000000" />
                <circle cx={tc(e.c)} cy={tc(e.r)} r="0.08" fill={strokeColor} />
              </>}
            </svg>
          );
        })()}

        {/* Pawn travel animation — follows the exact multi-tile path waypoint by waypoint */}
        {isGameStarted && travelingPawn && travelingPawn.path && travelingPawn.path.length > 1 && (() => {
          const tc = (i: number) => i + 1.5;
          const color = PAWN_HEX_COLORS[travelingPawn.color] || "#f59e0b";
          const pathD = travelingPawn.path
            .map((p, idx) => `${idx === 0 ? "M" : "L"} ${tc(p.c)} ${tc(p.r)}`)
            .join(" ");

          return (
            <svg key={travelingPawn.key} viewBox="0 0 9 9" className="absolute inset-0 w-full h-full pointer-events-none z-40" aria-hidden="true">
              {/* shadow */}
              <circle r="0.18" fill="#000000" opacity="0.5">
                <animateMotion dur="0.6s" calcMode="linear" fill="freeze" path={pathD} />
                <animate attributeName="opacity" values="0.5;0.5;0" keyTimes="0;0.9;1" dur="0.6s" fill="freeze" />
              </circle>
              {/* colored pawn dot */}
              <circle r="0.14" fill={color} stroke="#000000" strokeWidth="0.04">
                <animateMotion dur="0.6s" calcMode="linear" fill="freeze" path={pathD} />
                <animate attributeName="opacity" values="1;1;0" keyTimes="0;0.9;1" dur="0.6s" fill="freeze" />
              </circle>
            </svg>
          );
        })()}
      </div>
      </div>
    </div>
  );
};