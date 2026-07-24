import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { TileData } from "../../types";
import { cn } from "../../lib/utils";
import { Lock } from "lucide-react";
import { TREASURE_SHORT_NAMES } from "../../constants";

interface TileProps {
  tile: TileData;
  onClick?: () => void;
  className?: string;
  boardRotation?: number;
  disableRotationTransition?: boolean;
  isObtainedTreasure?: boolean;
  isCurrentTarget?: boolean;
  is3D?: boolean;
}

export const Tile: React.FC<TileProps> = ({
  tile,
  onClick,
  className,
  boardRotation = 0,
  disableRotationTransition = false,
  isObtainedTreasure = false,
  isCurrentTarget = false,
  is3D = false,
}) => {
  // Paths rendering logic — styled as a unified, continuous corridor with a thick Brutalist outline
  const getPathSVG = () => {
    const fillClass = "fill-stone-50 dark:fill-stone-100";
    const strokeClass = "stroke-stone-950 dark:stroke-stone-950";
    const strokeWidth = 5.5;

    switch (tile.shape) {
      case "straight":
        return (
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <rect
              x="32"
              y="-5"
              width="36"
              height="110"
              className={fillClass}
            />
            <line
              x1="32"
              y1="-5"
              x2="32"
              y2="105"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <line
              x1="68"
              y1="-5"
              x2="68"
              y2="105"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </svg>
        );
      case "corner":
        return (
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <path
              d="M 32 -5 H 68 A 32 32 0 0 0 105 32 V 68 A 68 68 0 0 1 32 -5 Z"
              className={fillClass}
            />
            <path
              d="M 32 -5 A 68 68 0 0 0 105 68"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M 68 -5 A 32 32 0 0 0 105 32"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </svg>
        );
      case "t-junction":
        return (
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none overflow-visible">
            <path
              d="M -5 68 H 105 V 32 H 68 V -5 H 32 V 32 H -5 Z"
              className={fillClass}
            />
            {/* Bottom wall */}
            <line
              x1="-5"
              y1="68"
              x2="105"
              y2="68"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Left corner wall */}
            <path
              d="M -5 32 H 32 V -5"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Right corner wall */}
            <path
              d="M 105 32 H 68 V -5"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const getTileStyles = () => {
    let bgClass = "bg-stone-200 dark:bg-stone-850";
    let borderClass = "border-2 border-stone-950 dark:border-stone-950";
    let shadowStyle: React.CSSProperties = {};

    // 1. Pawn start corner presets keep their team color background
    if (tile.color) {
      if (tile.color === "blue") {
        bgClass = "bg-blue-600 dark:bg-blue-700 text-white";
      } else if (tile.color === "red") {
        bgClass = "bg-red-600 dark:bg-red-700 text-white";
      } else if (tile.color === "green") {
        bgClass = "bg-emerald-600 dark:bg-emerald-700 text-white";
      } else if (tile.color === "yellow") {
        bgClass = "bg-amber-400 dark:bg-amber-500 text-stone-950";
      }
    } else {
      // 2. All standard playable tiles are a uniform, clean warm stone gray block
      bgClass = "bg-stone-200 dark:bg-stone-900";
    }

    if (is3D) {
      shadowStyle = {
        boxShadow: "0 6px 0 0 #000000, 0 8px 12px rgba(0,0,0,0.35)",
      };
    }

    return { bgClass, borderClass, shadowStyle };
  };

  const { bgClass, borderClass, shadowStyle } = getTileStyles();

  return (
    <div
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        "relative rounded-2xl border-2 transition-all duration-150 flex items-center justify-center select-none",
        bgClass,
        borderClass,
        isObtainedTreasure && "after:absolute after:inset-0 after:bg-stone-950/30 after:rounded-2xl after:pointer-events-none",
        is3D 
          ? "tile-3d" 
          : "shadow-[4px_4px_0_0_#000000] dark:shadow-[4px_4px_0_0_#000000] hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[5.5px_5.5px_0_0_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#000000]",
        className
      )}
      style={is3D ? { ...shadowStyle, transformStyle: "preserve-3d" } : undefined}
      title={tile.isFixed ? "This preset tile is permanently glued to the board. It cannot be moved, slid, or rotated." : undefined}
    >
      {/* Inner container with overflow-hidden to cleanly clip the SVG paths */}
      <div className="absolute inset-0 rounded-[14px] overflow-hidden" style={{ transformStyle: is3D ? "preserve-3d" : "flat" }}>
        {/* Rotation wrapper */}
        <div
          className={cn("absolute inset-0", !disableRotationTransition && "transition-transform duration-200")}
          style={{ transform: `rotate(${tile.rotation}deg)`, transformStyle: is3D ? "preserve-3d" : "flat" }}
        >
          {getPathSVG()}
        </div>
      </div>


      {/* Fixed tile lock badge */}
      {tile.isFixed && (
        <div
          className="absolute top-1 right-1 p-0.5 bg-stone-950 border-2 border-stone-950 rounded-md text-amber-400 shadow-[2px_2px_0_0_#000000] z-20 pointer-events-auto cursor-help"
          style={
            is3D
              ? { transform: `rotateZ(${30 - boardRotation}deg) rotateX(-45deg) translateZ(8px)` }
              : { transform: `rotate(${-boardRotation}deg)` }
          }
          title="This preset tile is permanently glued to the board. It cannot be moved, slid, or rotated."
        >
          <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
        </div>
      )}

      {/* Treasure name banner — sits across the bottom of the tile */}
      {tile.treasure && (
        <div
          className={cn(
            "absolute bottom-0 inset-x-0 z-10 flex items-center justify-center px-1 py-0.5 border-t-2 border-stone-950 transition-all duration-300 pointer-events-none rounded-b-2xl",
            isObtainedTreasure
              ? "bg-stone-600 opacity-50"
              : isCurrentTarget
              ? "bg-amber-400"
              : "bg-amber-300"
          )}
          style={
            is3D
              ? { transform: `rotateZ(${30 - boardRotation}deg) rotateX(-45deg) translateZ(10px)` }
              : { transform: `rotate(${-boardRotation}deg)` }
          }
          title={tile.treasure.name}
        >
          <span className={cn(
            "text-[9px] sm:text-[10px] font-black text-stone-950 leading-tight text-center select-none uppercase tracking-tight",
            isObtainedTreasure && "line-through opacity-70"
          )}>
            {TREASURE_SHORT_NAMES[tile.treasure.id] ?? tile.treasure.name}
          </span>
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
