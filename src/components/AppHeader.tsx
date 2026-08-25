import { useState } from "react";
import type { TileData, PlayerMap, HistoryRecord, UITheme } from "../types";
import { PAWNS, TREASURES } from "../constants";
import { Button } from "./ui/button";
import { Tooltip } from "./ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { SettingsDialog } from "./modals/SettingsDialog";
import { cn } from "../lib/utils";
import { playClickSound } from "../utils/audio";
import {
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  RotateCw,
  Layers,
  Play,
  Unlock,
  Settings2,
  HelpCircle,
  Clock,
  BarChart2,
  Sparkles,
  LayoutGrid,
} from "lucide-react";

export interface AppHeaderProps {
  isGameStarted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isMuted: boolean;
  showStats: boolean;
  baseTheme: "dark" | "light";
  uiTheme?: UITheme;
  onSetUiTheme?: (theme: UITheme) => void;
  activePlayers: string[];
  activePawn: string;
  looseTiles: TileData[];
  canStartGame: boolean;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  isSettingsOpen: boolean;
  playerHands: PlayerMap<string[]>;
  obtainedTreasures: PlayerMap<string[]>;
  compact?: boolean;
  gameMode?: "standard" | "coop" | "auto";
  autoPlayPaused?: boolean;
  onToggleAutoPlayPause?: () => void;
  autoPlaySpeed?: 0.5 | 1 | 2 | 4;
  onSetAutoPlaySpeed?: (speed: 0.5 | 1 | 2 | 4) => void;
  onStopAutoPlay?: () => void;
  coopObtainedTreasures?: string[];
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  history?: HistoryRecord[];
  historyIndex?: number;
  onJumpToHistory?: (index: number) => void;
  onHoverHistory?: (index: number | null) => void;
  onOpenHistory?: () => void;
  onRotateBoard: () => void;
  onStartGame: () => void;
  onEndGame: () => void;
  onToggleMute: () => void;
  onSetBaseTheme: (theme: "dark" | "light") => void;
  showToast: (msg: string) => void;
  onRandomizeBoard?: () => void | Promise<void>;
  onOpenWelcomeGuide: () => void;
  elapsedTime?: string;
  isTimerPaused?: boolean;
  onToggleTimer?: () => void;
  is3D?: boolean;
  onToggle3D: () => void;
  solverDepth?: number;
  onSetSolverDepth?: (depth: number) => void;
  pawnAnimationSpeed?: number;
  onSetPawnAnimationSpeed?: (speed: number) => void;
  pawnStats?: Record<string, { tilesMoved: number; shiftsUsed: number; treasuresFound: number; totalTargets: number }>;
  totalShifts?: number;
}

const STEPS = [
  {
    id: "setup" as const,
    label: "Edit Layout",
    shortLabel: "Setup",
    icon: <Layers className="w-3.5 h-3.5" />,
  },
  {
    id: "game" as const,
    label: "Game",
    shortLabel: "Game",
    icon: <Play className="w-3.5 h-3.5" />,
  },
];

export function AppHeader({
  isGameStarted,
  canUndo,
  canRedo,
  isMuted,
  baseTheme: _baseTheme,
  uiTheme = "brutalist",
  onSetUiTheme,
  activePlayers,
  activePawn,
  looseTiles: _looseTiles,
  canStartGame,
  accentColor,
  setAccentColor,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  onUndo,
  onRedo,
  history,
  historyIndex,
  onJumpToHistory,
  onHoverHistory,
  onOpenHistory,
  onRotateBoard,
  onStartGame,
  onEndGame,
  onToggleMute,
  onSetBaseTheme,
  showToast: _showToast,
  playerHands,
  obtainedTreasures,
  onRandomizeBoard: _onRandomizeBoard,
  onOpenWelcomeGuide,
  elapsedTime,
  isTimerPaused = false,
  onToggleTimer,
  is3D: _is3D,
  onToggle3D: _onToggle3D,
  solverDepth,
  onSetSolverDepth,
  pawnAnimationSpeed,
  onSetPawnAnimationSpeed,
  pawnStats = {},
  totalShifts = 0,
  gameMode = "standard",
  autoPlayPaused = false,
  onToggleAutoPlayPause,
  autoPlaySpeed = 1,
  onSetAutoPlaySpeed,
  onStopAutoPlay,
  coopObtainedTreasures = [],
}: AppHeaderProps) {
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  const currentStep = isGameStarted ? "game" : "setup";
  const isSimplistic = uiTheme === "simplistic";

  const iconBtnCls = isSimplistic
    ? "bg-card text-foreground border border-border w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-all hover:bg-stone-800/40 hover:text-foreground active:scale-95 shadow-none"
    : "neo-brutalism-button bg-card text-foreground w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-stone-200 hover:text-stone-950";

  return (
    <>
      <header
        className={cn(
          "relative z-40 px-3 sm:px-4 py-2 flex items-center justify-between bg-card gap-2 sm:gap-3 transition-colors",
          isSimplistic ? "border-b border-border shadow-xs" : "border-b-2 border-stone-950"
        )}
        style={isSimplistic ? undefined : { boxShadow: "0 3px 0 0 #000000" }}
      >
        {/* Left — title linking to GitHub */}
        <Tooltip content="Labyrinth Companion & Solver — View on GitHub" side="bottom-left">
          <a
            href="https://github.com/JLeshnick/Labyrinth-Game-Solver"
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "shrink-0 select-none cursor-pointer transition-all",
              isSimplistic
                ? "flex items-center gap-2.5 px-1 py-0.5 group"
                : "neo-brutalism-card px-2.5 py-1 rounded-lg bg-card hover:bg-stone-200 hover:text-stone-950"
            )}
          >
            {isSimplistic ? (
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-theme-primary/10 border border-theme-primary/30 flex items-center justify-center text-theme-primary group-hover:scale-105 transition-transform">
                  <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
                </div>
                <div>
                  <div className="font-extrabold text-[13px] tracking-tight text-foreground leading-none">
                    Labyrinth <span className="text-theme-primary">Solver</span>
                  </div>
                  <div className="text-[9.5px] text-muted-foreground tracking-normal font-medium leading-tight hidden sm:block">
                    Studio Edition
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-xs sm:text-sm font-black tracking-tight text-foreground uppercase select-none">
                <span className="hidden sm:inline">Labyrinth <span className="text-theme-primary">Solver</span></span>
                <span className="sm:hidden">Labyrinth</span>
              </span>
            )}
          </a>
        </Tooltip>

        {/* Center — Step Nav (timer integrated in Game button) */}
        <div className="flex-1 flex items-center justify-center min-w-0 gap-2">
          <div
            className={cn(
              "flex items-center bg-card rounded-xl px-1 py-0.5 sm:p-1 gap-1",
              isSimplistic
                ? "border border-border bg-stone-900/30 dark:bg-stone-900/40 p-1 rounded-lg shadow-xs"
                : "neo-brutalism-card"
            )}
          >
            {STEPS.map((s) => {
              const isActive = s.id === currentStep;
              const isDisabled = s.id === "game" && !isGameStarted && !canStartGame;
              const showTimer = s.id === "game" && isActive && elapsedTime;
              return (
                <Tooltip
                  key={s.id}
                  content={
                    isDisabled ? "Place all 33 movable tiles first" :
                    showTimer ? (isTimerPaused ? "Resume timer" : "Pause timer") :
                    undefined
                  }
                  side="bottom"
                >
                  <button
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      if (showTimer && onToggleTimer) {
                        onToggleTimer();
                      } else if (s.id === "game" && !isGameStarted) {
                        onStartGame();
                      } else if (s.id === "setup" && isGameStarted) {
                        setShowEndGameConfirm(true);
                      }
                    }}
                    className={cn(
                      "flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all",
                      isSimplistic
                        ? isActive
                          ? "bg-theme-primary text-stone-950 shadow-xs border border-theme-primary"
                          : isDisabled
                          ? "text-stone-600 cursor-not-allowed border border-transparent"
                          : "text-muted-foreground hover:text-foreground hover:bg-stone-800/40 cursor-pointer border border-transparent"
                        : isActive
                        ? "bg-theme-primary text-stone-950 border-2 border-stone-950 shadow-[2px_2px_0_0_#000000]"
                        : isDisabled
                        ? "text-stone-600 border-2 border-transparent cursor-not-allowed"
                        : "text-stone-400 border-2 border-transparent hover:text-stone-200 hover:bg-stone-900/40 cursor-pointer"
                    )}
                  >
                    {s.icon}
                    <span className="hidden xs:inline sm:hidden">{s.shortLabel}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="xs:hidden">{s.shortLabel}</span>
                    {showTimer && (
                      <span className="font-mono text-[10px] opacity-80 ml-1">
                        {isTimerPaused ? "⏸" : "⏱"} {elapsedTime}
                      </span>
                    )}
                  </button>
                </Tooltip>
              );
            })}
          </div>

          {/* Ribbon Auto-Play Controls */}
          {isGameStarted && gameMode === "auto" && (
            <div className="flex items-center gap-1 bg-card neo-brutalism-card rounded-xl px-1.5 py-1 border-2 border-stone-950 shadow-[2px_2px_0_0_#000000] shrink-0">
              <button
                title={autoPlayPaused ? "Resume Auto Play" : "Pause Auto Play"}
                onClick={() => {
                  if (!isMuted) playClickSound();
                  onToggleAutoPlayPause?.();
                }}
                className="neo-brutalism-button bg-theme-primary border-stone-950 text-stone-950 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black cursor-pointer"
              >
                {autoPlayPaused ? "▶" : "⏸"}
              </button>

              <div className="w-px h-4 bg-stone-800 mx-0.5" />

              <div className="flex items-center gap-0.5">
                {([0.5, 1, 2, 4] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      onSetAutoPlaySpeed?.(s);
                    }}
                    className={`px-1 py-0.5 rounded text-[9px] font-black border border-stone-950 cursor-pointer transition-all ${
                      autoPlaySpeed === s
                        ? "bg-theme-primary text-stone-950 shadow-[1px_1px_0_0_#000000]"
                        : "bg-stone-900 text-stone-300 hover:bg-stone-800"
                    }`}
                  >
                    {s}×
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-stone-800 mx-0.5" />

              <button
                title="Exit Auto Mode"
                onClick={() => {
                  if (!isMuted) playClickSound();
                  onStopAutoPlay?.();
                }}
                className="neo-brutalism-button bg-red-500 border-stone-950 text-stone-950 px-1.5 h-7 rounded-lg text-[9px] font-black cursor-pointer whitespace-nowrap"
              >
                ✕ Exit
              </button>
            </div>
          )}
        </div>

        {/* Right — toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">



          {/* Pawn score chips — only during game */}
          {isGameStarted && activePlayers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              {(gameMode === "coop" || gameMode === "auto") && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border-2 border-stone-950 bg-theme-primary text-stone-950 shadow-[2px_2px_0_0_#000000] cursor-default mr-1">
                  <span>{gameMode === "auto" ? "AUTO" : "CO-OP"}: {coopObtainedTreasures.length}/24</span>
                </div>
              )}
              {activePlayers.map((pawnId) => {
                const pawn = PAWNS.find((p) => p.id === pawnId);
                const isSharedPool = gameMode === "coop" || gameMode === "auto";
                const obtained = isSharedPool ? [] : (obtainedTreasures as Record<string, string[]>)[pawnId] ?? [];
                const hand = isSharedPool ? [] : (playerHands as Record<string, string[]>)[pawnId] ?? [];
                const total = obtained.length + hand.length;
                const isActive = pawnId === activePawn;
                return (
                  <div key={pawnId} className="relative group">
                    <div
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black border-2 border-stone-950 cursor-default transition-all",
                        isActive
                          ? "shadow-[2px_2px_0_0_#000000] translate-x-[-1px] translate-y-[-1px]"
                          : "shadow-[1px_1px_0_0_#000000] opacity-60",
                        pawn?.colorClass ?? "bg-stone-500",
                        pawnId === "yellow" ? "text-stone-950" : "text-white"
                      )}
                    >
                      {isSharedPool ? (
                        <span>{pawnId[0].toUpperCase()}</span>
                      ) : (
                        <>
                          <span>{obtained.length}</span>
                          {total > 0 && <span className="opacity-70">/{total}</span>}
                        </>
                      )}
                    </div>
                    {/* Hover tooltip — styled, matching existing card */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl app-dialog-panel neo-brutalism-card p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 flex flex-col gap-1 pointer-events-none">
                      <div className="text-[10px] font-bold text-stone-200 capitalize border-b border-stone-800 pb-1.5 mb-0.5 flex items-center gap-1.5">
                        <div className={cn("w-3 h-3 rounded-full border border-stone-950", pawn?.colorClass ?? "bg-stone-500")} />
                        {pawn?.name ?? pawnId} {gameMode === "auto" ? "(Auto Mode)" : gameMode === "coop" ? "(Cooperative)" : `— ${obtained.length} collected`}
                      </div>
                      {isSharedPool ? (
                        <p className="text-[9px] text-stone-300">
                          Team progress: {coopObtainedTreasures.length} of 24 treasures collected.
                        </p>
                      ) : (
                        <>
                          {obtained.length === 0 && hand.length === 0 && (
                            <p className="text-[9px] text-stone-600 italic">No cards assigned</p>
                          )}
                          {obtained.map((id) => {
                            const t = TREASURES.find((x) => x.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1.5">
                                <span className="text-emerald-400 text-[9px] flex-shrink-0">✓</span>
                                <span className="text-[9px] text-emerald-300 line-through opacity-75">{t?.name ?? id}</span>
                              </div>
                            );
                          })}
                          {hand.map((id, i) => {
                            const t = TREASURES.find((x) => x.id === id);
                            return (
                              <div key={id} className="flex items-center gap-1.5">
                                <span className={cn("text-[9px] flex-shrink-0", i === 0 ? "text-amber-400" : "text-stone-600")}>
                                  {i === 0 ? "▶" : "·"}
                                </span>
                                <span className={cn("text-[9px]", i === 0 ? "text-amber-200 font-medium" : "text-stone-500")}>
                                  {t?.name ?? id}{i === 0 ? " ← next" : ""}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
              <div className="w-px h-4 bg-stone-800 mx-0.5" />
            </div>
          )}

          {/* Tablet/desktop actions toolbar — visible at md+ */}
          <div className="hidden md:flex items-center gap-1.5">
            <Tooltip
              content={
                <div 
                  className="flex flex-col min-w-[140px] pointer-events-auto"
                  onMouseLeave={() => {
                    if (onHoverHistory) onHoverHistory(null);
                  }}
                >
                  <div className="font-bold border-b border-stone-700 pb-1 mb-1 text-stone-200 flex justify-between items-center gap-4">
                    <span>Undo</span>
                    <span className="text-stone-500 font-normal text-[9px]">Ctrl+Z</span>
                  </div>
                  {(!history || historyIndex === undefined || historyIndex <= 0) ? (
                    <div className="text-stone-500 italic text-[10px] py-1">Nothing to undo</div>
                  ) : (
                    <div className="flex flex-col max-h-[150px] overflow-y-auto overflow-x-hidden mt-0.5 w-full">
                      {Array.from({ length: Math.min(5, historyIndex) }).map((_, i) => {
                        const targetIdx = historyIndex - 1 - i;
                        const actionRecord = history[historyIndex - i];
                        const label = actionRecord?.label || `Move ${historyIndex - i}`;
                        return (
                          <button
                            key={targetIdx}
                            onClick={() => {
                              if (!isMuted) playClickSound();
                              if (onJumpToHistory) onJumpToHistory(targetIdx);
                            }}
                            onMouseEnter={() => {
                              if (onHoverHistory) onHoverHistory(targetIdx);
                            }}
                            className="text-left text-[11px] px-2 py-1.5 rounded transition-all duration-200 cursor-pointer flex items-center gap-1.5 relative overflow-hidden group w-full text-stone-300 hover:text-theme-primary"
                          >
                            <div className="absolute inset-y-0 left-0 bg-theme-primary/20 w-0 group-hover:w-full transition-all duration-300 ease-out z-0 rounded"></div>
                            <span className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">→</span>
                            <span className="relative z-10 whitespace-nowrap transition-transform duration-300 ease-out group-hover:translate-x-0.5">{label}</span>
                          </button>
                        );
                      })}
                      {historyIndex > 5 && (
                        <div className="text-stone-500 italic text-[9px] px-2 py-1 border-t border-stone-800/50 mt-1">
                          +{historyIndex - 5} older action(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
              side="bottom"
            >
              <Button
                variant="outline" size="icon"
                disabled={!canUndo}
                onClick={() => { if (!isMuted) playClickSound(); onUndo(); }}
                className={cn(iconBtnCls, "disabled:opacity-30 disabled:pointer-events-none")}
                aria-label="Undo"
              >
                <Undo2 className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>
            
            <Tooltip
              content={
                <div 
                  className="flex flex-col min-w-[140px] pointer-events-auto"
                  onMouseLeave={() => {
                    if (onHoverHistory) onHoverHistory(null);
                  }}
                >
                  <div className="font-bold border-b border-stone-700 pb-1 mb-1 text-stone-200 flex justify-between items-center gap-4">
                    <span>Redo</span>
                    <span className="text-stone-500 font-normal text-[9px]">Ctrl+Y</span>
                  </div>
                  {(!history || historyIndex === undefined || historyIndex >= history.length - 1) ? (
                    <div className="text-stone-500 italic text-[10px] py-1">Nothing to redo</div>
                  ) : (
                    <div className="flex flex-col max-h-[150px] overflow-y-auto overflow-x-hidden mt-0.5 w-full">
                      {Array.from({ length: Math.min(5, history.length - 1 - historyIndex) }).map((_, i) => {
                        const targetIdx = historyIndex + 1 + i;
                        const actionRecord = history[targetIdx];
                        const label = actionRecord?.label || `Move ${targetIdx}`;
                        return (
                          <button
                            key={targetIdx}
                            onClick={() => {
                              if (!isMuted) playClickSound();
                              if (onJumpToHistory) onJumpToHistory(targetIdx);
                            }}
                            onMouseEnter={() => {
                              if (onHoverHistory) onHoverHistory(targetIdx);
                            }}
                            className="text-left text-[11px] px-2 py-1.5 rounded transition-all duration-200 cursor-pointer flex items-center gap-1.5 relative overflow-hidden group w-full text-stone-300 hover:text-theme-primary"
                          >
                            <div className="absolute inset-y-0 left-0 bg-theme-primary/20 w-0 group-hover:w-full transition-all duration-300 ease-out z-0 rounded"></div>
                            <span className="relative z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0">→</span>
                            <span className="relative z-10 whitespace-nowrap transition-transform duration-300 ease-out group-hover:translate-x-0.5">{label}</span>
                          </button>
                        );
                      })}
                      {(history.length - 1 - historyIndex) > 5 && (
                        <div className="text-stone-500 italic text-[9px] px-2 py-1 border-t border-stone-800/50 mt-1">
                          +{(history.length - 1 - historyIndex) - 5} newer action(s)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              }
              side="bottom"
            >
              <Button
                variant="outline" size="icon"
                disabled={!canRedo}
                onClick={() => { if (!isMuted) playClickSound(); onRedo(); }}
                className={cn(iconBtnCls, "disabled:opacity-30 disabled:pointer-events-none")}
                aria-label="Redo"
              >
                <Redo2 className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>
            {isGameStarted && onOpenHistory && (
              <Tooltip content="Move History" side="bottom">
                <Button
                  variant="outline" size="icon"
                  onClick={() => { if (!isMuted) playClickSound(); onOpenHistory(); }}
                  className={iconBtnCls}
                  aria-label="View move history"
                >
                  <Clock className="w-3.5 h-3.5" />
                </Button>
              </Tooltip>
            )}
            <div className="w-px h-4 bg-stone-800 mx-0.5" />
            <Tooltip content="Rotate Board 90°" side="bottom">
              <Button
                variant="outline" size="icon"
                onClick={() => { if (!isMuted) playClickSound(); onRotateBoard(); }}
                className={iconBtnCls}
                aria-label="Rotate board perspective 90 degrees clockwise"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </Button>
            </Tooltip>
            {isGameStarted && (
              <>
                <div className="w-px h-4 bg-stone-800 mx-0.5" />
                <div className="relative group">
                  <Button
                    variant="outline" size="icon"
                    className={cn(iconBtnCls, "cursor-default")}
                    aria-label="Game statistics"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </Button>

                  {/* Hover Tooltip Dropdown for Game Stats */}
                  <div className="absolute top-full right-0 mt-2 w-64 rounded-xl app-dialog-panel neo-brutalism-card p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 flex flex-col gap-2.5 pointer-events-none">
                    <div className="text-xs font-bold text-stone-200 border-b border-stone-800 pb-1.5 flex items-center gap-1.5">
                      <BarChart2 className="w-3.5 h-3.5 text-theme-primary" />
                      Game Statistics
                    </div>
                    {/* Summary stats */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="app-surface p-1.5 rounded-lg">
                        <div className="text-sm font-black text-stone-100">{totalShifts}</div>
                        <div className="text-[9px] text-stone-400">Shifts</div>
                      </div>
                      <div className="app-surface p-1.5 rounded-lg">
                        <div className="text-sm font-black text-stone-100">
                          {Object.values(pawnStats).reduce((sum, s) => sum + s.tilesMoved, 0)}
                        </div>
                        <div className="text-[9px] text-stone-400">Moves</div>
                      </div>
                      <div className="app-surface p-1.5 rounded-lg">
                        <div className="text-sm font-black text-amber-400">
                          {gameMode === "coop" || gameMode === "auto"
                            ? coopObtainedTreasures.length
                            : Object.values(obtainedTreasures).reduce((sum, arr) => sum + arr.length, 0)}
                        </div>
                        <div className="text-[9px] text-stone-400">Found</div>
                      </div>
                    </div>

                    {/* Active players breakdown */}
                    <div className="space-y-1">
                      {activePlayers.map((color) => {
                        const pawn = PAWNS.find((p) => p.id === color);
                        const stats = pawnStats[color] || { tilesMoved: 0, shiftsUsed: 0, treasuresFound: 0, totalTargets: 0 };
                        const collected = gameMode === "coop" || gameMode === "auto" ? coopObtainedTreasures.length : (obtainedTreasures[color]?.length ?? 0);
                        return (
                          <div key={color} className="app-surface p-1.5 rounded-lg flex items-center justify-between text-[10px]">
                            <div className="flex items-center gap-1.5">
                              <div className={cn("w-2.5 h-2.5 rounded-full border border-stone-950", pawn?.colorClass ?? "bg-stone-500")} />
                              <span className="font-bold text-stone-200 capitalize">{pawn?.name ?? color}</span>
                            </div>
                            <div className="text-stone-400 font-mono">
                              {stats.tilesMoved} moves • {stats.shiftsUsed} shifts ({collected} found)
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
            <div className="w-px h-4 bg-stone-800 mx-0.5" />
            <Tooltip content={isMuted ? "Unmute audio" : "Mute audio"} side="bottom">
              <Button
                variant="outline" size="icon"
                onClick={() => { if (!isMuted) playClickSound(); onToggleMute(); }}
                className={iconBtnCls}
                aria-label={isMuted ? "Unmute audio" : "Mute audio"}
              >
                {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </Button>
            </Tooltip>
          </div>

          {onSetUiTheme && (
            <Tooltip content={isSimplistic ? "Switch to Neo-Brutalist Theme" : "Switch to Simplistic Studio Theme"} side="bottom">
              <Button
                variant="outline" size="icon"
                onClick={() => {
                  if (!isMuted) playClickSound();
                  onSetUiTheme(isSimplistic ? "brutalist" : "simplistic");
                }}
                className={cn(iconBtnCls, "shrink-0")}
                aria-label="Toggle UI Theme Style"
              >
                {isSimplistic ? <LayoutGrid className="w-3.5 h-3.5 text-theme-primary" /> : <Sparkles className="w-3.5 h-3.5" />}
              </Button>
            </Tooltip>
          )}

          <Tooltip content="Settings" side="bottom">
            <Button
              variant="outline" size="icon"
              onClick={() => { if (!isMuted) playClickSound(); onOpenSettings(); }}
              className={cn(iconBtnCls, "shrink-0")}
              aria-label="Open settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
          </Tooltip>

          <Tooltip content="How to play" side="bottom-right">
            <Button
              variant="outline" size="icon"
              onClick={() => { if (!isMuted) playClickSound(); onOpenWelcomeGuide(); }}
              className={cn(iconBtnCls, "shrink-0")}
              aria-label="Open the how-to-play guide"
            >
              <HelpCircle className="w-3.5 h-3.5" />
            </Button>
          </Tooltip>

          <SettingsDialog
            open={isSettingsOpen}
            onOpenChange={(open: boolean) => {
              if (open) onOpenSettings();
              else onCloseSettings();
            }}
            isMuted={isMuted}
            onToggleMute={() => {
              if (!isMuted) playClickSound();
              onToggleMute();
            }}
            baseTheme={_baseTheme}
            setBaseTheme={onSetBaseTheme}
            uiTheme={uiTheme}
            setUiTheme={onSetUiTheme}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            is3D={_is3D}
            onToggle3D={_onToggle3D}
            solverDepth={solverDepth}
            onSetSolverDepth={onSetSolverDepth}
            pawnAnimationSpeed={pawnAnimationSpeed}
            onSetPawnAnimationSpeed={onSetPawnAnimationSpeed}
          />
        </div>
      </header>

      {/* End Game confirmation dialog */}
      <Dialog
        open={showEndGameConfirm}
        onOpenChange={(open) => { if (!open) setShowEndGameConfirm(false); }}
      >
        <DialogContent
          className="sm:max-w-[360px] text-stone-100 p-6 rounded-xl"
          onKeyDown={(e) => { if (e.key === " ") e.stopPropagation(); }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-400" />
              End Game?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-400 mt-2 leading-relaxed">
            This will end the current game and return to board setup. Your game progress will not be saved automatically.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="brutalist" onClick={() => setShowEndGameConfirm(false)} className="rounded-lg">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!isMuted) playClickSound();
                setShowEndGameConfirm(false);
                onEndGame();
              }}
              className="rounded-lg neo-brutalism-button"
            >
              End Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
