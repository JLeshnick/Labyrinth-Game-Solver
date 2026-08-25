import React, { useEffect } from "react";
import type { TileData, PlayerMap, UITheme } from "../../types";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import { SidePanel } from "./SidePanel";
import { PAWNS, TREASURES } from "../../constants";
import {
  RotateCcw,
  Sparkles,
  Shuffle,
  Camera,
  Play,
  Layers,
  Compass,
  Users,
} from "lucide-react";
import { playClickSound } from "../../utils/audio";
import { cn } from "../../lib/utils";

interface SetupPanelProps {
  looseTiles: TileData[];
  onTileClick: (id: string) => void;
  onStartGame: () => void;
  onRandomizeBoard: () => void | Promise<void>;
  onResetBoard: () => void;
  onResetAllDefaults?: () => void;
  onScanBoard?: () => void;
  canStartGame: boolean;
  activePlayers: string[];
  setActivePlayers: (players: string[]) => void;
  playerHands: PlayerMap<string[]>;
  activePawn: string;
  setActivePawn: (pawn: string) => void;
  onAddCard: (treasureId: string) => void;
  onRemoveCard: (treasureId: string) => void;
  onAddAllCards?: () => void;
  onClearAllCards?: () => void;
  showToast: (msg: string) => void;
  gameMode: "standard" | "coop" | "auto";
  onSetGameMode?: (mode: "standard" | "coop" | "auto") => void;
  setupTab: "tiles" | "players" | "mode" | "cards";
  setSetupTab: (tab: "tiles" | "players" | "mode" | "cards") => void;
  onOpenSettings?: () => void;
  compact?: boolean;
  isMuted?: boolean;
  uiTheme?: UITheme;
}

export const SetupPanel: React.FC<SetupPanelProps> = ({
  looseTiles,
  onTileClick,
  onStartGame,
  onRandomizeBoard,
  onResetBoard,
  onResetAllDefaults,
  onScanBoard,
  canStartGame,
  activePlayers,
  setActivePlayers,
  playerHands,
  activePawn,
  setActivePawn,
  onAddCard,
  onRemoveCard,
  onAddAllCards,
  onClearAllCards,
  showToast,
  gameMode,
  onSetGameMode,
  setupTab,
  setSetupTab,
  onOpenSettings,
  compact = false,
  isMuted = false,
  uiTheme = "brutalist",
}) => {
  const isSimplistic = uiTheme === "simplistic";

  // If in coop / auto mode and on cards tab, switch back to tiles
  useEffect(() => {
    if ((gameMode === "coop" || gameMode === "auto") && setupTab === "cards") {
      setSetupTab("tiles");
    }
  }, [gameMode, setupTab, setSetupTab]);

  if (compact) {
    const movableTilesRemaining = Math.max(0, looseTiles.length - 1);
    return (
      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="text-xs text-muted-foreground truncate flex-1">
          {looseTiles.length === 1
            ? "Setup complete — ready to play"
            : `${movableTilesRemaining} tile${movableTilesRemaining === 1 ? "" : "s"} left to place`}
        </span>
        <Tooltip content="Start playing with current board setup" side="left">
          <Button
            onClick={() => {
              if (!isMuted) playClickSound();
              onStartGame();
            }}
            disabled={!canStartGame}
            size="sm"
            className={cn(
              "font-bold min-h-9 rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed",
              isSimplistic
                ? "bg-theme-primary text-stone-950 shadow-xs border border-theme-primary"
                : "neo-brutalism-button bg-theme-primary border-stone-950 hover:bg-theme-primary-hover text-stone-950"
            )}
          >
            <Play className="w-3.5 h-3.5" />
            Start
          </Button>
        </Tooltip>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3 md:gap-4 p-2 md:p-3 lg:p-4">
      {/* Checklist Header */}
      <div className="p-3 app-surface flex flex-col gap-2 text-xs md:text-sm text-left">
        <div className="flex items-center justify-between border-b border-border pb-1.5">
          <h3 className="font-bold text-foreground flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
            Setup Wizard & Checklist
          </h3>
          {onOpenSettings && (
            <button
              onClick={() => {
                if (!isMuted) playClickSound();
                onOpenSettings();
              }}
              className="text-[11px] font-bold text-theme-primary hover:underline flex items-center gap-1 cursor-pointer"
            >
              ⚙️ Settings
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full border border-stone-950 ${looseTiles.length === 1 ? "bg-green-500" : "bg-theme-primary"}`} />
            <span className="text-foreground">
              Movable Tiles Placed: {34 - looseTiles.length}/33{" "}
              {looseTiles.length === 1 ? "✓" : `(needs ${looseTiles.length - 1} more)`}
            </span>
          </div>
        </div>
        <Button
          onClick={() => {
            if (!isMuted) playClickSound();
            onStartGame();
          }}
          disabled={!canStartGame}
          title={!canStartGame ? "Place all 33 movable tiles on the board first" : "Lock in layout and begin game turn"}
          className={cn(
            "w-full font-bold py-2.5 px-4 min-h-11 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed mt-1",
            isSimplistic
              ? "bg-theme-primary text-stone-950 rounded-lg shadow-sm hover:brightness-105 active:scale-[0.99] border border-theme-primary"
              : "neo-brutalism-button bg-theme-primary border-stone-950 hover:bg-theme-primary-hover text-stone-950 rounded-xl"
          )}
        >
          <Play className="w-4 h-4" />
          Start Game
        </Button>
      </div>

      {/* Tab bar */}
      <div
        className={cn(
          "flex items-center bg-card p-1 w-full gap-0.5",
          isSimplistic
            ? "border border-border bg-stone-900/30 dark:bg-stone-900/40 rounded-lg shadow-xs"
            : "rounded-xl border-2 border-stone-950 shadow-[3px_3px_0_0_#000000]"
        )}
      >
        {([
          { id: "tiles",   label: "Tiles",   icon: <Layers  className="w-3.5 h-3.5" />, desc: "Configure movable board tiles" },
          { id: "mode",    label: "Mode",    icon: <Compass className="w-3.5 h-3.5" />, desc: "Select Standard, Co-op, or Auto game mode" },
          { id: "players", label: "Players", icon: <Users   className="w-3.5 h-3.5" />, desc: "Toggle active player pawns" },
          { id: "cards",   label: "Cards",   icon: <Sparkles className="w-3.5 h-3.5" />, desc: "Assign treasure cards to players" },
        ] as const).map((tab) => {
          const isDisabled = tab.id === "cards" && (gameMode === "coop" || gameMode === "auto");
          return (
            <button
              key={tab.id}
              disabled={isDisabled}
              onClick={() => setSetupTab(tab.id)}
              title={isDisabled ? "Cards tab disabled in Co-op / Auto mode" : tab.desc}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 md:py-1.5 min-h-11 md:min-h-0 rounded-lg text-xs font-bold transition-all",
                isSimplistic
                  ? isDisabled
                    ? "opacity-30 cursor-not-allowed text-muted-foreground/60"
                    : setupTab === tab.id
                    ? "bg-theme-primary text-stone-950 shadow-xs border border-theme-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-stone-800/40 cursor-pointer"
                  : isDisabled
                  ? "opacity-30 cursor-not-allowed border-2 border-transparent bg-muted/40 text-muted-foreground/60 shadow-none"
                  : setupTab === tab.id
                  ? "bg-theme-primary text-stone-950 border-2 border-stone-950 shadow-[2px_2px_0_0_#000000] cursor-pointer"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted border-2 border-transparent cursor-pointer"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-visible min-h-0">
        {setupTab === "tiles" && (
          <div className="flex flex-col gap-3 h-full overflow-visible min-h-0 p-1 px-1.5 pb-4">
            <div className="grid grid-cols-2 sm:flex gap-2 items-center overflow-visible">
              <Tooltip content="Reset all settings, mode, players, cards, and board to defaults" side="bottom" containerClassName="flex-1">
                <Button
                  variant="outline"
                  size="sm"
                  aria-label="Reset all defaults"
                  onClick={() => {
                    let confirmed = true;
                    try {
                      if (typeof window !== "undefined" && typeof window.confirm === "function") {
                        confirmed = window.confirm("Reset EVERYTHING to defaults? This will clear all placed tiles, hand cards, player settings, and start a completely fresh game.");
                      }
                    } catch {
                      confirmed = true;
                    }
                    if (confirmed) {
                      if (onResetAllDefaults) {
                        onResetAllDefaults();
                      } else {
                        onResetBoard();
                      }
                    }
                  }}
                  className="w-full neo-brutalism-button border-2 border-stone-950 bg-red-500 hover:bg-red-400 text-stone-950 font-bold py-2.5 px-3 min-h-11 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs shadow-[2px_2px_0_0_#000000]"
                >
                  <RotateCcw className="w-4 h-4" />
                  Reset All
                </Button>
              </Tooltip>
              <Tooltip content="Randomly fill all movable tiles across the labyrinth grid" side="bottom" containerClassName="flex-1">
                <Button
                  size="sm"
                  onClick={onRandomizeBoard}
                  className="w-full neo-brutalism-button bg-theme-primary border-stone-950 hover:bg-theme-primary-hover text-stone-950 font-bold py-2.5 px-3 min-h-11 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-xs"
                >
                  <Shuffle className="w-4 h-4" />
                  Randomize
                </Button>
              </Tooltip>
              {onScanBoard && (
                <Tooltip content="Scan board photo with camera" side="bottom-left" containerClassName="shrink-0">
                  <Button
                    variant="outline"
                    onClick={onScanBoard}
                    aria-label="Scan board photo"
                    className="neo-brutalism-button border-stone-950 bg-card text-muted-foreground hover:text-foreground min-h-11 w-11 px-0 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                </Tooltip>
              )}
            </div>
            {/* padding wrapper lets the card's shadow breathe — overflow-visible is intentional */}
            <div className="flex-1 overflow-visible min-h-0 p-1 pb-4">
              <SidePanel tiles={looseTiles} onTileClick={onTileClick} uiTheme={uiTheme} />
            </div>
          </div>
        )}

        {setupTab === "mode" && (
          <div className="flex flex-col gap-4 h-full overflow-y-auto min-h-0 p-1 px-1.5 pb-4">
            <div className="p-3 app-surface flex flex-col gap-2">
              <div className="text-xs font-bold text-foreground">Game Mode</div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Standard: each player hunts their own cards. Cooperative: all players share a pool. Auto: the solver plays itself automatically.
              </p>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {(["standard", "coop", "auto"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      if (onSetGameMode) {
                        onSetGameMode(mode);
                      }
                    }}
                    className={`flex flex-col items-center justify-center gap-0.5 p-2.5 min-h-11 rounded-xl text-xs font-semibold neo-brutalism-button cursor-pointer border-stone-950 ${
                      gameMode === mode
                        ? "bg-theme-primary text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                        : "bg-card text-foreground"
                    }`}
                  >
                    <span>{mode === "coop" ? "Co-op" : mode === "auto" ? "Auto" : "Standard"}</span>
                    <span className="text-[9px] opacity-60">{gameMode === mode ? "Active" : "—"}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {setupTab === "players" && (
          <div className="flex flex-col gap-4 h-full overflow-y-auto min-h-0 p-1 px-1.5 pb-4">
            <div className="p-3 app-surface flex flex-col gap-2">
              <div className="text-xs font-semibold text-foreground">Active Players</div>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Enable or disable players. Playing solo? Keep only one active. Pawns always start at their home corners.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {PAWNS.map((p) => {
                  const isActive = activePlayers.includes(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        if (!isMuted) playClickSound();
                        if (isActive) {
                          if (activePlayers.length > 1) {
                            setActivePlayers(activePlayers.filter((id) => id !== p.id));
                          } else {
                            showToast("At least one player must be active!");
                          }
                        } else {
                          setActivePlayers([...activePlayers, p.id]);
                        }
                      }}
                      className={`flex items-center justify-between p-2.5 min-h-11 rounded-xl text-xs font-semibold neo-brutalism-button cursor-pointer border-stone-950 ${
                        isActive
                          ? "bg-theme-primary text-stone-950 translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]"
                          : "bg-card text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-3 h-3 rounded-full ring-1 ring-white/20 ${p.colorClass}`} />
                        <span>{p.name}</span>
                      </div>
                      <span className="text-[10px] opacity-75">{isActive ? "Active" : "Off"}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {setupTab === "cards" && (
          <div className="flex flex-col gap-4 h-full overflow-hidden min-h-0 p-1 px-1.5">
            {/* Optional cards info */}
            <div className="text-[11px] text-muted-foreground leading-relaxed app-surface px-3 py-2 rounded-lg">
              <span className="text-foreground font-semibold">Hand cards are optional.</span> During play you can tap any board tile to navigate there instead. Use this section if you know your full card set upfront — the solver will then optimize the order to reach all your treasures in the fewest moves.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm text-muted-foreground shrink-0">Select player:</div>
              <div className="flex gap-1.5 flex-wrap">
                {activePlayers.map((p) => (
                  <button
                    key={p}
                    onClick={() => { if (!isMuted) playClickSound(); setActivePawn(p); }}
                    className={`w-11 h-11 text-sm md:w-9 md:h-9 md:text-xs rounded-full shrink-0 font-bold flex items-center justify-center neo-brutalism-button border-stone-950 ${PAWNS.find((pw) => pw.id === p)?.colorClass ?? "bg-stone-500"} ${activePawn === p ? "translate-x-[1px] translate-y-[1px] shadow-[1px_1px_0_0_#000000]" : "opacity-60"} text-stone-950`}
                  >
                    {p[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 app-surface">
              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  Player <span className="capitalize text-theme-primary font-bold">{activePawn}</span>'s hand (
                  {playerHands[activePawn]?.length ?? 0} cards):
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      onAddAllCards?.();
                    }}
                    className="text-[10px] text-theme-primary hover:underline font-bold bg-transparent border-0 cursor-pointer"
                  >
                    Add All
                  </button>
                  <span className="text-[10px] text-muted-foreground/60">|</span>
                  <button
                    onClick={() => {
                      if (!isMuted) playClickSound();
                      onClearAllCards?.();
                    }}
                    className="text-[10px] text-red-400 hover:underline font-bold bg-transparent border-0 cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(playerHands[activePawn] ?? []).map((cardId) => {
                  const name = TREASURES.find((t) => t.id === cardId)?.name ?? cardId;
                  return (
                    <div key={cardId} className="text-[10px] bg-theme-primary border-2 border-stone-950 text-stone-950 font-black px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-[2px_2px_0_0_#000000]">
                      {name}
                      <button
                        onClick={() => onRemoveCard(cardId)}
                        aria-label={`Remove ${name}`}
                        className="text-stone-950 hover:opacity-75 inline-flex items-center justify-center min-w-4 min-h-4 ml-1 rounded font-black cursor-pointer"
                      >×</button>
                    </div>
                  );
                })}
                {(!playerHands[activePawn] || playerHands[activePawn].length === 0) && (
                  <span className="text-[10px] text-muted-foreground/60 italic">No cards assigned — add below or leave empty.</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 min-h-0 pb-8">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Add Treasure Cards:</div>
              <div className="grid grid-cols-2 gap-1.5 pb-8 text-left">
                {TREASURES.filter((t) => {
                  const alreadyInHand = playerHands[activePawn]?.includes(t.id);
                  if (alreadyInHand) return true;
                  return !Object.entries(playerHands).some(([color, hand]) => color !== activePawn && hand.includes(t.id));
                }).map((t) => {
                  const alreadyInHand = playerHands[activePawn]?.includes(t.id);
                  return (
                    <Button
                      key={t.id}
                      size="sm"
                      variant={alreadyInHand ? "secondary" : "outline"}
                      onClick={() => (alreadyInHand ? onRemoveCard(t.id) : onAddCard(t.id))}
                      className={`text-[10px] md:text-xs py-1 justify-start h-11 md:h-9 lg:h-8 px-2 truncate neo-brutalism-button bg-card hover:bg-muted text-foreground border-2 border-stone-950 shadow-[2px_2px_0_0_#000000] ${alreadyInHand ? "bg-theme-primary text-stone-950 shadow-[1px_1px_0_0_#000000] translate-x-[1px] translate-y-[1px]" : ""}`}
                    >
                      {t.name}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
