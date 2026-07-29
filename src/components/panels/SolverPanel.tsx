// Responsive model: this panel renders in two DOM sites — the phone bottom
// sheet (< md) and the tablet/desktop side column (md+). Unprefixed classes
// target the phone sheet; `md:` targets the tablet column; `lg:` targets the
// wider desktop column. Interactive play controls get a 44px phone floor.
import { useState } from "react";
import { Sparkles, ArrowRightCircle, MousePointer2, RotateCw, Home, Gauge } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import { Tile } from "../board/Tile";
import { PAWNS, TREASURES, DEFAULT_PAWN_POSITIONS } from "../../constants";
import { playClickSound } from "../../utils/audio";
import type { TileData, SolverSolution } from "../../types";

interface SolverPanelProps {
  solutions: SolverSolution[];
  isLoadingSolutions: boolean;
  hoveredSolution: SolverSolution | null;
  setHoveredSolution: (sol: SolverSolution | null) => void;
  lockedScoreBreakdownSolution?: SolverSolution | null;
  setLockedScoreBreakdownSolution?: (sol: SolverSolution | null) => void;
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
  gameMode?: "standard" | "coop" | "auto";
  remainingCoopTreasures?: string[];
  grid?: (TileData | null)[][];
  showEmptyTiles?: boolean;
  setShowEmptyTiles?: (show: boolean) => void;
}
 
export function SolverPanel({
  solutions,
  isLoadingSolutions,
  hoveredSolution: _hoveredSolution,
  setHoveredSolution,
  lockedScoreBreakdownSolution,
  setLockedScoreBreakdownSolution,
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
  gameMode = "standard",
  remainingCoopTreasures = [],
  grid = [],
  showEmptyTiles = false,
  setShowEmptyTiles,
}: SolverPanelProps) {
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  const isHomeSelected = !!(customTargetCoords &&
    customTargetCoords.r === DEFAULT_PAWN_POSITIONS[activePawn]?.r &&
    customTargetCoords.c === DEFAULT_PAWN_POSITIONS[activePawn]?.c);

  // Filter solutions to only show the active target (unless no target is set, then show all)
  const currentTargetId = customTargetCoords 
    ? `coord:${customTargetCoords.r},${customTargetCoords.c}`
    : (playerActiveTargets[activePawn] || (solutions[0] ? (solutions[0] as any).cardId : null));
  const filteredSolutions = currentTargetId
    ? solutions.filter((sol) => (sol as any).cardId === currentTargetId)
    : solutions;
  const topSolution = filteredSolutions[0];

  // Key changes whenever new solutions arrive so the list re-mounts and plays the fade animation
  const solutionsKey = filteredSolutions.length + "-" + (currentTargetId ?? "") + "-" + activePawn;

  if (compact) {
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
                className={`text-[10px] px-2 py-1 min-h-9 neo-brutalism-button rounded-lg border-stone-950 flex items-center gap-1 transition-all ${
                  isHomeSelected
                    ? "bg-theme-primary text-stone-950 shadow-[1px_1px_0_0_#000000] translate-x-[1px] translate-y-[1px]"
                    : "bg-card text-stone-400 hover:text-stone-200"
                }`}
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
    <div className="flex-1 flex flex-col min-h-0 gap-2 md:gap-3 p-2 md:p-3 lg:p-4">
      {gameMode === "auto" ? (
        <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 app-surface text-amber-300">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-amber-400 animate-pulse" />
          <span>Auto Mode Active — Solver is playing optimal moves</span>
        </div>
      ) : turnPhase === "move" ? (
        <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 app-surface text-green-300">
          <MousePointer2 className="w-3 h-3 shrink-0" />
          <span>Click a green cell to move your pawn</span>
        </div>
      ) : stagedArrow ? (
        <div className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 app-surface text-theme-primary">
          <ArrowRightCircle className="w-3 h-3 shrink-0" />
          <span>Arrow staged — <span className="text-stone-300 font-normal">rotate or press Slide In</span></span>
        </div>
      ) : null}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-sm font-bold text-theme-primary flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          Solver Suggestions
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCustomTargetCoords(DEFAULT_PAWN_POSITIONS[activePawn])}
            disabled={isActivePawnHome}
            className={`text-[10px] md:text-xs px-2 py-1 min-h-9 neo-brutalism-button rounded-lg font-semibold flex items-center gap-1 transition-all ${
              isActivePawnHome
                ? "border-stone-950 text-stone-500 bg-card opacity-40 cursor-not-allowed translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                : isHomeSelected
                ? "bg-theme-primary text-stone-950 border-stone-950 shadow-[1px_1px_0_0_#000000] translate-x-[1px] translate-y-[1px]"
                : "border-stone-950 bg-card text-stone-400 hover:text-stone-200 cursor-pointer"
            }`}
            title={isActivePawnHome ? "Already at home corner" : "Solve route back to home corner"}
          >
            <Home className="w-3 h-3" />
            Go Home
          </button>
          <button
            onClick={onToggleOneMoveTargets}
            className={`text-[10px] md:text-xs px-2 py-1 min-h-9 neo-brutalism-button rounded-lg cursor-pointer font-semibold ${
              showOneMoveTargets
                ? "bg-theme-primary-10 border-theme-primary text-theme-primary translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                : "border-stone-950 bg-card text-stone-400 hover:text-stone-200"
            }`}
            title="Show all treasures reachable in exactly 1 turn"
          >
            1-move targets
          </button>
        </div>
      </div>

      {showOneMoveTargets && (
        <div className="flex flex-col gap-1.5 shrink-0">
          <div className="flex items-center justify-between">
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
              Reachable in 1 Turn ({oneMoveTargets.length})
            </div>
            {setShowEmptyTiles && (
              <button
                onClick={() => setShowEmptyTiles(!showEmptyTiles)}
                className={`text-[9px] px-2 py-0.5 min-h-6 neo-brutalism-button rounded-md cursor-pointer font-semibold transition-all ${
                  showEmptyTiles
                    ? "bg-emerald-400 border-stone-950 text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                    : "border-stone-950 bg-card text-stone-400 hover:text-stone-200"
                }`}
                title="Show all navigable empty tiles"
              >
                {showEmptyTiles ? "Hide Navigable Empty Tiles" : "Show Navigable Empty Tiles"}
              </button>
            )}
          </div>
          {oneMoveTargets.length === 0 ? (
            <p className="text-[10px] text-stone-600 italic">None found with current board state</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {oneMoveTargets.map(t => {
                const isSelected = t.id === currentTargetId;
                return (
                  <button
                    key={t.id}
                    onClick={() => onSelectTargetTreasure(activePawn, t.id)}
                    className={`text-[10px] px-2 py-1 neo-brutalism-button rounded-lg border-stone-950 transition-all font-semibold cursor-pointer ${
                      isSelected
                        ? "bg-theme-primary text-stone-950 shadow-[1px_1px_0_0_#000000] translate-x-[1px] translate-y-[1px]"
                        : "bg-green-950/40 text-green-300 hover:text-green-100"
                    }`}
                    title={`Set ${t.name} as target`}
                  >
                    {t.name}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="p-4 app-surface flex items-center justify-between text-left gap-4">
        {/* Left Side: Turn & Target info */}
        <div className="flex-1 min-w-0 flex flex-col gap-2.5">
          <div className="flex items-center gap-2.5">
            {/* Brutalist Pawn Theme (matching game board style) */}
            <div className={`w-8 h-8 rounded-full border-2 border-stone-950 shadow-[2px_2px_0_0_#000000] flex items-center justify-center text-xs font-black capitalize relative shrink-0 ${
              activePawn === "red"
                ? "bg-red-500 text-white"
                : activePawn === "blue"
                ? "bg-blue-500 text-white"
                : activePawn === "green"
                ? "bg-emerald-500 text-white"
                : activePawn === "yellow"
                ? "bg-amber-400 text-stone-950"
                : "bg-stone-500 text-white"
            }`}>
              <span className="relative z-10">{activePawn[0].toUpperCase()}</span>
            </div>
            <div>
              <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider leading-none">Turn</div>
              <div className="text-xs font-black text-stone-100 capitalize mt-1 leading-none">{activePawn} Player</div>
            </div>
          </div>

          <div className="border-t border-stone-800/80 my-0.5"></div>

          <div>
            <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider leading-none">Target Goal</div>
            <div className="mt-1.5 flex items-center flex-wrap gap-1 leading-none">
              {customTargetCoords ? (
                <span className="text-theme-primary font-bold text-xs flex items-center gap-1">
                  🎯 {customTargetCoords.r === DEFAULT_PAWN_POSITIONS[activePawn]?.r &&
                  customTargetCoords.c === DEFAULT_PAWN_POSITIONS[activePawn]?.c
                    ? "Home Corner"
                    : `(${customTargetCoords.r}, ${customTargetCoords.c})${grid[customTargetCoords.r]?.[customTargetCoords.c]?.treasure ? ` — ${grid[customTargetCoords.r][customTargetCoords.c]!.treasure!.name}` : ""}`}
                  <button onClick={() => setCustomTargetCoords(null)} className="text-stone-500 hover:text-stone-300 text-[10px] ml-1 underline cursor-pointer" title="Clear Custom Target">(clear)</button>
                </span>
              ) : currentTargetId ? (
                <span className="text-theme-primary font-bold text-xs flex items-center gap-1">
                  {currentTargetId.startsWith("coord:") ? "🎯" : "🏆"} {currentTargetId.startsWith("coord:") ? `Cell (${currentTargetId.substring(6)})` : (TREASURES.find(t => t.id === currentTargetId)?.name ?? currentTargetId)}
                  <button onClick={() => {
                    if (setCustomTargetCoords && customTargetCoords) {
                      setCustomTargetCoords(null);
                    } else {
                      onSelectTargetTreasure(activePawn, null);
                    }
                  }} className="text-stone-500 hover:text-stone-300 text-[10px] ml-1 underline cursor-pointer" title="Clear target">(clear)</button>
                </span>
              ) : gameMode === "coop" || gameMode === "auto" ? (
                <span className="text-theme-primary font-bold text-xs">
                  ✨ {remainingCoopTreasures && remainingCoopTreasures.length > 0 ? (
                    currentTargetId ? (
                      `Optimal: ${TREASURES.find(t => t.id === currentTargetId)?.name ?? currentTargetId} (Auto)`
                    ) : (
                      "Optimal Global Path (Auto)"
                    )
                  ) : (
                    "Home Corner (Auto)"
                  )}
                </span>
              ) : (
                <span className="text-stone-550 text-xs italic">Click any board tile to select target</span>
              )}
            </div>
          </div>
        </div>

        {/* Vertical Divider */}
        <div className="w-[1px] self-stretch bg-stone-850/60 shrink-0 my-0.5"></div>

        {/* Right Side: Spare Tile */}
        <div className="flex flex-col items-center gap-1.5 shrink-0">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-wider leading-none">Spare Tile</div>
          <div className="mt-1">
            <Tile
              tile={{ ...spareTile, rotation: stagedArrow ? stagedRotation : spareTile.rotation }}
              className="w-14 h-14 md:w-16 md:h-16 border-theme-primary-40"
            />
          </div>
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
            className="flex-1 py-2.5 md:py-2 min-h-11 md:min-h-0 neo-brutalism-button rounded-xl bg-theme-primary border-stone-950 text-stone-950 text-sm md:text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowRightCircle className="w-3.5 h-3.5" /> Slide In
          </button>
          <button
            onClick={onCancelSlide}
            className="px-4 py-2.5 md:py-2 min-h-11 md:min-h-0 neo-brutalism-button rounded-xl border-stone-950 bg-card text-stone-400 text-sm md:text-xs hover:text-stone-200 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      <div key={solutionsKey} className="flex-1 overflow-y-auto min-h-0 pl-1.5 pr-2 pt-1.5 pb-2 flex flex-col gap-2">
        {isLoadingSolutions ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-500 gap-2 animate-fade-in">
            <div className="animate-spin h-5 w-5 border-2 border-stone-950 border-t-theme-primary rounded-sm" />
            Computing paths...
          </div>
        ) : filteredSolutions.length > 0 ? (
          (() => {
            const visibleSolutions = showAllSuggestions ? filteredSolutions : filteredSolutions.slice(0, 5);
            return (
              <div className="flex flex-col gap-2 animate-fade-in">
                <div className="text-[10px] text-stone-550 px-1 mb-1 italic flex items-center justify-between flex-wrap gap-2">
                  
                  <span>Ranked by: Turn depth, walk spaces, safety</span>
                  <button
                    onClick={() => { if (!isMuted) playClickSound(); setShowAllSuggestions(!showAllSuggestions); }}
                    className={`px-2.5 py-1 rounded-lg border-2 border-stone-950 font-black shadow-[1.5px_1.5px_0_0_#000000] cursor-pointer text-[9px] uppercase tracking-wide leading-none transition-transform hover:-translate-y-0.5 ${
                      showAllSuggestions
                        ? "bg-theme-primary text-stone-950"
                        : "bg-card text-stone-400 hover:text-stone-200"
                    }`}
                  >
                    {showAllSuggestions ? "Show Top 5" : `Show All (${filteredSolutions.length})`}
                  </button>
                </div>
                {visibleSolutions.map((sol, index) => {
                  const isFallback = sol.isFallback;
                  let walkDist = 0;
                  for (const step of sol) {
                    if (step.pawnPath) walkDist += step.pawnPath.length - 1;
                  }
                  const algScoreValue = sol.algorithmScore !== undefined ? Math.round(sol.algorithmScore) : (sol.safetyScore !== undefined ? Math.round(sol.safetyScore) : null);

                  return (
                    <div
                      key={index}
                      onMouseEnter={() => setHoveredSolution(sol)}
                      onMouseLeave={() => {
                        setHoveredSolution(null);
                        if (setLockedScoreBreakdownSolution && lockedScoreBreakdownSolution === sol) {
                          setLockedScoreBreakdownSolution(null);
                        }
                      }}
                      className={`relative p-2.5 pl-10 rounded-xl transition-all flex items-start justify-between cursor-pointer group gap-2 hover:z-30 ${
                        index === 0 && !isFallback
                          ? "app-surface-accent hover:border-theme-primary"
                          : "app-surface hover:border-theme-primary-40"
                      } ${isFallback ? "opacity-75 hover:opacity-100" : ""}`}
                    >
                      {/* Rank chip */}
                      <span
                        className={`absolute left-2.5 top-2.5 w-6 h-6 rounded-lg flex items-center justify-center text-xs font-black border-2 border-stone-950 shadow-[1.5px_1.5px_0_0_#000000] z-10 ${
                          index === 0 && !isFallback
                            ? "bg-theme-primary text-stone-950"
                            : "bg-card text-stone-100"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold flex items-center gap-2 flex-wrap">
                          {isFallback ? (
                            <span className="px-1.5 py-0.5 rounded-lg bg-amber-400 text-stone-950 text-[10px] font-black border-2 border-stone-950 shadow-[1px_1px_0_0_#000000] flex items-center leading-none whitespace-nowrap">
                              Fallback ({sol.length}t)
                            </span>
                          ) : sol.length === 1 ? (
                            <span className="px-1.5 py-0.5 rounded-lg bg-emerald-400 text-stone-950 text-[10px] font-black border-2 border-stone-950 shadow-[1px_1px_0_0_#000000] flex items-center leading-none whitespace-nowrap">
                              Direct (1 turn)
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded-lg bg-blue-400 text-stone-950 text-[10px] font-black border-2 border-stone-950 shadow-[1px_1px_0_0_#000000] flex items-center leading-none whitespace-nowrap">
                              Multi ({sol.length} turns)
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded-lg bg-card text-stone-100 text-[10px] font-black border-2 border-stone-950 shadow-[1px_1px_0_0_#000000] flex items-center leading-none whitespace-nowrap">
                            {walkDist}sp
                          </span>
                          {algScoreValue !== null && (
                            <Tooltip
                              content={
                                <div className="text-left text-[11px] space-y-1 p-0.5">
                                  <div className="font-bold border-b border-stone-700 pb-1 text-theme-primary flex items-center justify-between">
                                    <span>Algorithm Score</span>
                                    <span className="font-mono text-stone-100">{algScoreValue}/100</span>
                                  </div>
                                  <div className="font-mono text-[10px] space-y-0.5 text-stone-300">
                                    <div>• Reachability: +{sol.scoreBreakdown?.reachabilityScore ?? 0}</div>
                                    <div>• Fixed Space Bonus: +{sol.scoreBreakdown?.fixedSpaceBonus ?? 0}</div>
                                    <div>• Tile Exits Bonus: +{sol.scoreBreakdown?.tileExitsBonus ?? 0}</div>
                                    <div>• Walk Efficiency: +{sol.scoreBreakdown?.walkBonus ?? 0}</div>
                                    {(sol.scoreBreakdown?.wrapPenalty ?? 0) > 0 && (
                                      <div className="text-red-400">• Board Wrap Penalty: -{sol.scoreBreakdown?.wrapPenalty}</div>
                                    )}
                                    {(sol.scoreBreakdown?.turnsPenalty ?? 0) > 0 && (
                                      <div className="text-red-400">• Extra Turns Penalty: -{sol.scoreBreakdown?.turnsPenalty}</div>
                                    )}
                                  </div>
                                  <div className="text-stone-400 italic text-[9px] pt-1 border-t border-stone-700/50 mt-1">
                                    Click pill to pin math to the board
                                  </div>
                                </div>
                              }
                              side="top-left"
                              containerClassName="z-[100]"
                            >
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (setLockedScoreBreakdownSolution) {
                                    setLockedScoreBreakdownSolution(lockedScoreBreakdownSolution === sol ? null : sol);
                                  }
                                }}
                                className={`px-1.5 py-0.5 rounded-lg text-stone-950 text-[10px] font-black border-2 border-stone-950 shadow-[1px_1px_0_0_#000000] flex items-center leading-none whitespace-nowrap cursor-pointer transition-transform hover:scale-105 active:scale-95 relative ${
                                  lockedScoreBreakdownSolution === sol ? "ring-2 ring-white ring-offset-2 ring-offset-stone-950 z-10" : "z-0"
                                } ${
                                  algScoreValue >= 80
                                    ? "bg-emerald-400"
                                    : algScoreValue >= 40
                                    ? "bg-amber-400"
                                    : "bg-red-500"
                                }`}
                              >
                                {algScoreValue}/100
                              </span>
                            </Tooltip>
                          )}
                        </div>
                        <div className="text-xs font-medium text-stone-100 mt-1 font-mono leading-relaxed">
                          {sol.explanation?.slide}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onExecuteSolution(sol); }}
                        className="neo-brutalism-button bg-card hover:bg-theme-primary hover:text-stone-950 text-foreground border-stone-950 font-black text-xs px-3 py-1.5 min-h-11 md:min-h-9 rounded-lg flex-shrink-0 self-center cursor-pointer"
                      >
                        Execute
                      </Button>
                    </div>
                  );
                })}
              </div>
            );
          })()
        ) : (
          <div className="flex-1 flex items-center justify-center text-stone-600 text-sm">
            No paths found. Check the selected target.
          </div>
        )}
      </div>

      <div className="shrink-0 mt-1">
        <div className="text-xs text-stone-400 mb-2 font-medium">Select Player:</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PAWNS.filter((p) => activePlayers.includes(p.id)).map((p) => (
            <Button
              key={p.id}
              variant={activePawn === p.id ? "default" : "outline"}
              onClick={() => { if (!isMuted) playClickSound(); setActivePawn(p.id); }}
              className={`neo-brutalism-button bg-card hover:bg-stone-100 hover:bg-stone-800 text-foreground border-stone-950 h-11 md:h-9 ${activePawn === p.id ? p.colorClass + " text-stone-950 font-extrabold translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]" : ""}`}
            >
              {p.name}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
