import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData } from "../../types";
import { DraggableTile } from "../board/Tile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { cn } from "../../lib/utils";

interface SidePanelProps {
  tiles: TileData[];
  onTileClick: (id: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ tiles, onTileClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "side_panel",
    data: { type: "panel" },
  });

  const corners = tiles.filter((t) => t.shape === "corner");
  const straights = tiles.filter((t) => t.shape === "straight");
  const tJunctions = tiles.filter((t) => t.shape === "t-junction");

  return (
    <Card className="w-full flex flex-col h-full border-stone-800/80 bg-stone-950/40 backdrop-blur-xl shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-stone-200">Loose Tiles</CardTitle>
        <CardDescription className="text-stone-400 text-xs">
          Drag tiles onto the board. Click placed tiles to rotate. Leave exactly 1 spare tile here.
        </CardDescription>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 relative px-4 pb-4 transition-colors rounded-b-lg border border-transparent",
          isOver ? "bg-theme-primary/5 border-dashed border-theme-primary/30" : ""
        )}
      >
        <div className="h-full w-full overflow-y-auto pr-1 flex flex-col gap-5">
          {corners.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-400 mb-2 flex items-center justify-between">
                <span>Right-Angle Corners</span>
                <span className="bg-stone-900 px-1.5 py-0.5 rounded text-[10px] text-stone-300 font-bold">{corners.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {corners.map((tile) => (
                  <div key={tile.id} className="relative z-10 flex justify-center">
                    <DraggableTile
                      tile={tile}
                      onClick={() => onTileClick(tile.id)}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {straights.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-400 mb-2 flex items-center justify-between">
                <span>Straight Corridors</span>
                <span className="bg-stone-900 px-1.5 py-0.5 rounded text-[10px] text-stone-300 font-bold">{straights.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {straights.map((tile) => (
                  <div key={tile.id} className="relative z-10 flex justify-center">
                    <DraggableTile
                      tile={tile}
                      onClick={() => onTileClick(tile.id)}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tJunctions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-stone-400 mb-2 flex items-center justify-between">
                <span>T-Junctions</span>
                <span className="bg-stone-900 px-1.5 py-0.5 rounded text-[10px] text-stone-300 font-bold">{tJunctions.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {tJunctions.map((tile) => (
                  <div key={tile.id} className="relative z-10 flex justify-center">
                    <DraggableTile
                      tile={tile}
                      onClick={() => onTileClick(tile.id)}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tiles.length === 0 && (
            <div className="text-center text-stone-500 py-10 text-sm">
              All tiles placed!
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
