import type { TileData, PlayerMap, PawnPositions } from "../types";
import { Button } from "./ui/button";
import { SettingsDialog } from "./SettingsDialog";
import type { SaveSlot } from "../hooks/useLabyrinthStorage";
import { cn } from "../lib/utils";
import {
  Compass,
  RefreshCcw,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  RotateCw,
  Save,
  Plus,
  FolderOpen,
  Home,
  Gauge,
} from "lucide-react";

export interface AppHeaderProps {
  currentSlotName: string | null;
  lastSavedTime: number | null;
  isGameStarted: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isMuted: boolean;
  showStats: boolean;
  activeTheme: string;
  activePlayers: string[];
  activePawn: string;
  looseTiles: TileData[];
  saveName: string;
  setSaveName: (v: string) => void;
  allSlots: SaveSlot[];
  peekSlotKey: string | null;
  setPeekSlotKey: (v: string | null) => void;
  peekedState: unknown;
  settingsTab: "profiles" | "preferences" | "themes" | "storage";
  setSettingsTab: (tab: "profiles" | "preferences" | "themes" | "storage") => void;
  isSettingsOpen: boolean;
  desktopSettings: { gamesDir: string } | null;
  grid: (TileData | null)[][];
  spareTile: TileData;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  obtainedTreasures: PlayerMap<string[]>;
  lastShiftArrowId: string | null;
  gameStartState: unknown;
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
  onSetActiveTheme: (theme: string) => void;
  onSetActivePlayers: (players: string[]) => void;
  onSetDesktopSettings: (s: { gamesDir: string }) => void;
  showToast: (msg: string) => void;
}

export function AppHeader({
  currentSlotName,
  lastSavedTime,
  isGameStarted,
  canUndo,
  canRedo,
  isMuted,
  showStats,
  activeTheme,
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
  isSettingsOpen,
  desktopSettings,
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
  onSetActiveTheme,
  onSetActivePlayers,
  onSetDesktopSettings,
  showToast,
}: AppHeaderProps) {
  return (
    <header className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between border-b border-stone-800 bg-stone-950/70 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-theme-primary-10 border border-theme-primary-20 rounded-xl text-theme-primary">
          <Compass className="w-6 h-6 animate-pulse" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-stone-200 to-theme-primary bg-clip-text text-transparent flex items-center">
            Labyrinth Game Solver
            {currentSlotName && (
              <span className="ml-3 px-2 py-0.5 rounded-full bg-white/10 text-xs font-semibold text-stone-300 border border-stone-800">
                {currentSlotName}
              </span>
            )}
          </h1>
          <p className="text-xs text-stone-400">
            Desktop Edition
            {lastSavedTime
              ? ` • Last Saved: ${new Date(lastSavedTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`
              : ""}
          </p>
        </div>
      </div>

      <div className="mt-4 sm:mt-0 flex items-center gap-2">
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

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenNewGameDialog}
          className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 h-8"
          title="Create New Game"
          aria-label="Create New Game"
        >
          <Plus className="w-3.5 h-3.5 text-theme-primary" />
          <span className="text-xs hidden sm:inline">New Game</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSettings}
          className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 h-8"
          title="Load Saved Game"
          aria-label="Load Saved Game"
        >
          <FolderOpen className="w-3.5 h-3.5 text-theme-primary" />
          <span className="text-xs hidden sm:inline">Load Game</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onSave}
          className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 h-8"
          title="Save Game"
          aria-label="Save Game"
        >
          <Save className="w-3.5 h-3.5 text-theme-primary" />
          <span className="text-xs">Save</span>
        </Button>

        <div className="w-px h-4 bg-stone-800 mx-1" />

        <Button
          variant="outline"
          size="icon"
          disabled={!canUndo}
          onClick={onUndo}
          className="border-stone-800 hover:bg-stone-900 disabled:opacity-30"
          title="Undo"
          aria-label="Undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>

        <Button
          variant="outline"
          size="icon"
          disabled={!canRedo}
          onClick={onRedo}
          className="border-stone-800 hover:bg-stone-900 disabled:opacity-30"
          title="Redo"
          aria-label="Redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>

        <div className="w-px h-4 bg-stone-800 mx-1" />

        {!isGameStarted && (
          <Button
            variant="outline"
            onClick={onResetBoard}
            className="border-stone-800 hover:bg-stone-900 gap-2"
            aria-label="Reset board to initial presets"
          >
            <RefreshCcw className="w-4 h-4" />
            Reset Board
          </Button>
        )}

        <Button
          variant="outline"
          size="icon"
          onClick={onRotateBoard}
          className="border-stone-800 hover:bg-stone-900 text-stone-300"
          title="Rotate Board Perspective (90° Clockwise)"
          aria-label="Rotate board perspective 90 degrees clockwise"
        >
          <RotateCw className="w-4 h-4" />
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

        {isGameStarted ? (
          <Button
            variant="destructive"
            onClick={onEndGame}
            className="gap-2"
            aria-label="Return to board setup"
          >
            <Unlock className="w-4 h-4" />
            Edit Board
          </Button>
        ) : (
          <Button
            onClick={onStartGame}
            disabled={looseTiles.length !== 1}
            className="bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-semibold gap-2 disabled:bg-stone-800 disabled:text-stone-500 shadow-lg shadow-theme-glow"
            aria-label="Start game"
          >
            <Lock className="w-4 h-4" />
            Start Game
          </Button>
        )}

        <div className="w-px h-4 bg-stone-800 mx-1" />

        <Button
          variant="outline"
          size="icon"
          onClick={onToggleMute}
          className="border-stone-800 hover:bg-stone-900"
          aria-label={isMuted ? "Unmute audio" : "Mute audio"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-stone-400" />
          ) : (
            <Volume2 className="w-4 h-4 text-theme-primary" />
          )}
        </Button>

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
          activeTheme={activeTheme}
          setActiveTheme={onSetActiveTheme}
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
          desktopSettings={desktopSettings}
          onSetDesktopSettings={onSetDesktopSettings}
        />
      </div>
    </header>
  );
}
