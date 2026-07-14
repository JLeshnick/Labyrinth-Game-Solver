import { useState } from "react";
import type { TileData, PlayerMap, PawnPositions, AppGameState } from "../types";
import { PAWNS, TREASURES } from "../constants";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { SettingsDialog } from "./SettingsDialog";
import type { SaveSlot } from "../hooks/useLabyrinthStorage";
import { cn } from "../lib/utils";
import { playClickSound } from "../utils/audio";
import {
  Compass,
  Undo2,
  Redo2,
  Volume2,
  VolumeX,
  RotateCw,
  Save,
  Plus,
  FolderOpen,
  Home,
  Gauge,
  RefreshCcw,
  Layers,
  Play,
  ChevronDown,
  Unlock,
} from "lucide-react";

export interface AppHeaderProps {
  currentSlotName: string | null;
  lastSavedTime: number | null;
  isGameStarted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isMuted: boolean;
  showStats: boolean;
  baseTheme: "dark" | "light";
  activePlayers: string[];
  activePawn: string;
  looseTiles: TileData[];
  saveName: string;
  setSaveName: (v: string) => void;
  allSlots: SaveSlot[];
  peekSlotKey: string | null;
  setPeekSlotKey: (v: string | null) => void;
  peekedState: Partial<AppGameState> | null;
  settingsTab: "profiles" | "preferences" | "appearance" | "storage" | "application";
  setSettingsTab: (tab: "profiles" | "preferences" | "appearance" | "storage" | "application") => void;
  accentColor: string;
  setAccentColor: (hex: string) => void;
  isSettingsOpen: boolean;
  grid: (TileData | null)[][];
  spareTile: TileData;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  obtainedTreasures: PlayerMap<string[]>;
  lastShiftArrowId: string | null;
  gameStartState: AppGameState | null;
  pawnPositions: PawnPositions;
  onGoToMenu: () => void;
  onOpenNewGameDialog: () => void;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onResetBoard: () => void;
  onRotateBoard: () => void;
  onToggleStats: () => void;
  onStartGame: () => void;
  onEndGame: () => void;
  onToggleMute: () => void;
  onSaveSlot: (name: string) => Promise<void>;
  onLoadSlot: (key: string, name: string) => Promise<void>;
  onDeleteSlot: (key: string) => Promise<boolean>;
  onSetBaseTheme: (theme: "dark" | "light") => void;
  onSetActivePlayers: (players: string[]) => void;
  showToast: (msg: string) => void;
}

const STEPS = [
  { id: "setup" as const, label: "Edit Layout", shortLabel: "Setup", icon: <Layers className="w-3.5 h-3.5" /> },
  { id: "game"  as const, label: "Play Game",  shortLabel: "Play",  icon: <Play   className="w-3.5 h-3.5" /> },
];

export function AppHeader({
  currentSlotName,
  lastSavedTime,
  isGameStarted,
  canUndo,
  canRedo,
  isMuted,
  showStats,
  baseTheme,
  activePlayers,
  activePawn,
  looseTiles,
  saveName,
  setSaveName,
  allSlots,
  peekSlotKey,
  setPeekSlotKey,
  peekedState,
  settingsTab,
  setSettingsTab,
  accentColor,
  setAccentColor,
  isSettingsOpen,
  onGoToMenu,
  onOpenNewGameDialog,
  onOpenSettings,
  onCloseSettings,
  onSave,
  onUndo,
  onRedo,
  onResetBoard,
  onRotateBoard,
  onToggleStats,
  onStartGame,
  onEndGame,
  onToggleMute,
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onSetBaseTheme,
  onSetActivePlayers,
  showToast,
  playerHands,
  obtainedTreasures,
}: AppHeaderProps) {
  const [showGameMenu, setShowGameMenu] = useState(false);
  const [showEndGameConfirm, setShowEndGameConfirm] = useState(false);

  const currentStep = isGameStarted ? "game" : "setup";
  const canStartGame = looseTiles.length === 1;

  const menuItemClass =
    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-stone-400 hover:bg-stone-900 hover:text-stone-200 cursor-pointer transition-colors";

  return (
    <>
    <header className="relative z-40 px-3 sm:px-6 py-2 sm:py-3 flex items-center justify-between border-b border-stone-800 bg-stone-950/70 backdrop-blur-md gap-2 sm:gap-4">

      {/* Left — branding */}
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
        <div className="p-1.5 bg-theme-primary-10 border border-theme-primary-20 rounded-xl text-theme-primary">
          <Compass className="w-4 h-4 animate-pulse" />
        </div>
        <div>
          <h1 className="text-sm sm:text-lg md:text-xl font-bold tracking-tight bg-gradient-to-r from-stone-200 to-theme-primary bg-clip-text text-transparent flex items-center">
            <span className="hidden sm:inline">Labyrinth Game Solver</span>
            <span className="sm:hidden">Labyrinth</span>
            {currentSlotName && (
              <span className="ml-1.5 sm:ml-3 px-1.5 sm:px-2 py-0.5 rounded-full bg-white/10 text-[9px] sm:text-xs font-medium text-stone-300 border border-stone-800 max-w-[80px] sm:max-w-none truncate">
                {currentSlotName}
              </span>
            )}
          </h1>
          <p className="text-[10px] text-stone-400 hidden sm:block">
            {typeof window !== "undefined" && !!(window as { electronAPI?: unknown }).electronAPI ? "Desktop Edition" : "Web Edition"}
            {lastSavedTime
              ? ` • Saved: ${new Date(lastSavedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
              : ""}
          </p>
        </div>
      </div>

      {/* Center — Step Nav */}
      <div className="flex-1 flex items-center justify-center min-w-0">
        <div className="flex items-center app-step-nav rounded-full p-0.5 sm:p-1 border border-stone-800">
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
                className={`flex items-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  isActive
                    ? "bg-theme-primary text-stone-950 font-semibold shadow-sm"
                    : isDisabled
                    ? "text-stone-600 cursor-not-allowed"
                    : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/40 cursor-pointer"
                }`}
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

      {/* Right — compact toolbar */}
      <div className="flex items-center gap-2 shrink-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onGoToMenu}
          className="text-stone-400 hover:text-stone-200 gap-1.5 h-8 px-2"
          title="Exit to Main Menu"
          aria-label="Exit to Main Menu"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="text-xs hidden sm:inline">Menu</span>
        </Button>

        {/* Pawn score pills — only during game */}
        {isGameStarted && activePlayers.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 border-r border-stone-800 pr-3 mr-1">
            {activePlayers.map(pawnId => {
              const pawn = PAWNS.find(p => p.id === pawnId);
              const obtained = (obtainedTreasures as Record<string, string[]>)[pawnId] ?? [];
              const hand = (playerHands as Record<string, string[]>)[pawnId] ?? [];
              const total = obtained.length + hand.length;
              return (
                <div key={pawnId} className="relative group">
                  <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold cursor-default border transition-colors ${
                    pawnId === activePawn
                      ? "border-white/20 bg-white/8 text-stone-100"
                      : "border-transparent text-stone-400"
                  }`}>
                    <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${pawn?.colorClass ?? "bg-stone-500"}`} />
                    <span>{obtained.length}{total > 0 ? `/${total}` : ""}</span>
                  </div>
                  {/* Hover tooltip */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl border border-stone-700 bg-stone-950 shadow-2xl p-3 z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all duration-150 flex flex-col gap-1 pointer-events-none">
                    <div className="text-[10px] font-bold text-stone-200 capitalize border-b border-stone-800 pb-1.5 mb-0.5 flex items-center gap-1.5">
                      <div className={`w-3 h-3 rounded-full ${pawn?.colorClass ?? "bg-stone-500"}`} />
                      {pawn?.name ?? pawnId} — {obtained.length} collected
                    </div>
                    {obtained.length === 0 && hand.length === 0 && (
                      <p className="text-[9px] text-stone-600 italic">No cards assigned</p>
                    )}
                    {obtained.map(id => {
                      const t = TREASURES.find(x => x.id === id);
                      return (
                        <div key={id} className="flex items-center gap-1.5">
                          <span className="text-emerald-400 text-[9px] flex-shrink-0">✓</span>
                          <span className="text-[9px] text-emerald-300 line-through opacity-75">{t?.name ?? id}</span>
                        </div>
                      );
                    })}
                    {hand.map((id, i) => {
                      const t = TREASURES.find(x => x.id === id);
                      return (
                        <div key={id} className="flex items-center gap-1.5">
                          <span className={`text-[9px] flex-shrink-0 ${i === 0 ? "text-amber-400" : "text-stone-600"}`}>{i === 0 ? "▶" : "·"}</span>
                          <span className={`text-[9px] ${i === 0 ? "text-amber-200 font-medium" : "text-stone-500"}`}>
                            {t?.name ?? id}{i === 0 ? " ← next" : ""}
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

        {/* Game ▼ dropdown */}
        <div className="relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { if (!isMuted) playClickSound(); setShowGameMenu((v) => !v); }}
            className="border-stone-800 bg-stone-900/40 text-stone-300 hover:text-stone-100 gap-1.5 h-8 px-3 cursor-pointer"
            aria-haspopup="menu"
            aria-expanded={showGameMenu}
          >
            <Unlock className="w-3.5 h-3.5 text-theme-primary" />
            <span className="text-xs">Game</span>
            <ChevronDown className="w-3 h-3 text-stone-500 ml-0.5" />
          </Button>

          {showGameMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowGameMenu(false)} />
              <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-stone-800 p-1.5 shadow-xl z-50 animate-fade-in app-dropdown-panel">
                <button
                  onClick={() => { if (!isMuted) playClickSound(); onOpenNewGameDialog(); setShowGameMenu(false); }}
                  className={menuItemClass}
                >
                  <Plus className="w-3.5 h-3.5 text-theme-primary shrink-0" />
                  New Game
                </button>
                <button
                  onClick={() => { if (!isMuted) playClickSound(); onOpenSettings(); setShowGameMenu(false); }}
                  className={menuItemClass}
                >
                  <FolderOpen className="w-3.5 h-3.5 text-theme-primary shrink-0" />
                  Load Game
                </button>
                {!isGameStarted && (
                  <button
                    onClick={() => { if (!isMuted) playClickSound(); onResetBoard(); setShowGameMenu(false); }}
                    className={menuItemClass}
                  >
                    <RefreshCcw className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                    Reset Board
                  </button>
                )}
                <div className="my-1 border-t border-stone-800" />
                <button
                  onClick={() => { if (!isMuted) playClickSound(); onSave(); setShowGameMenu(false); }}
                  className={menuItemClass}
                >
                  <Save className="w-3.5 h-3.5 text-theme-primary shrink-0" />
                  Save
                </button>
              </div>
            </>
          )}
        </div>

        {/* Desktop actions toolbar */}
        <div className="hidden lg:flex items-center gap-2">
          <div className="w-px h-4 bg-stone-800/60 mx-1" />

          <Button
            variant="outline"
            size="icon"
            disabled={!canUndo}
            onClick={onUndo}
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
            onClick={onRedo}
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
            onClick={onRotateBoard}
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
              onClick={onToggleStats}
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
            onClick={onToggleMute}
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

        <SettingsDialog
          open={isSettingsOpen}
          onOpenChange={(open) => {
            if (open) onOpenSettings();
            else onCloseSettings();
          }}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          isMuted={isMuted}
          onToggleMute={onToggleMute}
          baseTheme={baseTheme}
          setBaseTheme={onSetBaseTheme}
          accentColor={accentColor}
          setAccentColor={setAccentColor}
          activePlayers={activePlayers}
          setActivePlayers={onSetActivePlayers}
          activePawn={activePawn}
          saveName={saveName}
          setSaveName={setSaveName}
          allSlots={allSlots}
          peekSlotKey={peekSlotKey}
          setPeekSlotKey={setPeekSlotKey}
          peekedState={peekedState}
          onSaveSlot={onSaveSlot}
          onLoadSlot={onLoadSlot}
          onDeleteSlot={onDeleteSlot}
          showToast={showToast}
        />
      </div>
    </header>

    {/* End Game confirmation dialog */}
    <Dialog open={showEndGameConfirm} onOpenChange={(open) => { if (!open) setShowEndGameConfirm(false); }}>
      <DialogContent className="sm:max-w-[360px] app-dialog-panel border border-stone-800 text-stone-100 shadow-2xl p-6 rounded-2xl" onKeyDown={(e) => { if (e.key === " ") e.stopPropagation(); }}>
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
          <Button
            variant="outline"
            onClick={() => setShowEndGameConfirm(false)}
            className="border-stone-800 hover:bg-stone-800 text-stone-300 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            onClick={() => { setShowEndGameConfirm(false); onEndGame(); }}
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
