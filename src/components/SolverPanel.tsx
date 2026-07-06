import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { Tile } from "./Tile";
import { PAWNS } from "../constants";
import { playClickSound } from "../utils/audio";
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
  activeTargetTreasure: { id: string; name: string } | undefined;
  onTileClick: (id: string) => void;
  onExecuteSolution: (sol: any[]) => void;
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
  activeTargetTreasure,
  onTileClick,
  onExecuteSolution,
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
            <div className="font-semibold text-stone-100 flex items-center gap-1.5 flex-wrap">
              Target:{" "}
              {customTargetCoords ? (
                <span className="text-theme-primary font-bold flex items-center gap-1">
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
                <span className="text-theme-primary">
                  {activeTargetTreasure ? activeTargetTreasure.name : "None"}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] text-stone-500">Spare (Click to rotate)</div>
          <Tile tile={spareTile} onClick={() => onTileClick(spareTile.id)} className="w-12 h-12 border-theme-primary-40" />
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
            const firstStep = sol[0];
            const isFallback = sol.isFallback;
            return (
              <div
                key={index}
                onMouseEnter={() => setHoveredSolution(sol)}
                onMouseLeave={() => setHoveredSolution(null)}
                className={`p-3 bg-stone-950/40 border border-stone-800/60 hover:border-theme-primary-40 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${isFallback ? "opacity-60 hover:opacity-100" : ""}`}
              >
                <div>
                  <div className="text-xs font-semibold text-stone-300">
                    {isFallback ? <span className="text-stone-400">Fallback Target Prox</span> : <span className="text-green-500">Goal Connection Found</span>}
                  </div>
                  <div className="text-xs text-stone-400 mt-1">
                    Action: Slide {firstStep.arrowId.replace("-", " ")} ({firstStep.rotation}° Rot)
                  </div>
                  <div className="text-[10px] text-stone-500">
                    Turns needed: {sol.length} • Safety: {sol.safetyScore}%
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={(e) => { e.stopPropagation(); onExecuteSolution(sol); }}
                  className="bg-theme-primary-10 group-hover:bg-theme-primary text-theme-primary group-hover:text-stone-950 border border-theme-primary-20 group-hover:border-transparent font-medium text-xs px-2.5 py-1 rounded"
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
