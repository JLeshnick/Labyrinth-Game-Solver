// Responsive model: this panel renders in two DOM sites — the phone bottom
// sheet (< md) and the tablet/desktop side column (md+). Unprefixed classes
// target the phone sheet; `md:` targets the tablet column; `lg:` targets the
// wider desktop column. Interactive controls get a 44px phone floor.
import { Sparkles, Layers, Users, Compass, Play, RotateCw, Camera } from "lucide-react";
import { SidePanel } from "./SidePanel";
import { Button } from "./ui/button";
import { PAWNS, TREASURES } from "../constants";
import { playClickSound } from "../utils/audio";
import type { TileData } from "../types";

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
  setupTab: "tiles" | "players" | "cards";
  setSetupTab: (tab: "tiles" | "players" | "cards") => void;
  canStartGame: boolean;
  onStartGame: () => void;
  showToast: (msg: string) => void;
  onScanBoard?: () => void;
  compact?: boolean;
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
  setupTab,
  setSetupTab,
  canStartGame,
  onStartGame,
  showToast,
  onScanBoard,
  compact = false,
}: SetupPanelProps) {

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
          className="bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold min-h-9 rounded-lg flex items-center gap-1.5 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
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
        <h3 className="font-bold text-stone-200 flex items-center gap-1.5 border-b border-stone-800 pb-1.5">
          <Sparkles className="w-3.5 h-3.5 text-theme-primary animate-pulse" />
          Setup Wizard & Checklist
        </h3>
        <div className="flex flex-col gap-1.5 mt-0.5">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${looseTiles.length === 1 ? "bg-green-500 shadow-sm shadow-green-500/50" : "bg-theme-primary animate-pulse"}`} />
            <span className="text-stone-300">
              Movable Tiles Placed: {34 - looseTiles.length}/33{" "}
              {looseTiles.length === 1 ? "✓" : `(needs ${looseTiles.length - 1} more)`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${activePlayers.length > 0 ? "bg-green-500 shadow-sm shadow-green-500/50" : "bg-red-500 animate-pulse"}`} />
            <span className="text-stone-300">
              Active Players: {activePlayers.length} {activePlayers.length > 0 ? "✓" : "✗"}
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
          className="w-full bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold py-2.5 px-4 min-h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-theme-glow cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none mt-1"
        >
          <Play className="w-4 h-4" />
          Start Game
        </Button>
      </div>

      {/* Tab bar */}
      <div className="flex items-center bg-stone-950/60 rounded-full p-1 border border-stone-800 self-start">
        {([
          { id: "tiles", label: "Tiles", icon: <Layers className="w-3.5 h-3.5" /> },
          { id: "players", label: "Players", icon: <Users className="w-3.5 h-3.5" /> },
          { id: "cards", label: "Cards", icon: <Compass className="w-3.5 h-3.5" /> },
        ] as const).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSetupTab(tab.id)}
            className={`flex items-center justify-center gap-1.5 px-3 md:px-4 py-2 md:py-1.5 min-h-11 md:min-h-0 rounded-full text-xs md:text-sm font-medium transition-all cursor-pointer ${
              setupTab === tab.id
                ? "bg-theme-primary text-stone-950 font-semibold shadow-sm"
                : "text-stone-400 hover:text-stone-200 hover:bg-stone-900/40"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {setupTab === "tiles" && (
          <div className="flex flex-col gap-3 h-full overflow-hidden min-h-0">
            <div className="flex gap-2">
              <Button
                onClick={onRandomizeBoard}
                className="flex-1 bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold py-2.5 px-4 min-h-11 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-theme-glow cursor-pointer transition-colors"
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
                  className="border-stone-800 text-stone-400 hover:text-stone-200 hover:bg-stone-900 min-h-11 w-11 shrink-0 px-0 cursor-pointer"
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
                <RotateCw className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-hidden">
              <SidePanel tiles={looseTiles} onTileClick={onTileClick} />
            </div>
          </div>
        )}

        {setupTab === "players" && (
          <div className="flex flex-col gap-4 h-full overflow-y-auto min-h-0">
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
                      className={`flex items-center justify-between p-2.5 min-h-11 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                        isActive
                          ? "border-theme-primary bg-theme-primary-10 text-theme-primary"
                          : "border-stone-800 bg-stone-950/40 hover:bg-stone-900 text-stone-400 hover:text-stone-200"
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
          <div className="flex flex-col gap-4 h-full overflow-hidden min-h-0">
            <div className="flex items-center gap-2">
              <div className="text-sm text-stone-400">Select player active hand:</div>
              <div className="flex gap-1 ml-auto">
                {activePlayers.map((p) => (
                  <button
                    key={p}
                    onClick={() => { if (!isMuted) playClickSound(); setActivePawn(p); }}
                    className={`w-11 h-11 text-sm md:w-8 md:h-8 md:text-xs rounded-full font-bold flex items-center justify-center transition-all ${PAWNS.find((pw) => pw.id === p)?.colorClass ?? "bg-stone-500"} ${activePawn === p ? "ring-2 ring-white" : "opacity-50"}`}
                  >
                    {p[0].toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 app-surface">
              <div className="text-xs text-stone-400">
                Player <span className="capitalize text-theme-primary font-bold">{activePawn}</span>'s hand list (
                {playerHands[activePawn]?.length ?? 0} cards):
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(playerHands[activePawn] ?? []).map((cardId) => {
                  const name = TREASURES.find((t) => t.id === cardId)?.name ?? cardId;
                  return (
                    <div key={cardId} className="text-[10px] bg-theme-primary-10 border border-theme-primary-20 text-theme-primary font-semibold px-2 py-0.5 rounded flex items-center gap-1">
                      {name}
                      <button
                        onClick={() => onRemoveCard(cardId)}
                        aria-label={`Remove ${name}`}
                        className="text-stone-400 hover:text-stone-200 inline-flex items-center justify-center min-w-6 min-h-6 -my-1 -mr-1 rounded cursor-pointer"
                      >×</button>
                    </div>
                  );
                })}
                {(!playerHands[activePawn] || playerHands[activePawn].length === 0) && (
                  <span className="text-[10px] text-stone-600">No cards in hand. Click below to add.</span>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
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
                      className={`text-[10px] md:text-xs py-1 border-stone-800 justify-start h-11 md:h-9 lg:h-8 px-2 truncate ${alreadyInHand ? "bg-theme-primary-20 border-theme-primary-40 text-theme-primary" : "hover:bg-stone-900 text-stone-300"}`}
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
