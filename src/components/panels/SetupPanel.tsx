import { useEffect } from "react";
import { Sparkles, Layers, Users, Compass, Play, RefreshCcw, Camera } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { Button } from "../ui/button";
import { PAWNS, TREASURES } from "../../constants";
import { playClickSound } from "../../utils/audio";
import type { TileData } from "../../types";

interface SetupPanelProps {
  looseTiles: TileData[];
  activePlayers: string[];
  setActivePlayers: (players: string[]) => void;
  activePawn: string;
  setActivePawn: (p: string) => void;
  isMuted: boolean;
  playerHands: Record<string, string[]>;
  onTileClick: (id: string) => void;
  onRandomizeBoard: () => void;
  onResetBoard: () => void;
  onAddCard: (treasureId: string) => void;
  onRemoveCard: (treasureId: string) => void;
  onAddAllCards?: () => void;
  onClearAllCards?: () => void;
  setupTab: "tiles" | "players" | "mode" | "cards";
  setSetupTab: (tab: "tiles" | "players" | "mode" | "cards") => void;
  canStartGame: boolean;
  onStartGame: () => void;
  showToast: (msg: string) => void;
  onScanBoard?: () => void;
  compact?: boolean;
  gameMode?: "standard" | "coop" | "auto";
  onSetGameMode?: (mode: "standard" | "coop" | "auto") => void;
  onResetAllDefaults?: () => void;
}

export function SetupPanel({
  looseTiles,
  activePlayers,
  setActivePlayers,
  activePawn,
  setActivePawn,
  isMuted,
  playerHands,
  onTileClick,
  onRandomizeBoard,
  onResetBoard,
  onAddCard,
  onRemoveCard,
  onAddAllCards,
  onClearAllCards,
  setupTab,
  setSetupTab,
  canStartGame,
  onStartGame,
  showToast,
  onScanBoard,
  compact = false,
  gameMode = "standard",
  onSetGameMode,
  onResetAllDefaults,
}: SetupPanelProps) {

  useEffect(() => {
    if ((gameMode === "coop" || gameMode === "auto") && setupTab === "cards") {
      setSetupTab("tiles");
    }
  }, [gameMode, setupTab, setSetupTab]);

  if (compact) {
    const movableTilesRemaining = Math.max(0, looseTiles.length - 1);
    return (
      <div className="flex items-center gap-2 px-3 pb-2">
        <span className="text-xs text-stone-400 truncate flex-1">
          {looseTiles.length === 1
            ? "Setup complete — ready to play"
            : `${movableTilesRemaining} tile${movableTilesRemaining === 1 ? "" : "s"} left to place`}
        </span>
        <Button
          onClick={() => {
            if (!isMuted) playClickSound();
            onStartGame();
          }}
          disabled={!canStartGame}
          size="sm"
          className="neo-brutalism-button bg-theme-primary border-stone-950 hover:bg-theme-primary-hover text-stone-950 font-bold min-h-9 rounded-lg flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0_0_#000000]"
        >
          <Play className="w-3.5 h-3.5" />
          Start
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3 md:gap-4 p-2 md:p-3 lg:p-4">
      {/* Checklist */}
      <div className="p-3 app-surface flex flex-col gap-2 text-xs md:text-sm text-left">
        <div className="flex items-center justify-between border-b border-stone-800 pb-1.5">
          <h3 className="font-bold text-stone-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-theme-primary" />
            Setup Wizard & Checklist
          </h3>
          {onResetAllDefaults && (
            <button
              onClick={() => {
                if (!isMuted) playClickSound();
                onResetAllDefaults();
                showToast("All game settings and layout reset to defaults!");
              }}
              title="Reset all settings, mode, players, cards, and board to defaults"
              className="text-[10px] md:text-xs font-extrabold flex items-center gap-1.5 bg-red-500 hover:bg-red-400 text-stone-950 px-2.5 py-1.5 rounded-lg border-2 border-stone-950 neo-brutalism-button shadow-[2px_2px_0_0_#000000] cursor-pointer shrink-0 transition-all"
            >
              <RefreshCcw className="w-3 h-3 text-stone-950 stroke-[2.5]" />
              Reset Defaults
            </button>
          )}
        </div>
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full border border-stone-950 ${looseTiles.length === 1 ? "bg-green-500" : "bg-theme-primary"}`} />
            <span className="text-stone-300">
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
          title={!canStartGame ? "Place all movable tiles first" : undefined}
          className="w-full neo-brutalism-button bg-theme-primary border-stone-950 hover:bg-theme-primary-hover text-stone-950 font-bold py-2.5 px-4 min-h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-x-0 disabled:translate-y-0 disabled:shadow-[2px_2px_0_0_#000000] mt-1"
        >
          <Play className="w-4 h-4" />
          Start Game
        </Button>
      </div>

      {/* Tab bar — full width to align with the checklist above */}
      <div className="flex items-center bg-card rounded-xl p-1 border-2 border-stone-950 w-full shadow-[3px_3px_0_0_#000000] gap-0.5">
        {([
          { id: "tiles",   label: "Tiles",   icon: <Layers  className="w-3.5 h-3.5" /> },
          { id: "mode",    label: "Mode",    icon: <Compass className="w-3.5 h-3.5" /> },
          { id: "players", label: "Players", icon: <Users   className="w-3.5 h-3.5" /> },
          { id: "cards",   label: "Cards",   icon: <Sparkles className="w-3.5 h-3.5" /> },
        ] as const).map((tab) => {
          const isDisabled = tab.id === "cards" && (gameMode === "coop" || gameMode === "auto");
          return (
            <button
              key={tab.id}
              disabled={isDisabled}
              onClick={() => setSetupTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 md:py-1.5 min-h-11 md:min-h-0 rounded-lg text-xs font-bold transition-all border-2 ${
                isDisabled
                  ? "opacity-30 cursor-not-allowed border-transparent bg-stone-900/40 text-stone-600 shadow-none"
                  : setupTab === tab.id
                  ? "bg-theme-primary text-stone-950 border-stone-950 shadow-[2px_2px_0_0_#000000] cursor-pointer"
                  : "text-stone-500 hover:text-foreground hover:bg-stone-800 border-transparent cursor-pointer"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {setupTab === "tiles" && (
          <div className="flex flex-col gap-3 h-full overflow-hidden min-h-0 p-1 px-1.5 pb-4">
            <div className="flex gap-2">
              <Button
                onClick={onRandomizeBoard}
                className="flex-1 neo-brutalism-button bg-theme-primary border-stone-950 hover:bg-theme-primary-hover text-stone-950 font-bold py-2.5 px-4 min-h-11 rounded-xl flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Randomize Board
              </Button>
              {onScanBoard && (
                <Button
                  variant="outline"
                  onClick={onScanBoard}
                  title="Scan Board Photo"
                  aria-label="Scan board photo"
                  className="neo-brutalism-button border-stone-950 bg-card text-stone-400 hover:text-stone-200 min-h-11 w-11 shrink-0 px-0 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  if (!isMuted) playClickSound();
                  onResetBoard();
                }}
                title="Reset Layout"
                aria-label="Reset layout"
                className="border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900 min-h-11 w-11 shrink-0 px-0 cursor-pointer"
              >
                <RefreshCcw className="w-4 h-4" />
              </Button>
            </div>
            {/* padding wrapper lets the card's neo-brutalist shadow breathe — overflow-visible is intentional */}
            <div className="flex-1 overflow-visible min-h-0 p-1 pb-4">
              <SidePanel tiles={looseTiles} onTileClick={onTileClick} />
            </div>
          </div>
        )}

        {setupTab === "mode" && (
          <div className="flex flex-col gap-4 h-full overflow-y-auto min-h-0 p-1 px-1.5 pb-4">
            <div className="p-3 app-surface flex flex-col gap-2">
              <div className="text-xs font-bold text-stone-200">Game Mode</div>
              <p className="text-[11px] text-stone-500 leading-normal">
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
              <div className="text-xs font-semibold text-stone-200">Active Players</div>
              <p className="text-[11px] text-stone-500 leading-normal">
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
            <div className="text-[11px] text-stone-500 leading-relaxed app-surface px-3 py-2 rounded-lg">
              <span className="text-stone-300 font-semibold">Hand cards are optional.</span> During play you can tap any board tile to navigate there instead. Use this section if you know your full card set upfront — the solver will then optimize the order to reach all your treasures in the fewest moves.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="text-sm text-stone-400 shrink-0">Select player:</div>
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
                <div className="text-xs text-stone-400">
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
                  <span className="text-[10px] text-stone-600">|</span>
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
                  <span className="text-[10px] text-stone-600 italic">No cards assigned — add below or leave empty.</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 min-h-0 pb-8">
              <div className="text-xs text-stone-400 mb-2 font-medium">Add Treasure Cards:</div>
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
                      className={`text-[10px] md:text-xs py-1 justify-start h-11 md:h-9 lg:h-8 px-2 truncate neo-brutalism-button bg-card hover:bg-stone-800 text-foreground border-2 border-stone-950 shadow-[2px_2px_0_0_#000000] ${alreadyInHand ? "bg-theme-primary text-stone-950 shadow-[1px_1px_0_0_#000000] translate-x-[1px] translate-y-[1px]" : ""}`}
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
}
