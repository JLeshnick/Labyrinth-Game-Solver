import React, { useMemo } from "react";
import { Gauge, Trophy, ListOrdered, Activity } from "lucide-react";
import type { TileData, SolverSolution, PlayerMap } from "../../types";
import { PAWNS } from "../../constants";
import { Button } from "../ui/button";
import { getReachableCells } from "../../solver";
import { toSolverBoard } from "../../lib/solverAdapter";

interface DashboardWidgetsProps {
  grid: (TileData | null)[][];
  pawnPositions: Record<string, { r: number; c: number }>;
  activePlayers: string[];
  activePawn: string;
  playerHands: PlayerMap<string[]>;
  obtainedTreasures: PlayerMap<string[]>;
  solutions: SolverSolution[];
  isLoadingSolutions: boolean;
  onExecuteSolution: (sol: SolverSolution) => void;
  onQuickSolve?: () => void;
  onDeepSolve?: () => void;
}

export const DashboardWidgets: React.FC<DashboardWidgetsProps> = ({
  grid,
  pawnPositions,
  activePlayers,
  activePawn,
  playerHands,
  obtainedTreasures,
  solutions,
  isLoadingSolutions,
  onQuickSolve,
  onDeepSolve,
}) => {
  // 1. Piece Analysis Calculations
  const pieceStats = useMemo(() => {
    let tCount = 0;
    let cornerCount = 0;
    let straightCount = 0;
    let totalCount = 0;

    grid.flat().forEach((tile) => {
      if (!tile) return;
      totalCount++;
      if (tile.shape === "t-junction") tCount++;
      else if (tile.shape === "corner") cornerCount++;
      else if (tile.shape === "straight") straightCount++;
    });

    // Compute connectivity: % of non-null cells reachable from the active pawn
    let connectivity = 0;
    const activePos = pawnPositions[activePawn];
    if (activePos && totalCount > 0) {
      try {
        const solverBoard = toSolverBoard(grid, pawnPositions);
        const { cells } = getReachableCells(solverBoard, activePos.r, activePos.c);
        connectivity = Math.round((cells.length / totalCount) * 100);
      } catch {
        connectivity = 0;
      }
    }

    return { tCount, cornerCount, straightCount, totalCount, connectivity };
  }, [grid, pawnPositions, activePawn]);

  // 2. Pawn Progress Bar Calculations
  const pawnProgress = useMemo(() => {
    return activePlayers.map((pawnId) => {
      const hand = playerHands[pawnId] || [];
      const obtained = obtainedTreasures[pawnId] || [];
      const total = hand.length + obtained.length;
      const pct = total > 0 ? Math.round((obtained.length / total) * 100) : 0;
      const count = obtained.length;
      return {
        id: pawnId,
        name: PAWNS.find((p) => p.id === pawnId)?.name ?? pawnId,
        colorClass: PAWNS.find((p) => p.id === pawnId)?.colorClass ?? "bg-stone-500",
        pct,
        count,
        total,
      };
    });
  }, [activePlayers, playerHands, obtainedTreasures]);

  // 3. Solver Trace Logs
  const traceLogs = useMemo(() => {
    if (solutions.length === 0) return [];
    // Use the top solution to build step logs
    const topSol = solutions[0];
    return topSol.map((step, idx) => {
      let moveLabel = "Move Pawn";
      if (step.pawnPath && step.pawnPath.length > 1) {
        const movesCount = step.pawnPath.length - 1;
        moveLabel = `Walk ${movesCount} cell${movesCount > 1 ? "s" : ""}`;
      } else {
        moveLabel = "Stay stationary";
      }

      // Format slide row/col
      const arrowParts = step.arrowId.split("-");
      const typeLabel = arrowParts[0] === "row" ? "Row" : "Col";
      const indexVal = arrowParts[1] || "0";
      const dirVal = arrowParts[2] || "in";
      const rowCol = `${typeLabel} ${indexVal} (${dirVal})`;

      return {
        step: idx + 1,
        move: moveLabel,
        rowCol,
      };
    });
  }, [solutions]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full overflow-y-auto pr-2 pb-4">
      {/* CARD 1: Labyrinth Piece Analysis */}
      <div className="p-4 bg-card rounded-2xl border border-stone-850 dark:border-stone-800 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2 mb-3">
            <Gauge className="w-4 h-4 text-emerald-500" />
            Labyrinth Piece Analysis
          </h3>
          
          <div className="flex items-center justify-around gap-2 py-2">
            {/* T-junction progress ring */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#292524" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#10b981"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={163}
                    strokeDashoffset={163 - (163 * Math.min(pieceStats.tCount, 9)) / 9}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-stone-100">{pieceStats.tCount}</span>
                  <span className="text-[7px] text-stone-500 uppercase">T-Junc</span>
                </div>
              </div>
            </div>

            {/* Straight progress ring */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#292524" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#0ea5e9"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={163}
                    strokeDashoffset={163 - (163 * Math.min(pieceStats.straightCount, 12)) / 12}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-stone-100">{pieceStats.straightCount}</span>
                  <span className="text-[7px] text-stone-500 uppercase">Straight</span>
                </div>
              </div>
            </div>

            {/* Reachability connectivity circular ring */}
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="26" stroke="#292524" strokeWidth="4" fill="transparent" />
                  <circle
                    cx="32"
                    cy="32"
                    r="26"
                    stroke="#f59e0b"
                    strokeWidth="4"
                    fill="transparent"
                    strokeDasharray={163}
                    strokeDashoffset={163 - (163 * pieceStats.connectivity) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-xs font-bold text-stone-100">{pieceStats.connectivity}%</span>
                  <span className="text-[7px] text-stone-500 uppercase">Connect</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-stone-850 dark:border-stone-800 flex justify-between text-[11px] text-stone-400 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            T-Junctions: {pieceStats.tCount}/9
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            Corners: {pieceStats.cornerCount}/12
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            Straights: {pieceStats.straightCount}/12
          </div>
        </div>
      </div>

      {/* CARD 2: Pawn Move Distances (Player progress bars) */}
      <div className="p-4 bg-card rounded-2xl border border-stone-850 dark:border-stone-800 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2 mb-3">
          <Trophy className="w-4 h-4 text-purple-500" />
          Pawn Goal Distances
        </h3>
        
        {pawnProgress.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-xs text-stone-500 italic">
            No active players configured
          </div>
        ) : (
          <div className="flex-1 flex justify-around items-end gap-3 pt-2">
            {pawnProgress.map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-1.5 flex-1 max-w-[50px]">
                <span className="text-[10px] font-bold text-stone-300">{player.pct}%</span>
                
                {/* Visual bar chart */}
                <div className="w-6 h-24 bg-stone-900 rounded-full overflow-hidden flex items-end relative border border-stone-800">
                  <div
                    className={`w-full rounded-full transition-all duration-500 ${player.colorClass}`}
                    style={{ height: `${Math.max(8, player.pct)}%` }}
                  />
                </div>
                
                <span className="text-[9px] text-stone-500 font-bold uppercase truncate max-w-full">
                  {player.name[0]}
                </span>
                <span className="text-[8px] text-stone-600 font-mono font-semibold">
                  {player.count}/{player.total}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CARD 3: Solver Trace Logs (Step path grid) */}
      <div className="p-4 bg-card rounded-2xl border border-stone-850 dark:border-stone-800 shadow-sm flex flex-col h-[180px]">
        <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2 mb-2 shrink-0">
          <ListOrdered className="w-4 h-4 text-amber-500" />
          Solver Trace Logs
        </h3>
        
        <div className="flex-1 overflow-y-auto min-h-0">
          {traceLogs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-stone-500 italic">
              Solver idle. Set a target to compute steps.
            </div>
          ) : (
            <table className="w-full text-left text-[11px] border-collapse font-mono">
              <thead>
                <tr className="text-stone-500 border-b border-stone-850 dark:border-stone-800">
                  <th className="py-1.5 font-bold">Step</th>
                  <th className="py-1.5 font-bold">Move</th>
                  <th className="py-1.5 font-bold">Row/Col</th>
                </tr>
              </thead>
              <tbody>
                {traceLogs.map((log) => (
                  <tr key={log.step} className="text-stone-300 border-b border-stone-900/50 hover:bg-stone-900/20">
                    <td className="py-1 font-bold">{log.step}</td>
                    <td className="py-1">{log.move}</td>
                    <td className="py-1 text-theme-primary">{log.rowCol}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* CARD 4: Solver Engine Status (Animated wave & actions) */}
      <div className="p-4 bg-card rounded-2xl border border-stone-850 dark:border-stone-800 shadow-sm flex flex-col justify-between h-[180px]">
        <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2 mb-1.5">
          <Activity className="w-4 h-4 text-sky-500 animate-pulse" />
          Solver Engine Status
        </h3>

        {/* Live animated waveform visualizer */}
        <div className="flex items-center justify-center gap-1.5 h-10 py-1">
          {Array.from({ length: 9 }).map((_, i) => {
            const delay = [0.2, 0.4, 0.6, 0.3, 0.5, 0.1, 0.7, 0.4, 0.2][i];
            const height = [16, 28, 36, 22, 32, 12, 40, 24, 16][i];
            return (
              <div
                key={i}
                className="w-1 rounded-full bg-theme-primary opacity-80"
                style={{
                  height: `${height}px`,
                  animation: isLoadingSolutions ? `pulse ${delay + 0.8}s ease-in-out infinite alternate` : "none",
                }}
              />
            );
          })}
        </div>

        <div className="text-[10px] text-stone-400 text-center font-mono">
          {isLoadingSolutions ? (
            <span className="text-theme-primary animate-pulse font-bold">SOLVER ENGINE RUNNING...</span>
          ) : solutions.length > 0 ? (
            <span className="text-emerald-500 font-bold">SOLUTIONS READY ({solutions.length})</span>
          ) : (
            <span className="text-stone-500 italic">SOLVER IDLE</span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-2">
          <Button
            size="xs"
            onClick={onQuickSolve}
            disabled={isLoadingSolutions || solutions.length === 0}
            className="text-[10px] py-1.5 bg-stone-900 border border-stone-800 text-stone-200 hover:bg-stone-800 active:scale-95 transition-all"
          >
            Quick Solve
          </Button>
          <Button
            size="xs"
            onClick={onDeepSolve}
            disabled={isLoadingSolutions || solutions.length === 0}
            className="text-[10px] py-1.5 bg-theme-primary text-stone-950 hover:bg-theme-primary-hover font-bold active:scale-95 transition-all"
          >
            Execute Best
          </Button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0% { transform: scaleY(0.4); }
          100% { transform: scaleY(1.2); }
        }
      `}</style>
    </div>
  );
};
