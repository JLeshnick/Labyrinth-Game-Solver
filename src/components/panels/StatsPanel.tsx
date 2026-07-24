import React from "react";
import { cn } from "../../lib/utils";
import { PAWNS, TREASURES } from "../../constants";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import {
  Trophy,
  Footprints,
  ArrowLeftRight,
  Gauge,
  Sparkles,
} from "lucide-react";

interface PawnStats {
  tilesMoved: number;
  shiftsUsed: number;
  treasuresFound: number;
  totalTargets: number;
}

interface StatsPanelProps {
  activePlayers: string[];
  pawnStats: Record<string, PawnStats>;
  totalShifts: number;
  obtainedTreasures: Record<string, string[]>;
}


export const StatsPanel: React.FC<StatsPanelProps> = ({
  activePlayers,
  pawnStats,
  totalShifts,
  obtainedTreasures,
}) => {
  const totalTreasuresFound = Object.values(obtainedTreasures).reduce(
    (sum, arr) => sum + arr.length,
    0
  );

  const totalTilesMoved = Object.values(pawnStats).reduce(
    (sum, s) => sum + s.tilesMoved,
    0
  );

  const getTreasureName = (id: string) => {
    const t = TREASURES.find((t) => t.id === id);
    return t ? t.name : id;
  };

  return (
    <Card className="bg-stone-900/90 border-stone-800 shadow-xl flex flex-col">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-sm font-bold text-stone-200 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-theme-primary" />
          Game Stats
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3 pt-1 space-y-3 flex-1 overflow-y-auto">
        {/* Global summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-stone-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-stone-100">{totalShifts}</div>
            <div className="text-[10px] text-stone-400 flex items-center justify-center gap-1">
              <ArrowLeftRight className="w-3 h-3" /> Shifts
            </div>
          </div>
          <div className="bg-stone-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-stone-100">{totalTilesMoved}</div>
            <div className="text-[10px] text-stone-400 flex items-center justify-center gap-1">
              <Footprints className="w-3 h-3" /> Moves
            </div>
          </div>
          <div className="bg-stone-800/60 rounded-lg p-2 text-center">
            <div className="text-lg font-bold text-amber-400">{totalTreasuresFound}</div>
            <div className="text-[10px] text-stone-400 flex items-center justify-center gap-1">
              <Trophy className="w-3 h-3" /> Found
            </div>
          </div>
        </div>

        {/* Per-player breakdown */}
        <div className="space-y-1.5">
          {activePlayers.map((color) => {
            const config = PAWNS.find((p) => p.id === color);
            const stats = pawnStats[color] || {
              tilesMoved: 0,
              shiftsUsed: 0,
              treasuresFound: 0,
              totalTargets: 0,
            };
            const efficiency =
              stats.treasuresFound > 0
                ? (stats.tilesMoved / stats.treasuresFound).toFixed(1)
                : "—";

            return (
              <div
                key={color}
                className="bg-stone-800/40 border border-stone-700/50 rounded-lg p-2"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <div className={cn("w-2.5 h-2.5 rounded-full", config?.colorClass)} />
                    <span className="text-xs font-semibold text-stone-200 uppercase">
                      {config?.name ?? color}
                    </span>
                  </div>
                  <div className="text-[10px] text-stone-500">
                    {stats.treasuresFound}/{stats.totalTargets} collected
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center">
                  <div>
                    <div className="text-xs font-bold text-stone-300">{stats.tilesMoved}</div>
                    <div className="text-[9px] text-stone-500">Tiles</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-stone-300">{stats.shiftsUsed}</div>
                    <div className="text-[9px] text-stone-500">Shifts</div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-amber-400/80">{efficiency}</div>
                    <div className="text-[9px] text-stone-500">Avg/Treasure</div>
                  </div>
                </div>

                {/* Recently found treasures */}
                {(obtainedTreasures[color]?.length ?? 0) > 0 && (
                  <div className="mt-1.5 pt-1.5 border-t border-stone-700/30">
                    <div className="flex flex-wrap gap-1">
                      {obtainedTreasures[color].map((tid) => (
                        <span
                          key={tid}
                          className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-900/30 text-amber-300/80 border border-amber-700/30 flex items-center gap-0.5"
                        >
                          <Sparkles className="w-2 h-2" />
                          {getTreasureName(tid)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};