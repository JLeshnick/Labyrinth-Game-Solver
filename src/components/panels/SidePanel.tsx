import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData, UITheme } from "../../types";
import { DraggableTile } from "../board/Tile";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../ui/card";
import { cn } from "../../lib/utils";

interface SidePanelProps {
  tiles: TileData[];
  onTileClick: (id: string) => void;
  uiTheme?: UITheme;
}

export const SidePanel: React.FC<SidePanelProps> = ({ tiles, onTileClick, uiTheme }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "side_panel",
    data: { type: "panel" },
  });

  const corners = tiles.filter((t) => t.shape === "corner");
  const straights = tiles.filter((t) => t.shape === "straight");
  const tJunctions = tiles.filter((t) => t.shape === "t-junction");

  return (
    <Card className="w-full flex flex-col h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-xl text-foreground">Loose Tiles</CardTitle>
        <CardDescription className="text-muted-foreground text-xs">
          Drag tiles onto the board. Click placed tiles to rotate. Leave exactly 1 spare tile here.
        </CardDescription>
      </CardHeader>
      <CardContent
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 relative px-4 pb-4 transition-colors rounded-b-xl border border-transparent",
          isOver ? "ring-2 ring-theme-primary ring-inset bg-theme-primary-10" : ""
        )}
      >
        <div className="h-full w-full overflow-y-auto pr-1 flex flex-col gap-5">
          {corners.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                <span>Right-Angle Corners</span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-bold">{corners.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {corners.map((tile) => (
                  <div key={tile.id} className="relative z-10 flex justify-center">
                    <DraggableTile
                      tile={tile}
                      onClick={() => onTileClick(tile.id)}
                      uiTheme={uiTheme}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {straights.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                <span>Straight Corridors</span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-bold">{straights.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {straights.map((tile) => (
                  <div key={tile.id} className="relative z-10 flex justify-center">
                    <DraggableTile
                      tile={tile}
                      onClick={() => onTileClick(tile.id)}
                      uiTheme={uiTheme}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tJunctions.length > 0 && (
            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-2 flex items-center justify-between">
                <span>T-Junctions</span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground font-bold">{tJunctions.length}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {tJunctions.map((tile) => (
                  <div key={tile.id} className="relative z-10 flex justify-center">
                    <DraggableTile
                      tile={tile}
                      onClick={() => onTileClick(tile.id)}
                      uiTheme={uiTheme}
                      className="w-12 h-12 sm:w-14 sm:h-14 lg:w-12 lg:h-12 xl:w-14 xl:h-14"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {tiles.length === 0 && (
            <div className="text-center text-muted-foreground py-10 text-sm">
              All tiles placed! Exactly 1 spare tile should remain.
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
