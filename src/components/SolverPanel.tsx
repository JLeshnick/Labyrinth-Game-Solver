// Responsive model: this panel renders in two DOM sites — the phone bottom
// sheet (< md) and the tablet/desktop side column (md+). Unprefixed classes
// target the phone sheet; `md:` targets the tablet column; `lg:` targets the
// wider desktop column. Interactive play controls get a 44px phone floor.
import { Sparkles, ArrowRightCircle, MousePointer2, RotateCw, Home, Gauge } from "lucide-react";
import { Button } from "./ui/button";
import { Tile } from "./Tile";
import { PAWNS, TREASURES, DEFAULT_PAWN_POSITIONS } from "../constants";
import { playClickSound } from "../utils/audio";
import type { TileData, SolverSolution, SolverSolutionStep } from "../types";

interface SolverPanelProps {
  solutions: SolverSolution[];
  isLoadingSolutions: boolean;
  hoveredSolution: SolverSolution | null;
  setHoveredSolution: (sol: SolverSolution | null) => void;
  maxTurns: number;
  setMaxTurns: (n: number) => void;
  activePawn: string;
  setActivePawn: (p: string) => void;
  activePlayers: string[];
  isMuted: boolean;
  spareTile: TileData;
  customTargetCoords: { r: number; c: number } | null;
  setCustomTargetCoords: (coords: { r: number; c: number } | null) => void;
  onExecuteSolution: (sol: SolverSolution) => void;
  playerActiveTargets: Record<string, string | null>;
  onSelectTargetTreasure: (pawn: string, treasureId: string | null) => void;
  stagedArrow: string | null;
  stagedRotation: 0 | 90 | 180 | 270;
  onRotateStaged: () => void;
  onCommitSlide: () => void;
  onCancelSlide: () => void;
  turnPhase: "slide" | "move";
  showOneMoveTargets: boolean;
  onToggleOneMoveTargets: () => void;
  oneMoveTargets: { id: string; name: string }[];
  isActivePawnHome: boolean;
  compact?: boolean;
  onToggleStats?: () => void;
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
  stagedArrow,
  stagedRotation,
  onRotateStaged,
  onCommitSlide,
  onCancelSlide,
  turnPhase,
  showOneMoveTargets,
  onToggleOneMoveTargets,
  oneMoveTargets,
  isActivePawnHome,
  compact = false,
  onToggleStats,
}: SolverPanelProps) {
  if (compact) {
    const topSolution = solutions[0];
    return (
      <div className="flex flex-col gap-1.5 px-3 pb-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-stone-200 truncate">
            {turnPhase === "move"
              ? "Move your pawn"
              : stagedArrow
              ? "Arrow staged — tap Slide In"
              : "Tap a board arrow to slide"}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {!isActivePawnHome ? (
              <button
                onClick={() => setCustomTargetCoords(DEFAULT_PAWN_POSITIONS[activePawn])}
                className="text-[10px] px-2 py-1 min-h-9 rounded-lg border border-stone-700 text-stone-400 flex items-center gap-1"
              >
                <Home className="w-3 h-3" /> Home
              </button>
            ) : null}
            {onToggleStats && (
              <button
                onClick={onToggleStats}
                aria-label="Toggle game statistics"
                className="p-2 min-h-9 min-w-9 rounded-lg border border-stone-700 text-stone-400 flex items-center justify-center"
              >
                <Gauge className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
        {topSolution?.explanation?.slide && (
          <div className="text-[11px] text-stone-400 truncate font-mono">
            {topSolution.explanation.slide}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3 md:gap-4 p-2 md:p-3 lg:p-4">
      {/* Turn phase banner */}
      {turnPhase === "move" ? (
        <div className="px-3 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 border bg-green-950/40 border-green-800/50 text-green-300">
          <MousePointer2 className="w-3.5 h-3.5 shrink-0" />
          <span>Click a highlighted green cell to move your pawn</span>
        </div>
      ) : stagedArrow ? (
        <div className="px-3 py-2 rounded-xl text-xs md:text-sm font-semibold flex flex-col gap-1.5 border bg-theme-primary-10 border-theme-primary/30 text-stone-200">
          <div className="flex items-center gap-2">
            <ArrowRightCircle className="w-3.5 h-3.5 text-theme-primary shrink-0" />
            <span className="font-bold text-theme-primary">Arrow staged — preview locked in</span>
          </div>
          <div className="flex flex-col gap-0.5 pl-5 text-[10px] text-stone-400 font-normal">
            <span>• Click the <span className="text-stone-200 font-semibold">same arrow</span> again to rotate the tile</span>
            <span>• Click a <span className="text-stone-200 font-semibold">different arrow</span> to move the stage</span>
            <span>• Press <span className="text-theme-primary font-semibold">Slide In</span> below to commit</span>
          </div>
        </div>
      ) : (
        <div className="px-3 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 border bg-blue-950/40 border-blue-800/50 text-blue-300">
          <ArrowRightCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Click any board arrow to preview and stage that slide</span>
        </div>
      )}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-lg font-bold text-theme-primary flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-theme-primary" />
          Solver Suggestions
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleOneMoveTargets}
            className={`text-[10px] md:text-xs px-2 py-1 min-h-9 rounded-lg border transition-colors cursor-pointer font-semibold ${
              showOneMoveTargets
                ? "bg-theme-primary-10 border-theme-primary/40 text-theme-primary"
                : "border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-600"
            }`}
            title="Show all treasures reachable in exactly 1 turn"
          >
            1-move targets
          </button>
          <button
            onClick={() => setCustomTargetCoords(DEFAULT_PAWN_POSITIONS[activePawn])}
            disabled={isActivePawnHome}
            className={`text-[10px] md:text-xs px-2 py-1 min-h-9 rounded-lg border transition-colors cursor-pointer font-semibold flex items-center gap-1 disabled:cursor-not-allowed ${
              isActivePawnHome
                ? "border-green-700/40 text-green-400 bg-green-950/30"
                : "border-stone-700 text-stone-500 hover:text-stone-300 hover:border-stone-600"
            }`}
            title={isActivePawnHome ? "This pawn is already home" : "Solve the best route back to this pawn's home corner"}
          >
            <Home className="w-3 h-3" />
            {isActivePawnHome ? "You're home" : "Go Home"}
          </button>
          <div className="text-xs px-2 py-1 min-h-9 flex items-center bg-stone-800 rounded text-stone-400">
            Turns:
            <select
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value))}
              className="ml-1 bg-stone-900 border border-stone-700 text-stone-200 rounded text-xs focus:outline-none cursor-pointer py-1"
            >
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
            </select>
          </div>
        </div>
      </div>

      {showOneMoveTargets && (
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
            Reachable in 1 Turn ({oneMoveTargets.length})
          </div>
          {oneMoveTargets.length === 0 ? (
            <p className="text-[10px] text-stone-600 italic">None found with current board state</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {oneMoveTargets.map(t => (
                <button
                  key={t.id}
                  onClick={() => onSelectTargetTreasure(activePawn, t.id)}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-green-950/60 border border-green-700/40 text-green-300 hover:bg-green-900/60 hover:border-green-600/60 cursor-pointer transition-colors font-medium"
                  title={`Set ${t.name} as target`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="p-4 app-surface flex items-center justify-between text-left">
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
                  {customTargetCoords.r === DEFAULT_PAWN_POSITIONS[activePawn]?.r &&
                  customTargetCoords.c === DEFAULT_PAWN_POSITIONS[activePawn]?.c
                    ? "Home Corner"
                    : `Custom Target (${customTargetCoords.r}, ${customTargetCoords.c})`}
                  <button onClick={() => setCustomTargetCoords(null)} className="text-stone-500 hover:text-stone-300 text-xs ml-1 underline cursor-pointer" title="Clear Custom Target">(clear)</button>
                </span>
              ) : playerActiveTargets[activePawn] ? (
                <span className="text-theme-primary font-bold text-xs flex items-center gap-1">
                  {TREASURES.find(t => t.id === playerActiveTargets[activePawn])?.name ?? playerActiveTargets[activePawn]}
                  <button onClick={() => onSelectTargetTreasure(activePawn, null)} className="text-stone-500 hover:text-stone-300 text-xs ml-1 underline cursor-pointer" title="Clear target">(clear)</button>
                </span>
              ) : (
                <span className="text-stone-500 text-xs italic">Click a treasure on the board</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <div className="text-[10px] text-stone-500">Spare Tile</div>
          <Tile
            tile={{ ...spareTile, rotation: stagedArrow ? stagedRotation : spareTile.rotation }}
            disabled
            className="w-16 h-16 md:w-20 md:h-20 border-theme-primary-40"
          />
          {stagedArrow ? (
            <div className="flex flex-col items-center gap-1 mt-0.5">
              <button
                onClick={onRotateStaged}
                className="text-[10px] text-theme-primary hover:text-stone-200 flex items-center gap-0.5 cursor-pointer transition-colors"
                title="Rotate staged spare tile 90° clockwise (or click the staged arrow on the board)"
              >
                <RotateCw className="w-3 h-3" /> {stagedRotation}°
              </button>
            </div>
          ) : (
            <span className="text-[9px] text-stone-500 mt-0.5">{spareTile.rotation}°</span>
          )}
        </div>
      </div>

      {/* Staged slide commit / cancel */}
      {stagedArrow && turnPhase === "slide" && (
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onCommitSlide}
            className="flex-1 py-2.5 md:py-2 min-h-11 md:min-h-0 rounded-xl bg-theme-primary text-stone-950 text-sm md:text-xs font-bold hover:bg-theme-primary-hover active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" /> Slide In
          </button>
          <button
            onClick={onCancelSlide}
            className="px-4 py-2.5 md:py-2 min-h-11 md:min-h-0 rounded-xl border border-stone-700 text-stone-400 text-sm md:text-xs hover:text-stone-200 hover:border-stone-600 active:scale-[0.98] transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

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
                className={`relative p-4 pl-11 rounded-xl transition-all flex items-start justify-between cursor-pointer group gap-3 ${
                  index === 0 && !isFallback
                    ? "app-surface-accent hover:border-theme-primary"
                    : "app-surface hover:border-theme-primary-40"
                } ${isFallback ? "opacity-75 hover:opacity-100" : ""}`}
              >
                {/* Rank chip */}
                <span
                  className={`absolute left-3 top-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm ${
                    index === 0 && !isFallback
                      ? "bg-theme-primary text-stone-950"
                      : "bg-theme-primary-10 text-theme-primary border border-theme-primary-20"
                  }`}
                >
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold flex items-center gap-1.5">
                    {isFallback ? (
                      <span className="text-amber-500 font-bold">Fallback Setup</span>
                    ) : (
                      <span className="text-green-500 font-bold">Direct Route</span>
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
                        const totalMoves = sol.reduce((sum: number, step: SolverSolutionStep) => {
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
                  <div className="text-xs md:text-[13px] font-medium text-stone-100 mt-1 font-mono leading-relaxed">
                    {sol.explanation?.slide}
                  </div>
                  <div className="text-xs md:text-[13px] text-stone-400 mt-1 leading-relaxed">
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
                  className="bg-theme-primary-10 group-hover:bg-theme-primary text-theme-primary group-hover:text-stone-950 border border-theme-primary-20 group-hover:border-transparent font-semibold text-xs px-3 py-1.5 min-h-11 md:min-h-9 rounded-lg active:scale-[0.98] transition-all flex-shrink-0 self-center"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PAWNS.filter((p) => activePlayers.includes(p.id)).map((p) => (
            <Button
              key={p.id}
              variant={activePawn === p.id ? "default" : "outline"}
              onClick={() => { if (!isMuted) playClickSound(); setActivePawn(p.id); }}
              className={`border-stone-800 h-11 md:h-9 active:scale-[0.98] transition-all ${activePawn === p.id ? p.colorClass + " text-stone-950 font-bold" : "hover:bg-stone-900 text-stone-200"}`}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
