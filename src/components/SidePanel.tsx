import React from "react";
import { useDroppable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { Tile } from "./Tile";
import { ScrollArea } from "./ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { cn } from "../lib/utils";

interface SidePanelProps {
  tiles: TileData[];
  onTileClick: (id: string) => void;
}

export const SidePanel: React.FC<SidePanelProps> = ({ tiles, onTileClick }) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "side_panel",
    data: { type: "panel" },
  });

  return (
    <Card className="w-full lg:w-[400px] flex flex-col h-full max-h-[800px] border-amber-900/20 bg-neutral-900/40 backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-2xl text-amber-50">Loose Tiles</CardTitle>
        <CardDescription className="text-amber-200/60">
          Drag these tiles onto the board. Click a placed tile to rotate it. Leave 1 spare tile here.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 min-h-0 relative">
        <div
          ref={setNodeRef}
          className={cn(
            "absolute inset-0 transition-colors rounded-md",
            isOver ? "bg-amber-500/10" : ""
          )}
        />
        <ScrollArea className="h-full w-full pr-4">
          <div className="grid grid-cols-4 sm:grid-cols-5 lg:grid-cols-4 gap-2 pb-10">
            {tiles.map((tile) => (
              <div key={tile.id} className="relative z-10">
                <Tile
                  tile={tile}
                  onClick={() => onTileClick(tile.id)}
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20"
                />
              </div>
            ))}
            {tiles.length === 0 && (
              <div className="col-span-full text-center text-amber-500/50 py-10">
                All tiles placed!
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
