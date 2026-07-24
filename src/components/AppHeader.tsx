import { useState } from "react";
import type { TileData, PlayerMap } from "../types";
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
} from "lucide-react";

export interface AppHeaderProps {
  isGameStarted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isMuted: boolean;
  showStats: boolean;
  baseTheme: "dark" | "light";
  activePlayers: string[];
  activePawn: string;
  looseTiles: TileData[];
  canStartGame: boolean;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  isSettingsOpen: boolean;
  playerHands: PlayerMap<string[]>;
  obtainedTreasures: PlayerMap<string[]>;
  gameMode?: "standard" | "coop";
  coopObtainedTreasures?: string[];
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onOpenHistory?: () => void;
  onRotateBoard: () => void;
  onToggleStats: () => void;
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
}

const iconBtnCls =
  "neo-brutalism-button bg-card text-foreground w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer transition-all hover:bg-stone-200 hover:text-stone-950";

const STEPS = [
  {
    id: "setup" as const,
    label: "Edit Layout",
    shortLabel: "Setup",
    icon: <Layers className="w-3 h-3" />,
  },
  {
    id: "game" as const,
    label: "Game",
    shortLabel: "Game",
    icon: <Play className="w-3 h-3" />,
  },
];

export function AppHeader({
  isGameStarted,
  canUndo,
  canRedo,
  isMuted,
  showStats,
  baseTheme: _baseTheme,
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
  onOpenHistory,
  onRotateBoard,
  onToggleStats,
  onStartGame,
  onEndGame,
  onToggleMute,
  onSetBaseTheme,
  showToast: _showToast,
  playerHands,
  obtainedTreasures,
  onRandomizeBoard,
  onOpenWelcomeGuide,
  elapsedTime,
  isTimerPaused = false,
  onToggleTimer,
  is3D: _is3D,
  onToggle3D: _onToggle3D,
  solverDepth,
  onSetSolverDepth,
  gameMode = "standard",
  coopObtainedTreasures = [],
}: AppHeaderProps) {
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  const currentStep = isGameStarted ? "game" : "setup";

  return (
    <>
      <header
        className="relative z-40 px-3 sm:px-4 py-2 flex items-center justify-between border-b-2 border-stone-950 bg-card gap-2 sm:gap-3"
        style={{ boxShadow: "0 3px 0 0 #000000" }}
      >
        {/* Left — brutalist title linking to GitHub */}
        <a
          href="https://github.com/JLeshnick/Labyrinth-Game-Solver"
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 neo-brutalism-card px-2.5 py-1 rounded-lg bg-card hover:bg-stone-200 hover:text-stone-950 transition-colors cursor-pointer"
        >
          <span className="text-xs sm:text-sm font-black tracking-tight text-foreground uppercase select-none">
            <span className="hidden sm:inline">Labyrinth Solver</span>
            <span className="sm:hidden">Labyrinth</span>
          </span>
        </a>

        {/* Center — Step Nav (timer integrated in Game button) */}
        <div className="flex-1 flex items-center justify-center min-w-0 gap-2">
          <div className="flex items-center bg-card neo-brutalism-card rounded-xl px-1 py-0.5 sm:p-1 gap-1">
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
                      "flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition-all border-2",
                      isActive
                        ? "bg-theme-primary text-stone-950 border-stone-950 shadow-[2px_2px_0_0_#000000]"
                        : isDisabled
                        ? "text-stone-600 border-transparent cursor-not-allowed"
                        : "text-stone-400 border-transparent hover:text-stone-200 hover:bg-stone-900/40 cursor-pointer"
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
        </div>

        {/* Right — toolbar */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

          {/* Randomize layout (setup only, desktop) */}
          {!isGameStarted && onRandomizeBoard && (
            <Tooltip content="Randomize Board" side="bottom">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (!isMuted) playClickSound();
                  onRandomizeBoard();
                }}
                className="neo-brutalism-button bg-card border-stone-950 text-stone-400 hover:bg-stone-200 hover:text-stone-950 gap-1.5 h-8 px-2 hidden md:flex cursor-pointer"
              >
                <span className="text-xs">Randomize</span>
              </Button>
            </Tooltip>
          )}

          {/* Pawn score chips — only during game */}
          {isGameStarted && activePlayers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5">
              {gameMode === "coop" && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black border-2 border-stone-950 bg-theme-primary text-stone-950 shadow-[2px_2px_0_0_#000000] cursor-default mr-1">
                  <span>CO-OP: {coopObtainedTreasures.length}/24</span>
                </div>
              )}
              {activePlayers.map((pawnId) => {
                const pawn = PAWNS.find((p) => p.id === pawnId);
                const obtained = gameMode === "coop" ? [] : (obtainedTreasures as Record<string, string[]>)[pawnId] ?? [];
                const hand = gameMode === "coop" ? [] : (playerHands as Record<string, string[]>)[pawnId] ?? [];
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
                      {gameMode === "coop" ? (
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
                        {pawn?.name ?? pawnId} {gameMode === "coop" ? "(Cooperative)" : `— ${obtained.length} collected`}
                      </div>
                      {gameMode === "coop" ? (
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
            <Tooltip content="Undo (Ctrl+Z)" side="bottom">
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
            <Tooltip content="Redo (Ctrl+Y)" side="bottom">
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
            {isGameStarted && onToggleStats && (
              <>
                <div className="w-px h-4 bg-stone-800 mx-0.5" />
                <Tooltip content={showStats ? "Hide stats" : "Game stats"} side="bottom">
                  <Button
                    variant="outline" size="icon"
                    onClick={() => { if (!isMuted) playClickSound(); onToggleStats(); }}
                    className={cn(iconBtnCls, showStats ? "bg-theme-primary-10 text-theme-primary border-theme-primary-20" : "")}
                    aria-label="Toggle game statistics"
                  >
                    <BarChart2 className="w-3.5 h-3.5" />
                  </Button>
                </Tooltip>
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

          <Tooltip content="How to play" side="bottom">
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
            accentColor={accentColor}
            setAccentColor={setAccentColor}
            is3D={_is3D}
            onToggle3D={_onToggle3D}
            solverDepth={solverDepth}
            onSetSolverDepth={onSetSolverDepth}
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
