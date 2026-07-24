import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { TileData } from "../../types";
import { cn } from "../../lib/utils";
import { Lock } from "lucide-react";

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
              d="M 32 -5 H 68 A 32 32 0 0 1 105 32 V 68 A 68 68 0 0 0 32 -5 Z"
              className={fillClass}
            />
            <path
              d="M 32 -5 A 68 68 0 0 1 105 68"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            <path
              d="M 68 -5 A 32 32 0 0 1 105 32"
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
  };  const getTileStyles = () => {
    let bgClass = "bg-stone-200 dark:bg-stone-850";
    let borderClass = "border-2 border-stone-950 dark:border-stone-950";
    let shadowStyle: React.CSSProperties = {};

    // 1. Pawn start corner presets keep their team color background
    if (tile.color) {
      if (tile.color === "blue") {
        bgClass = "bg-blue-600 dark:bg-blue-700 text-white";
      } else if (tile.color === "red") {
        bgClass = "bg-red-650 dark:bg-red-750 text-white";
      } else if (tile.color === "green") {
        bgClass = "bg-emerald-600 dark:bg-emerald-700 text-white";
      } else if (tile.color === "yellow") {
        bgClass = "bg-amber-400 dark:bg-amber-500 text-stone-950";
      }
    } else {
      // 2. All standard playable tiles are a uniform, clean warm stone gray block
      bgClass = "bg-stone-200 dark:bg-stone-800";
    }

    if (is3D) {
      shadowStyle = {
        boxShadow: "0 6px 0 0 #000000, 0 8px 12px rgba(0,0,0,0.35)",
      };
    }

    return { bgClass, borderClass, shadowStyle };
  };

  const getCornerColorClasses = () => {
    if (!tile.color) return { border: "", text: "", bg: "" };
    const map: Record<string, { border: string; text: string; bg: string }> = {
      blue:   { border: "border-stone-950",   text: "text-white",   bg: "bg-blue-600" },
      red:    { border: "border-stone-950",    text: "text-white",    bg: "bg-red-600" },
      green:  { border: "border-stone-950",  text: "text-white",  bg: "bg-emerald-600" },
      yellow: { border: "border-stone-950", text: "text-stone-950", bg: "bg-yellow-400" },
    };
    return map[tile.color] ?? { border: "", text: "", bg: "" };
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

      {/* Home corner marker — embedded flat into the tile corner, clearly distinct from pawns */}
      {tile.color && (() => {
        const { border, text, bg } = getCornerColorClasses();
        const label = tile.color[0].toUpperCase();
        return (
          <div
            className={cn(
              "absolute bottom-1 right-1 w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center",
              "border-2 z-10 shadow-md transition-all duration-300 pointer-events-none font-bold",
              bg, border
            )}
            style={
              is3D
                ? { transform: `rotateZ(${30 - boardRotation}deg) rotateX(-45deg) translateZ(6px)` }
                : { transform: `rotate(${-boardRotation}deg)` }
            }
          >
            <span className={cn("text-[9px] sm:text-[10px] font-black leading-none select-none", text)}>
              {label}
            </span>
          </div>
        );
      })()}

      {/* Fixed tile lock badge */}
      {tile.isFixed && (
        <div
          className="absolute top-1 right-1 p-1 bg-stone-900/90 border border-stone-700/60 rounded-full text-amber-400 shadow-md z-20 pointer-events-auto cursor-help transition-all duration-300"
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

      {/* Treasure Gold Coin Medallion (Centered) */}
      {tile.treasure && (
        <div
          className={cn(
            "absolute z-10 w-9 h-9 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border-2 border-amber-200 shadow-md font-bold text-center select-none uppercase tracking-wide transition-all duration-300 pointer-events-none",
            isObtainedTreasure
              ? "opacity-40 bg-stone-700 text-stone-400 border-stone-500 line-through"
              : isCurrentTarget
              ? "bg-gradient-to-b from-amber-200 via-amber-400 to-amber-500 text-stone-950 font-black scale-110 ring-2 ring-white/50"
              : "bg-gradient-to-b from-yellow-300 to-amber-500 text-amber-950"
          )}
          style={
            is3D
              ? { transform: `rotateZ(${30 - boardRotation}deg) rotateX(-45deg) translateZ(10px)` }
              : { transform: `rotate(${-boardRotation}deg)` }
          }
        >
          <div className="w-full text-center px-1 font-extrabold leading-[1] truncate overflow-hidden text-[6px] sm:text-[7.5px] uppercase">
            {tile.treasure.name}
          </div>
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
