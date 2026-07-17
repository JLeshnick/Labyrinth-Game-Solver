import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { cn } from "../lib/utils";
import { Lock } from "lucide-react";

interface TileProps {
  tile: TileData;
  onClick?: () => void;
  className?: string;
  boardRotation?: number;
  disableRotationTransition?: boolean;
  isObtainedTreasure?: boolean;
  isCurrentTarget?: boolean;
}

export const Tile: React.FC<TileProps> = ({
  tile,
  onClick,
  className,
  boardRotation = 0,
  disableRotationTransition = false,
  isObtainedTreasure = false,
  isCurrentTarget = false,
}) => {
  // Paths rendering logic
  const getPathStyles = () => {
    switch (tile.shape) {
      case "straight":
        return (
          <div className="absolute inset-y-0 left-1/4 right-1/4 bg-amber-100 shadow-inner" />
        );
      case "corner":
        return (
          <>
            <div className="absolute top-0 bottom-1/4 left-1/4 right-1/4 bg-amber-100 shadow-inner" />
            <div className="absolute top-1/4 bottom-1/4 left-1/4 right-0 bg-amber-100 shadow-inner" />
          </>
        );
      case "t-junction":
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
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "relative rounded-md shadow-sm border border-amber-900 overflow-hidden flex items-center justify-center transition-opacity",
        tile.isFixed ? "bg-amber-800" : "bg-amber-700",
        isObtainedTreasure && "after:absolute after:inset-0 after:bg-stone-950/30 after:rounded-md after:pointer-events-none",
        className
      )}
      title={tile.isFixed ? "This preset tile is permanently glued to the board. It cannot be moved, slid, or rotated." : undefined}
    >
      {/* Rotation wrapper */}
      <div
        className={cn("absolute inset-0", !disableRotationTransition && "transition-transform duration-200")}
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

      {/* Treasure Text Badge (Centered) */}
      {tile.treasure && (
        <div
          className={cn(
            "absolute z-10 p-1 backdrop-blur-sm rounded border text-[6px] sm:text-[8px] md:text-[9px] font-bold text-center leading-tight max-w-[90%] shadow-sm pointer-events-none uppercase tracking-wide transition-transform duration-300",
            isObtainedTreasure
              ? "line-through opacity-50 bg-stone-800/80 text-stone-400 border-stone-700/20"
              : isCurrentTarget
              ? "ring-1 ring-amber-400/60 bg-amber-900/60 text-amber-100 border-amber-500/30"
              : "bg-stone-950/85 text-amber-100 border-amber-500/20"
          )}
          style={{ transform: `rotate(${-boardRotation}deg)` }}
        >
          {isObtainedTreasure ? `✓ ${tile.treasure.name}` : tile.treasure.name}
        </div>
      )}
    </div>
  );
};

interface DraggableTileProps extends TileProps {
  disabled?: boolean;
}

export const DraggableTile: React.FC<DraggableTileProps> = ({
  disabled,
  onClick,
  className,
  ...props
}) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: props.tile.id,
    disabled: props.tile.isFixed || disabled,
    data: props.tile,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "select-none",
        isDragging ? "opacity-30" : "opacity-100",
        props.tile.isFixed ? "" : "cursor-grab active:cursor-grabbing",
        className
      )}
    >
      <Tile {...props} className="w-full h-full" />
    </div>
  );
};
