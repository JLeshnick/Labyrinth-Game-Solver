import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { cn } from "../lib/utils";
import { Lock } from "lucide-react";

const TREASURE_SHORT_NAMES: Record<string, string> = {
  book: "Book",
  coins: "Coins",
  map: "Map",
  crown: "Crown",
  keys: "Keys",
  skull: "Skull",
  ring: "Ring",
  chest: "Chest",
  emerald: "Jewel",
  sword: "Sword",
  menorah: "Menorah",
  helmet: "Helmet",
  lizard: "Lizard",
  moth: "Moth",
  owl: "Owl",
  scarab: "Scarab",
  rat: "Rat",
  spider: "Spider",
  bat: "Bat",
  dragon: "Dragon",
  ghost_bottle: "Ghost (B)",
  ghost_waving: "Ghost (W)",
  lady_pig: "Pig",
  sorceress: "Sorceress"
};

interface TileProps {
  tile: TileData;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  boardRotation?: number;
}

export const Tile: React.FC<TileProps> = ({ tile, onClick, className, disabled, boardRotation = 0 }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: tile.id,
    disabled: tile.isFixed || disabled,
    data: tile,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  // Paths rendering logic
  const getPathStyles = () => {
    switch (tile.shape) {
      case "straight":
        // 0 deg: Top to Bottom. A vertical strip in the middle.
        return (
          <div className="absolute inset-y-0 left-1/4 right-1/4 bg-amber-100 shadow-inner" />
        );
      case "corner":
        // 0 deg: Up to Right.
        return (
          <>
            <div className="absolute top-0 bottom-1/4 left-1/4 right-1/4 bg-amber-100 shadow-inner" />
            <div className="absolute top-1/4 bottom-1/4 left-1/4 right-0 bg-amber-100 shadow-inner" />
          </>
        );
      case "t-junction":
        // 0 deg: Left, Up, Right.
        return (
          <>
            <div className="absolute top-1/4 bottom-1/4 left-0 right-0 bg-amber-100 shadow-inner" />
            <div className="absolute top-0 bottom-1/4 left-1/4 right-1/4 bg-amber-100 shadow-inner" />
          </>
        );
      default:
        return null;
    }
  };

  const getCornerColor = () => {
    if (!tile.color) return "";
    const colors = {
      blue: "bg-blue-500",
      red: "bg-red-500",
      green: "bg-green-500",
      yellow: "bg-yellow-400",
    };
    return colors[tile.color];
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        // Prevent drag events from triggering click
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) return;
        onClick?.();
      }}
      className={cn(
        "relative w-full h-full rounded-md shadow-sm border border-amber-900 overflow-hidden flex items-center justify-center transition-opacity",
        isDragging ? "opacity-50" : "opacity-100",
        tile.isFixed ? "bg-amber-800" : "bg-amber-700 cursor-grab active:cursor-grabbing",
        className
      )}
      title={tile.isFixed ? "This preset tile is permanently glued to the board. It cannot be moved, slid, or rotated." : undefined}
    >
      {/* Rotation wrapper */}
      <div
        className="absolute inset-0 transition-transform duration-200"
        style={{ transform: `rotate(${tile.rotation}deg)` }}
      >
        {getPathStyles()}
      </div>
 
      {/* Starting Corner Colors */}
      {tile.color && (
        <div
          className={cn(
            "absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md z-10 transition-transform duration-300",
            getCornerColor()
          )}
          style={{ transform: `rotate(${-boardRotation}deg)` }}
        />
      )}
 
      {/* Fixed tile lock badge */}
      {tile.isFixed && (
        <div
          className="absolute top-1 right-1 p-0.5 bg-stone-950/70 border border-stone-800/35 rounded-full text-amber-500/80 z-20 pointer-events-auto cursor-help transition-transform duration-300"
          style={{ transform: `rotate(${-boardRotation}deg)` }}
          title="This preset tile is permanently glued to the board. It cannot be moved, slid, or rotated."
        >
          <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </div>
      )}
 
      {/* Treasure Render */}
      {tile.treasure && (
        <div 
          className="absolute z-10 inset-0 flex items-center justify-center p-1 pointer-events-none transition-transform duration-300"
          style={{ transform: `rotate(${-boardRotation}deg)` }}
        >
          <div className="px-1 py-0.5 sm:px-1.5 sm:py-0.5 bg-stone-950/90 backdrop-blur-sm rounded border border-amber-500/20 shadow-md text-amber-100 uppercase tracking-wider text-[7px] sm:text-[8px] md:text-[9px] font-bold text-center leading-none max-w-[95%] transition-all">
            <span className="block sm:hidden truncate">
              {TREASURE_SHORT_NAMES[tile.treasure.id] || tile.treasure.name}
            </span>
            <span className="hidden sm:block truncate">
              {tile.treasure.name}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
