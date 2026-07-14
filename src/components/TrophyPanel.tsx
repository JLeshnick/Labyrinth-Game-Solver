import { useState } from "react";
import { Trophy, ChevronDown, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { PAWNS, TREASURES } from "../constants";
import { cn } from "../lib/utils";

interface TrophyPanelProps {
  activePlayers: string[];
  playerHands: Record<string, string[]>;
  obtainedTreasures: Record<string, string[]>;
}

const PAWN_BADGE: Record<string, string> = {
  red: "bg-red-500 text-white",
  blue: "bg-blue-500 text-white",
  green: "bg-green-500 text-white",
  yellow: "bg-yellow-400 text-stone-950",
};

export function TrophyPanel({ activePlayers, playerHands, obtainedTreasures }: TrophyPanelProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [expandedPawns, setExpandedPawns] = useState<Record<string, boolean>>(
    Object.fromEntries(activePlayers.map(p => [p, true]))
  );

  const togglePawn = (pawnId: string) => {
    setExpandedPawns(prev => ({ ...prev, [pawnId]: !prev[pawnId] }));
  };

  const totalObtained = Object.values(obtainedTreasures).flat().length;
  const totalCards = Object.values(playerHands).flat().length + totalObtained;

  return (
    <div className="overflow-hidden flex-shrink-0 px-2">
      {/* Header — clickable to collapse */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-stone-100">Obtained Treasures</span>
          {totalObtained > 0 && (
            <span className="text-xs bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full px-2 py-0.5 font-medium">
              {totalObtained}{totalCards > 0 ? `/${totalCards}` : ""}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronDown className="w-4 h-4 text-stone-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-stone-500" />
        )}
      </button>

      {isOpen && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-stone-800/60">
          {activePlayers.map(pawnId => {
            const pawn = PAWNS.find(p => p.id === pawnId);
            if (!pawn) return null;
            const obtained = obtainedTreasures[pawnId] || [];
            const remaining = playerHands[pawnId] || [];
            const hasCards = obtained.length > 0 || remaining.length > 0;
            const isExpanded = expandedPawns[pawnId] ?? true;

            return (
              <div key={pawnId} className="rounded-xl bg-stone-950/40 border border-stone-800/50 overflow-hidden">
                <button
                  onClick={() => togglePawn(pawnId)}
                  className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-stone-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <div className={cn("w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold", PAWN_BADGE[pawnId] ?? "bg-stone-500 text-white")}>
                      {pawnId[0].toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold text-stone-200">{pawn.name}</span>
                    {obtained.length > 0 && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        {obtained.length} collected
                      </span>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="w-3 h-3 text-stone-500" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-stone-500" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-3 pb-3 flex flex-col gap-1">
                    {!hasCards && (
                      <p className="text-[10px] text-stone-600 italic py-1">No cards assigned</p>
                    )}

                    {/* Obtained */}
                    {obtained.map(id => {
                      const t = TREASURES.find(x => x.id === id);
                      return (
                        <div key={id} className="flex items-center gap-2 py-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="text-xs text-emerald-300 line-through opacity-75">{t?.name ?? id}</span>
                        </div>
                      );
                    })}

                    {/* Remaining hand */}
                    {remaining.map((id, i) => {
                      const t = TREASURES.find(x => x.id === id);
                      const isNext = i === 0;
                      return (
                        <div key={id} className="flex items-center gap-2 py-0.5">
                          <Circle className={cn("w-3.5 h-3.5 flex-shrink-0", isNext ? "text-amber-400" : "text-stone-600")} />
                          <span className={cn("text-xs", isNext ? "text-amber-200 font-medium" : "text-stone-500")}>
                            {t?.name ?? id}
                            {isNext && <span className="ml-1 text-[9px] text-amber-500">(next)</span>}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {activePlayers.length === 0 && (
            <p className="text-xs text-stone-600 italic text-center py-2">No active players</p>
          )}
        </div>
      )}
    </div>
  );
}
