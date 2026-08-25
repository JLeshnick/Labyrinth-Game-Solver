import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData, SolverSolution } from "../../types";
import { SHIFT_ARROWS, PAWN_COLOR_HEX } from "../../constants";
import { isOppositeArrow } from "../../solver";
import { Tile, DraggableTile } from "./Tile";
import { cn } from "../../lib/utils";
import { ChevronRight } from "lucide-react";
import { Tooltip } from "../ui/tooltip";

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
  scoreBadges?: { text: string; type: "positive" | "negative" | "neutral" }[];
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
  scoreBadges,
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
        "relative w-full h-full aspect-square rounded-lg flex items-center justify-center transition-all cursor-pointer hover:z-50",
        isFixedSpace
          ? "bg-stone-900/40 border border-stone-800/20 dark:bg-stone-800/40 dark:border-stone-700/50"
          : "border border-dashed border-stone-800/40 bg-stone-950/30 hover:bg-stone-900/10 shadow-inner dark:border-stone-600/50 dark:bg-stone-800/30 dark:hover:bg-stone-700/40",
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
        className="absolute inset-0 pointer-events-none flex flex-wrap items-center justify-center gap-1 p-1 z-50 transition-all duration-300"
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

      {/* Mathematical score breakdown badge pill (when score breakdown mode is active) */}
      {scoreBadges && scoreBadges.length > 0 && (
        <div className="absolute top-1 left-1 z-[120] pointer-events-none flex flex-col gap-1">
          {scoreBadges.map((badge, i) => (
            <span
              key={i}
              className={cn(
                "px-1 py-[2px] rounded text-[9px] font-black leading-none whitespace-nowrap shadow-[1px_1px_0_rgba(0,0,0,0.8)] border border-stone-950 animate-bounce-subtle",
                badge.type === "positive" ? "bg-emerald-400 text-stone-950" :
                badge.type === "negative" ? "bg-red-400 text-stone-950" :
                "bg-stone-100 text-stone-950"
              )}
            >
              {badge.text}
            </span>
          ))}
        </div>
      )}
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
  hoveredPath: { r: number; c: number; pawnColor?: string }[] | null;
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
  isStaticHoveredPath?: boolean;
  activePawn?: string;
  allObtainedTreasures?: string[];
  activeTargetTreasureId?: string | null;
  scoreBreakdownSolution?: SolverSolution | null;
  travelingPawn?: {
    color: string;
    path: { r: number; c: number }[];
    durationMs: number;
    key: number;
  } | null;
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
  scoreBreakdownSolution,
  is3D = false,
  isStaticHoveredPath = false,
  activePawn = "red",
  travelingPawn,
}) => {

  return (
    <div className="relative w-full h-full p-6 flex items-center justify-center overflow-visible">
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
          style={{
            transformStyle: is3D ? "preserve-3d" : "flat",
            gridTemplateColumns: isGameStarted ? "repeat(9, minmax(0, 1fr))" : "repeat(7, minmax(0, 1fr))",
            gridTemplateRows: isGameStarted ? "repeat(9, minmax(0, 1fr))" : "repeat(7, minmax(0, 1fr))",
          }}
        >
          {/* Render Shifting Arrows */}
          {isGameStarted &&
          SHIFT_ARROWS.map((arrow) => {
            const isForbidden = !!(lastShiftArrowId && isOppositeArrow(arrow.id, lastShiftArrowId));
            const isHighlighted = hoveredSolutionArrow === arrow.id;
            const isStaged = stagedArrow === arrow.id;

            const tooltipText = isForbidden
              ? "Forbidden: Cannot reverse previous shift"
              : isStaged
              ? "Click again to rotate tile — then use Commit in panel"
              : turnPhase === "move"
              ? "Slide phase complete — move your pawn"
              : `Stage tile into ${arrow.label}`;

            // Orient tooltips cleanly around the board edges without clipping viewport bounds
            let tooltipSide: "top" | "bottom" | "left" | "right" | "bottom-left" | "bottom-right" = "bottom";
            if (arrow.dir === "top") tooltipSide = "top";
            else if (arrow.dir === "bottom") tooltipSide = "bottom";
            else if (arrow.dir === "left") {
              // Left column arrows — render below the arrow aligned to its right edge so it extends inward over empty space
              tooltipSide = "bottom-right";
            } else if (arrow.dir === "right") {
              tooltipSide = "bottom-left";
            }

            return (
              <Tooltip
                key={arrow.id}
                content={tooltipText}
                side={tooltipSide}
                style={{
                  gridRow: arrow.gridRow,
                  gridColumn: arrow.gridColumn,
                  zIndex: 20,
                }}
                containerClassName="w-full h-full flex items-center justify-center relative"
              >
                <button
                  onClick={() => !isForbidden && onArrowClick(arrow.id)}
                  disabled={isForbidden || turnPhase === "move"}
                  className={cn(
                    "w-full h-full max-w-[70%] max-h-[70%] aspect-square my-auto mx-auto p-0.5 rounded-lg transition-all focus:outline-none flex items-center justify-center self-center justify-self-center",
                    isForbidden || turnPhase === "move"
                      ? "neo-brutalism-button bg-card border-stone-950 text-stone-600 opacity-40 cursor-not-allowed shadow-none translate-x-0 translate-y-0"
                      : isStaged
                      ? "neo-brutalism-button border-stone-950 bg-theme-primary text-stone-950 scale-105 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000] cursor-pointer"
                      : isHighlighted
                      ? "neo-brutalism-button border-stone-950 bg-theme-primary-20 text-theme-primary scale-105 cursor-pointer"
                      : "neo-brutalism-button border-stone-950 bg-card text-foreground hover:bg-theme-primary hover:text-stone-950 cursor-pointer",
                  )}
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
              </Tooltip>
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
 
            // Calculate math breakdown badges if a solution score pill is hovered/active
            let cellScoreBadges: { text: string; type: "positive" | "negative" | "neutral" }[] | undefined = undefined;
            if (scoreBreakdownSolution && scoreBreakdownSolution.length > 0) {
              const breakdown = (scoreBreakdownSolution.scoreBreakdown || {}) as Record<string, number>;
              const reach = breakdown.reachabilityScore ?? 0;
              const fixedBonus = breakdown.fixedSpaceBonus ?? 0;
              const exitsBonus = breakdown.tileExitsBonus ?? 0;
              const walkBonus = breakdown.walkBonus ?? 0;
              const wrapPenalty = breakdown.wrapPenalty ?? 0;
              const turnsPenalty = breakdown.turnsPenalty ?? 0;
              
              const lastTurn = scoreBreakdownSolution[scoreBreakdownSolution.length - 1];
              const finalLandingPos = lastTurn?.pawnPath ? lastTurn.pawnPath[lastTurn.pawnPath.length - 1] : null;
              const startPos = scoreBreakdownSolution[0]?.pawnPath ? scoreBreakdownSolution[0].pawnPath[0] : null;
              
              // Find the middle of the path for walk bonus
              const pathLength = lastTurn?.pawnPath ? lastTurn.pawnPath.length : 0;
              const midPos = pathLength > 2 && lastTurn?.pawnPath ? lastTurn.pawnPath[Math.floor(pathLength / 2)] : startPos;

              cellScoreBadges = [];

              // 1. Wrap Penalty on Start Pos
              if (startPos && startPos.r === r && startPos.c === c) {
                if (wrapPenalty > 0) cellScoreBadges.push({ text: `-${wrapPenalty} Board Wrap Penalty`, type: "negative" });
              }

              // 2. Walk Bonus in the middle of the walk path
              if (midPos && midPos.r === r && midPos.c === c) {
                if (walkBonus > 0) cellScoreBadges.push({ text: `+${walkBonus} Walk Efficiency`, type: "positive" });
              }

              // 3. Turns penalty on intermediate turns (or start pos if none)
              if (turnsPenalty > 0) {
                if (scoreBreakdownSolution.length > 1) {
                  // Put a turns penalty badge on the intermediate landings
                  for (let i = 0; i < scoreBreakdownSolution.length - 1; i++) {
                    const step = scoreBreakdownSolution[i];
                    const intermediatePos = step?.pawnPath ? step.pawnPath[step.pawnPath.length - 1] : null;
                    if (intermediatePos && intermediatePos.r === r && intermediatePos.c === c) {
                      cellScoreBadges.push({ text: `-15 Extra Turns Penalty`, type: "negative" });
                    }
                  }
                } else if (startPos && startPos.r === r && startPos.c === c) {
                  cellScoreBadges.push({ text: `-${turnsPenalty} Extra Turns Penalty`, type: "negative" });
                }
              }
              
              // 4. Reach, Fixed, Exits on Final Landing Pos
              if (finalLandingPos && finalLandingPos.r === r && finalLandingPos.c === c) {
                if (reach > 0) cellScoreBadges.push({ text: `+${reach} Reachability`, type: "positive" });
                
                if (fixedBonus > 0) cellScoreBadges.push({ text: `+${fixedBonus} Fixed Space Bonus`, type: "positive" });
                if (exitsBonus > 0) cellScoreBadges.push({ text: `+${exitsBonus} Tile Exits Bonus`, type: "positive" });
              }
              
              if (cellScoreBadges.length === 0) {
                cellScoreBadges = undefined;
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
                scoreBadges={cellScoreBadges}
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
              style={{ gridRow, gridColumn, zIndex: 70 }}
              className={cn("relative w-full h-full aspect-square rounded-xl overflow-hidden border-2 border-stone-950 pointer-events-none shadow-[4px_4px_0_0_#000000]", animClass)}
            >
              <Tile tile={pushedTile} boardRotation={boardRotation} disableRotationTransition={true} is3D={is3D} className="absolute inset-0 w-full h-full" />
            </div>
          );
        })()}

        {/* SVG Path Overlay for solution / hovered path preview */}
        {isGameStarted && hoveredPath && hoveredPath.length > 0 && !travelingPawn && (() => {
          const tc = (i: number) => i + 1.5;
          const pts = hoveredPath.map(p => `${tc(p.c)},${tc(p.r)}`).join(" ");
          const s = hoveredPath[0];
          const e = hoveredPath[hoveredPath.length - 1];
          const pathPawnColor = hoveredPath[0]?.pawnColor || activePawn;
          const strokeColor = PAWN_COLOR_HEX[pathPawnColor] || "#f59e0b";

          return (
            <svg viewBox="0 0 9 9" className="absolute inset-0 w-full h-full pointer-events-none z-30 transition-opacity duration-150" aria-hidden="true">
              <polyline
                points={pts}
                fill="none"
                stroke="#000000"
                strokeWidth={isStaticHoveredPath ? "0.08" : "0.10"}
                strokeDasharray={isStaticHoveredPath ? undefined : "0.18,0.12"}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isStaticHoveredPath ? "0.6" : "0.45"}
                className={isStaticHoveredPath ? "" : "animate-path-crawl"}
              />
              <polyline
                points={pts}
                fill="none"
                stroke={strokeColor}
                strokeWidth={isStaticHoveredPath ? "0.04" : "0.06"}
                strokeDasharray={isStaticHoveredPath ? undefined : "0.18,0.12"}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={isStaticHoveredPath ? "1" : "0.85"}
                className={isStaticHoveredPath ? "" : "animate-path-crawl"}
              />
              <circle cx={tc(s.c)} cy={tc(s.r)} r="0.13" fill="#000000" />
              <circle cx={tc(s.c)} cy={tc(s.r)} r="0.08" fill={strokeColor} />
              {hoveredPath.length > 1 && (
                <>
                  <circle cx={tc(e.c)} cy={tc(e.r)} r="0.13" fill="#000000" />
                  <circle cx={tc(e.c)} cy={tc(e.r)} r="0.08" fill={strokeColor} />
                </>
              )}
            </svg>
          );
        })()}

        {/* Dynamic Path Trail Erosion during active pawn travel */}
        {isGameStarted && travelingPawn && travelingPawn.path && travelingPawn.path.length > 1 && (() => {
          const tc = (i: number) => i + 1.5;
          const pathD = travelingPawn.path
            .map((p, idx) => `${idx === 0 ? "M" : "L"} ${tc(p.c)} ${tc(p.r)}`)
            .join(" ");
          const e = travelingPawn.path[travelingPawn.path.length - 1];
          const color = PAWN_COLOR_HEX[travelingPawn.color] || "#f59e0b";
          const durSec = `${(travelingPawn.durationMs / 1000).toFixed(2)}s`;

          // Calculate total path length in viewBox coordinate units
          let totalLen = 0;
          for (let i = 0; i < travelingPawn.path.length - 1; i++) {
            const p1 = travelingPawn.path[i];
            const p2 = travelingPawn.path[i + 1];
            totalLen += Math.hypot(tc(p2.c) - tc(p1.c), tc(p2.r) - tc(p1.r));
          }
          const totalLenStr = totalLen.toFixed(3);

          return (
            <svg key={travelingPawn.key} viewBox="0 0 9 9" className="absolute inset-0 w-full h-full pointer-events-none z-30" aria-hidden="true">
              {/* Background dark track along full path */}
              <path
                d={pathD}
                fill="none"
                stroke="#000000"
                strokeWidth="0.10"
                strokeDasharray="0.18,0.12"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.3"
              />

              {/* Full colored path that erodes (is pushed off) from behind the pawn as it travels */}
              <path
                d={pathD}
                fill="none"
                stroke={color}
                strokeWidth="0.06"
                strokeDasharray={`${totalLenStr} ${totalLenStr}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0"
                  to={`-${totalLenStr}`}
                  dur={durSec}
                  fill="freeze"
                  calcMode="linear"
                />
              </path>

              {/* End destination target dot */}
              <circle cx={tc(e.c)} cy={tc(e.r)} r="0.12" fill="#000000" />
              <circle cx={tc(e.c)} cy={tc(e.r)} r="0.08" fill={color} />

              {/* Pawn drop shadow sliding along path */}
              <circle r="0.18" fill="#000000" opacity="0.5">
                <animateMotion dur={durSec} calcMode="linear" fill="freeze" path={pathD} />
              </circle>
              {/* Animated Pawn dot */}
              <circle r="0.14" fill={color} stroke="#000000" strokeWidth="0.04">
                <animateMotion dur={durSec} calcMode="linear" fill="freeze" path={pathD} />
              </circle>
            </svg>
          );
        })()}
      </div>
      </div>
    </div>
  );
};