import { useEffect, useRef, useState, type ReactNode } from "react";
import type { TileData, PlayerMap } from "../types";
import { PAWNS, TREASURES } from "../constants";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { SettingsDialog } from "./SettingsDialog";
import { cn } from "../lib/utils";
import { playClickSound } from "../utils/audio";
import {
  Compass,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  RotateCw,
  Gauge,
  Layers,
  Play,
  Unlock,
  Menu,
  Settings2,
  HelpCircle,
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
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onRotateBoard: () => void;
  onToggleStats: () => void;
  onStartGame: () => void;
  onEndGame: () => void;
  onToggleMute: () => void;
  onSetBaseTheme: (theme: "dark" | "light") => void;
  showToast: (msg: string) => void;
  onRandomizeBoard?: () => void | Promise<void>;
  onOpenWelcomeGuide: () => void;
}

const STEPS = [
  {
    id: "setup" as const,
    label: "Edit Layout",
    shortLabel: "Setup",
    icon: <Layers className="w-3 h-3" />,
  },
  {
    id: "game" as const,
    label: "Play Game",
    shortLabel: "Play",
    icon: <Play className="w-3 h-3" />,
  },
];

type MenuAction = {
  id: string;
  label: string;
  icon: ReactNode;
  onSelect?: () => void | Promise<void>;
  hidden?: boolean;
  disabled?: boolean;
  title?: string;
};

export function AppHeader({
  isGameStarted,
  canUndo,
  canRedo,
  isMuted,
  showStats,
  baseTheme,
  activePlayers,
  activePawn,
  looseTiles,
  canStartGame,
  accentColor,
  setAccentColor,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  onUndo,
  onRedo,
  onRotateBoard,
  onToggleStats,
  onStartGame,
  onEndGame,
  onToggleMute,
  onSetBaseTheme,
  showToast,
  playerHands,
  obtainedTreasures,
  onRandomizeBoard,
  onOpenWelcomeGuide,
}: AppHeaderProps) {
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);

  const currentStep = isGameStarted ? "game" : "setup";

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-900 hover:text-stone-200 cursor-pointer transition-colors";

  const editionLabel =
    typeof window !== "undefined" && !!(window as { electronAPI?: unknown }).electronAPI
      ? "Desktop Edition"
      : "Web Edition";

  const movableTilesRemaining = Math.max(0, looseTiles.length - 1);
  const tilesPlaced = Math.max(0, 33 - movableTilesRemaining);
  const phaseLabel = isGameStarted
    ? "Play phase • Slide, then move"
    : looseTiles.length <= 1
    ? "Setup complete"
    : `${tilesPlaced}/33 tiles placed`;
  const subtitle = [editionLabel, phaseLabel].filter(Boolean).join(" • ");

  useEffect(() => {
    if (!showGameMenu) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (menuButtonRef.current?.contains(target)) return;
      setShowGameMenu(false);
    };

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowGameMenu(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [showGameMenu]);

  useEffect(() => {
    if (isSettingsOpen) setShowGameMenu(false);
  }, [isSettingsOpen]);

  const menuActions: MenuAction[] = [
    {
      id: "end-game",
      label: "End Game",
      icon: <Unlock className="w-3.5 h-3.5 text-amber-400" />,
      onSelect: () => setShowEndGameConfirm(true),
      hidden: !isGameStarted,
    },
    {
      id: "stats",
      label: showStats ? "Hide Stats" : "Show Stats",
      icon: <Gauge className="w-3.5 h-3.5" />,
      onSelect: onToggleStats,
      hidden: !isGameStarted,
    },
    {
      id: "settings",
      label: "Settings",
      icon: <Settings2 className="w-3.5 h-3.5" />,
      onSelect: onOpenSettings,
    },
    {
      id: "mute",
      label: isMuted ? "Unmute Sound" : "Mute Sound",
      icon: isMuted ? (
        <VolumeX className="w-3.5 h-3.5" />
      ) : (
        <Volume2 className="w-3.5 h-3.5 text-theme-primary" />
      ),
      onSelect: onToggleMute,
    },
  ].filter((action) => !action.hidden);

  const handleMenuItemClick = async (action: MenuAction) => {
    if (action.disabled || !action.onSelect) return;
    setShowGameMenu(false);
    if (!isMuted) playClickSound();
    try {
      await Promise.resolve(action.onSelect());
    } catch (error) {
      console.error(`Failed to run menu action "${action.id}"`, error);
      showToast("Something went wrong while performing that action.");
    }
  };

  return (
    <>
      <header
        className="relative z-40 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between border-b border-stone-800 bg-stone-950/70 backdrop-blur-md gap-2 sm:gap-4"
        style={{ boxShadow: "inset 0 -1px 0 rgba(var(--theme-color-rgb), 0.25)" }}
      >
        {/* Left — branding */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <div className="p-1.5 bg-theme-primary-10 border border-theme-primary-20 rounded-xl text-theme-primary">
            <Compass className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h1 className="text-sm sm:text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-stone-200 to-theme-primary bg-clip-text text-transparent flex items-center">
              <span className="hidden sm:inline">Labyrinth Game Solver</span>
              <span className="sm:hidden">Labyrinth</span>
            </h1>
            <p className="text-[10px] text-stone-400 hidden sm:block">{subtitle}</p>
          </div>
        </div>

        {/* Center — Step Nav */}
        <div className="flex-1 flex flex-col items-center justify-center min-w-0 gap-1">
          <div className="w-auto">
            <div className="flex w-auto items-center app-step-nav rounded-full border border-stone-800 px-1 py-0.5 sm:p-1 gap-1">
              {STEPS.map((s) => {
                const isActive = s.id === currentStep;
                const isDisabled = s.id === "game" && !isGameStarted && !canStartGame;
                return (
                  <button
                    key={s.id}
                    disabled={isDisabled}
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      if (s.id === "game" && !isGameStarted) {
                        onStartGame();
                      } else if (s.id === "setup" && isGameStarted) {
                        setShowEndGameConfirm(true);
                      }
                    }}
                    title={isDisabled ? "Place all 33 movable tiles first" : undefined}
                    className={cn(
                      "flex items-center justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-1.5 rounded-full text-[11px] sm:text-xs font-semibold transition-all",
                      isActive
                        ? "bg-theme-primary text-stone-950 shadow-sm"
                        : isDisabled
                        ? "text-stone-600 cursor-not-allowed"
                        : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/40 cursor-pointer"
                    )}
                  >
                    {s.icon}
                    <span className="hidden xs:inline sm:hidden">{s.shortLabel}</span>
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="xs:hidden">{s.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <span className="sm:hidden text-[10px] text-stone-500 font-semibold uppercase tracking-wide">
            {phaseLabel}
          </span>
        </div>

        {/* Right — compact toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Game menu trigger (desktop only) */}
          <div className="relative hidden lg:block">
            <Button
              ref={menuButtonRef}
              variant="outline"
              size="icon"
              onClick={() => {
                if (!isMuted) playClickSound();
                setShowGameMenu((prev) => !prev);
              }}
              id="app-game-menu-button"
              aria-haspopup="menu"
              aria-expanded={showGameMenu}
              className="border-stone-800 hover:bg-stone-900 w-9 h-9"
            >
              <Menu className="w-3.5 h-3.5" />
            </Button>
            {showGameMenu && (
              <div
                ref={menuRef}
                role="menu"
                aria-labelledby="app-game-menu-button"
                className="absolute right-0 mt-2 w-56 app-dropdown-panel border border-stone-800 rounded-xl shadow-2xl p-2 z-50 animate-fade-in"
              >
                <div className="flex flex-col gap-0.5">
                  {menuActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => handleMenuItemClick(action)}
                      disabled={action.disabled}
                      title={action.title}
                      className={cn(
                        menuItemClass,
                        action.disabled &&
                          "opacity-50 cursor-not-allowed hover:bg-transparent hover:text-stone-400"
                      )}
                    >
                      {action.icon}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Randomize layout (desktop & tablets) */}
          {!isGameStarted && onRandomizeBoard && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (!isMuted) playClickSound();
                onRandomizeBoard();
              }}
              className="text-stone-400 hover:text-stone-200 gap-1.5 h-8 px-2 hidden md:flex cursor-pointer"
              title="Randomize layout"
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="text-xs">Randomize</span>
            </Button>
          )}

          {/* Pawn score pills — only during game */}
          {isGameStarted && activePlayers.length > 0 && (
            <div className="hidden sm:flex items-center gap-1 border-r border-stone-800 pr-3 mr-1">
              {activePlayers.map((pawnId) => {
                const pawn = PAWNS.find((p) => p.id === pawnId);
                const obtained =
                  (obtainedTreasures as Record<string, string[]>)[pawnId] ?? [];
                const hand = (playerHands as Record<string, string[]>)[pawnId] ?? [];
                const total = obtained.length + hand.length;
                return (
                  <div key={pawnId} className="relative group">
                    <div
                      className={cn(
                        "flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold cursor-default border transition-colors",
                        pawnId === activePawn
                          ? "border-white/20 bg-white/8 text-stone-100"
                          : "border-transparent text-stone-400"
                      )}
                    >
                      <div
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          pawn?.colorClass ?? "bg-stone-500"
                        }`}
                      />
                      <span>
                        {obtained.length}
                        {total > 0 ? `/${total}` : ""}
                      </span>
                    </div>
                    {/* Hover tooltip */}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl border border-stone-700 bg-stone-950 shadow-2xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 flex flex-col gap-1 pointer-events-none">
                      <div className="text-[10px] font-bold text-stone-200 capitalize border-b border-stone-800 pb-1.5 mb-0.5 flex items-center gap-1.5">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            pawn?.colorClass ?? "bg-stone-500"
                          }`}
                        />
                        {pawn?.name ?? pawnId} — {obtained.length} collected
                      </div>
                      {obtained.length === 0 && hand.length === 0 && (
                        <p className="text-[9px] text-stone-600 italic">
                          No cards assigned
                        </p>
                      )}
                      {obtained.map((id) => {
                        const t = TREASURES.find((x) => x.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5">
                            <span className="text-emerald-400 text-[9px] flex-shrink-0">✓</span>
                            <span className="text-[9px] text-emerald-300 line-through opacity-75">
                              {t?.name ?? id}
                            </span>
                          </div>
                        );
                      })}
                      {hand.map((id, i) => {
                        const t = TREASURES.find((x) => x.id === id);
                        return (
                          <div key={id} className="flex items-center gap-1.5">
                            <span
                              className={cn(
                                "text-[9px] flex-shrink-0",
                                i === 0 ? "text-amber-400" : "text-stone-600"
                              )}
                            >
                              {i === 0 ? "▶" : "·"}
                            </span>
                            <span
                              className={cn(
                                "text-[9px]",
                                i === 0
                                  ? "text-amber-200 font-medium"
                                  : "text-stone-500"
                              )}
                            >
                              {t?.name ?? id}
                              {i === 0 ? " ← next" : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Desktop actions toolbar */}
          <div className="hidden lg:flex items-center gap-2">
            <div className="w-px h-4 bg-stone-800/60 mx-1" />

            <Button
              variant="outline"
              size="icon"
              disabled={!canUndo}
              onClick={() => {
                if (!isMuted) playClickSound();
                onUndo();
              }}
              className="border-stone-800 hover:bg-stone-900 disabled:opacity-30 w-8 h-8"
              title="Undo (Ctrl+Z)"
              aria-label="Undo"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              disabled={!canRedo}
              onClick={() => {
                if (!isMuted) playClickSound();
                onRedo();
              }}
              className="border-stone-800 hover:bg-stone-900 disabled:opacity-30 w-8 h-8"
              title="Redo (Ctrl+Y)"
              aria-label="Redo"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </Button>

            <div className="w-px h-4 bg-stone-800/60 mx-1" />

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (!isMuted) playClickSound();
                onRotateBoard();
              }}
              className="border-stone-800 hover:bg-stone-900 text-stone-300 w-8 h-8"
              title="Rotate Board Perspective (90° Clockwise)"
              aria-label="Rotate board perspective 90 degrees clockwise"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </Button>

            {isGameStarted && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!isMuted) playClickSound();
                  onToggleStats();
                }}
                className={cn(
                  "border-stone-800 hover:bg-stone-900 gap-1.5 h-8",
                  showStats
                    ? "bg-theme-primary-20 border-theme-primary-40 text-theme-primary"
                    : "text-stone-300"
                )}
                title="Toggle Stats"
                aria-label="Toggle game statistics"
              >
                <Gauge className="w-3.5 h-3.5" />
                <span className="text-xs">Stats</span>
              </Button>
            )}

            <div className="w-px h-4 bg-stone-800/60 mx-1" />

            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (!isMuted) playClickSound();
                onToggleMute();
              }}
              className="border-stone-800 hover:bg-stone-900 w-8 h-8"
              aria-label={isMuted ? "Unmute audio" : "Mute audio"}
            >
              {isMuted ? (
                <VolumeX className="w-3.5 h-3.5 text-stone-400" />
              ) : (
                <Volume2 className="w-3.5 h-3.5 text-theme-primary" />
              )}
            </Button>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (!isMuted) playClickSound();
              onOpenWelcomeGuide();
            }}
            className="border-stone-800 hover:bg-stone-900 w-8 h-8 shrink-0"
            title="How to play"
            aria-label="Open the how-to-play guide"
          >
            <HelpCircle className="w-3.5 h-3.5 text-stone-300" />
          </Button>

          <SettingsDialog
            open={isSettingsOpen}
            onOpenChange={(open) => {
              if (open) onOpenSettings();
              else onCloseSettings();
            }}
            isMuted={isMuted}
            onToggleMute={() => {
              if (!isMuted) playClickSound();
              onToggleMute();
            }}
            baseTheme={baseTheme}
            setBaseTheme={onSetBaseTheme}
            accentColor={accentColor}
            setAccentColor={setAccentColor}
          />
        </div>
      </header>

      {/* End Game confirmation dialog */}
      <Dialog
        open={showEndGameConfirm}
        onOpenChange={(open) => {
          if (!open) setShowEndGameConfirm(false);
        }}
      >
        <DialogContent
          className="sm:max-w-[360px] app-dialog-panel border border-stone-800 text-stone-100 shadow-2xl p-6 rounded-2xl"
          onKeyDown={(e) => {
            if (e.key === " ") e.stopPropagation();
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-stone-100 flex items-center gap-2">
              <Unlock className="w-4 h-4 text-amber-400" />
              End Game?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-stone-400 mt-2 leading-relaxed">
            This will end the current game and return to board setup. Your game progress will
            not be saved automatically.
          </p>
          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setShowEndGameConfirm(false)}
              className="border-stone-800 hover:bg-stone-800 text-stone-300 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!isMuted) playClickSound();
                setShowEndGameConfirm(false);
                onEndGame();
              }}
              className="rounded-xl"
            >
              End Game
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
