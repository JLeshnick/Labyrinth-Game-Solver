import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Tile } from "./Tile";
import { PAWNS, TREASURES } from "../constants";
import { playClickSound } from "../utils/audio";
import { quickSolveMinTurns } from "../solver";
import type { TileData } from "../types";

interface SolverPanelProps {
  solutions: any[];
  isLoadingSolutions: boolean;
  hoveredSolution: any | null;
  setHoveredSolution: (sol: any | null) => void;
  maxTurns: number;
  setMaxTurns: (n: number) => void;
  activePawn: string;
  setActivePawn: (p: string) => void;
  activePlayers: string[];
  isMuted: boolean;
  spareTile: TileData;
  customTargetCoords: { r: number; c: number } | null;
  setCustomTargetCoords: (coords: { r: number; c: number } | null) => void;
  onExecuteSolution: (sol: any[]) => void;
  playerActiveTargets: Record<string, string | null>;
  onSelectTargetTreasure: (pawn: string, treasureId: string | null) => void;
  obtainedTreasures: Record<string, string[]>;
  grid: (TileData | null)[][];
  pawnPositions: Record<string, { r: number; c: number }>;
  lastShiftArrowId: string | null;
}
 
export function SolverPanel({
  solutions,
  isLoadingSolutions,
  setHoveredSolution,
  maxTurns,
  setMaxTurns,
  activePawn,
  setActivePawn,
  activePlayers,
  isMuted,
  spareTile,
  customTargetCoords,
  setCustomTargetCoords,
  onExecuteSolution,
  playerActiveTargets,
  onSelectTargetTreasure,
  obtainedTreasures,
  grid,
  pawnPositions,
  lastShiftArrowId,
}: SolverPanelProps) {
  return (
    <div className="flex-1 flex flex-col min-h-0 gap-4 bg-stone-900/50 border border-stone-800 rounded-2xl p-5 backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-theme-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-theme-primary" />
          Solver Suggestions
        </h2>
        <div className="text-xs px-2 py-1 bg-stone-800 rounded text-stone-400">
          Turns:
          <select
            value={maxTurns}
            onChange={(e) => setMaxTurns(parseInt(e.target.value))}
            className="ml-1 bg-stone-900 border border-stone-700 text-stone-200 rounded text-xs focus:outline-none"
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
          </select>
        </div>
      </div>

      <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl flex items-center justify-between text-left">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-stone-950 ${PAWNS.find((p) => p.id === activePawn)?.colorClass ?? "bg-stone-500"}`}>
            {activePawn[0].toUpperCase()}
          </div>
          <div>
            <div className="text-xs text-stone-400">Active Pawn's Turn</div>
            <div className="font-semibold text-stone-100 flex items-center gap-1.5 flex-wrap mt-0.5">
              <span>Target:</span>
              {customTargetCoords ? (
                <span className="text-theme-primary font-bold flex items-center gap-1 text-xs">
                  Custom Target ({customTargetCoords.r}, {customTargetCoords.c})
                  <button
                    onClick={() => setCustomTargetCoords(null)}
                    className="text-stone-500 hover:text-stone-300 text-xs ml-1 underline cursor-pointer"
                    title="Clear Custom Target"
                  >
                    (clear)
                  </button>
                </span>
              ) : (
                <select
                  value={playerActiveTargets[activePawn] || ""}
                  onChange={(e) => {
                    const val = e.target.value || null;
                    onSelectTargetTreasure(activePawn, val);
                  }}
                  className="bg-stone-900 border border-stone-800 text-stone-200 rounded px-1.5 py-0.5 text-xs focus:border-theme-primary outline-none transition-colors max-w-[180px] truncate"
                >
                  <option value="">-- No Target --</option>
                  {TREASURES.filter(t => {
                    // Filter out treasures obtained by ANY player
                    const allObtained = Object.values(obtainedTreasures).flat();
                    return !allObtained.includes(t.id);
                  })
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map((t) => {
                      const pawnPos = pawnPositions[activePawn];
                      if (!pawnPos) return <option key={t.id} value={t.id}>{t.name}</option>;
                      const turns = quickSolveMinTurns(
                        grid.map(row => row.map(cell => cell ? { ...cell, pawns: [] } : null)),
                        { ...spareTile, pawns: [] },
                        pawnPos,
                        t.id,
                        lastShiftArrowId,
                        maxTurns
                      );
                      return (
                        <option key={t.id} value={t.id}>
                          {t.name} {turns !== null ? `(${turns} move${turns !== 1 ? 's' : ''})` : ''}
                        </option>
                      );
                    })}
                </select>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] text-stone-500">Spare Tile</div>
          <Tile tile={spareTile} disabled className="w-12 h-12 border-theme-primary-40" />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 flex flex-col gap-2">
        {isLoadingSolutions ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500 gap-2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-theme-primary" />
            Computing paths...
          </div>
        ) : solutions.length > 0 ? (
          solutions.map((sol, index) => {
            const isFallback = sol.isFallback;
            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredSolution(sol)}
                onMouseLeave={() => setHoveredSolution(null)}
                className={`p-4 bg-stone-950/40 border border-stone-800/60 hover:border-theme-primary-40 rounded-xl transition-all flex items-start justify-between cursor-pointer group gap-3 ${isFallback ? "opacity-75 hover:opacity-100" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    {isFallback ? (
                      <span className="text-amber-500 font-bold">Fallback Setup</span>
                    ) : (
                      <span className="text-green-500 font-bold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Direct Route
                      </span>
                    )}
                    <span className="text-[10px] text-stone-500">({sol.length} turn{sol.length > 1 ? "s" : ""})</span>
                  </div>
                  <div className="text-xs font-semibold mt-1.5">
                    {(() => {
                      const firstStep = sol[0];
                      if (!firstStep?.pawnPath) return null;
                      const firstStepMoves = firstStep.pawnPath.length - 1;
                      
                      const firstStepText = firstStepMoves > 0 ? (
                        <span className="text-blue-400/80">
                          Pawn moves <span className="text-blue-300 font-bold">{firstStepMoves}</span> tile{firstStepMoves !== 1 ? 's' : ''} on execution
                        </span>
                      ) : (
                        <span className="text-amber-400/80">
                          Pawn stays stationary on execution
                        </span>
                      );

                      if (sol.length === 1) {
                        return firstStepText;
                      } else {
                        // Calculate total correct sum of moves across the whole multi-turn path
                        const totalMoves = sol.reduce((sum: number, step: any) => {
                          const stepMoves = step.pawnPath ? step.pawnPath.length - 1 : 0;
                          return sum + Math.max(0, stepMoves);
                        }, 0);
                        return (
                          <div className="flex flex-col gap-0.5">
                            {firstStepText}
                            <div className="text-purple-400/80 text-[10px]">
                              Total route moves: <span className="text-purple-300 font-bold">{totalMoves}</span> tile{totalMoves !== 1 ? 's' : ''} across {sol.length} turns
                            </div>
                          </div>
                        );
                      }
                    })()}
                  </div>
                  <div className="text-xs font-medium text-stone-100 mt-1 font-mono leading-relaxed">
                    {sol.explanation?.slide}
                  </div>
                  <div className="text-xs text-stone-400 mt-1 leading-relaxed">
                    {sol.explanation?.walk}
                  </div>
                  <div className="text-[10px] text-stone-500 mt-1">
                    Safety: <span className={sol.safetyScore >= 75 ? "text-green-400 font-medium" : sol.safetyScore >= 45 ? "text-amber-400 font-medium" : "text-red-400 font-medium"}>
                      {sol.explanation?.safety}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onExecuteSolution(sol); }}
                  className="bg-theme-primary-10 group-hover:bg-theme-primary text-theme-primary group-hover:text-stone-950 border border-theme-primary-20 group-hover:border-transparent font-medium text-xs px-2.5 py-1 rounded flex-shrink-0 self-center"
                >
                  Execute
                </Button>
              </div>
            );
          })
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-600 text-sm">
            No paths found. Check targets or max turns.
          </div>
        )}
      </div>

      <div className="border-t border-stone-800 pt-4">
        <div className="text-xs text-stone-400 mb-2 font-medium">Select Player:</div>
        <div className="grid grid-cols-4 gap-2">
          {PAWNS.filter((p) => activePlayers.includes(p.id)).map((p) => (
            <Button
              key={p.id}
              variant={activePawn === p.id ? "default" : "outline"}
              onClick={() => { if (!isMuted) playClickSound(); setActivePawn(p.id); }}
              className={`border-stone-800 ${activePawn === p.id ? p.colorClass + " text-stone-950 font-bold" : "hover:bg-stone-900 text-stone-200"}`}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
