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
  // Paths rendering logic — styled as white/light-gray plastic tubes
  const getPathStyles = () => {
    const tubeStyle = "bg-stone-50 border-stone-200/25 shadow-[0_2px_4px_rgba(0,0,0,0.15),inset_0_-2px_0_rgba(0,0,0,0.12),inset_0_2px_0_rgba(255,255,255,1)]";
    switch (tile.shape) {
      case "straight":
        return (
          <div className={cn("absolute inset-y-0 left-[32%] right-[32%] border-x", tubeStyle)} />
        );
      case "corner":
        // Sweeps a smooth mathematical 1/4 arc from top center to right center
        return (
          <div className={cn("absolute top-[-50%] right-[-50%] w-[100%] h-[100%] rounded-full border-[18px] sm:border-[22px] md:border-[26px]", tubeStyle)} />
        );
      case "t-junction":
        return (
          <>
            <div className={cn("absolute inset-x-0 top-[32%] bottom-[32%] border-y", tubeStyle)} />
            <div className={cn("absolute top-0 bottom-[50%] left-[32%] right-[32%] border-x", tubeStyle)} />
          </>
        );
      default:
        return null;
    }
  };

  const getTileStyles = () => {
    let bgClass = "bg-stone-700 dark:bg-stone-800";
    let borderClass = "border-stone-600 dark:border-stone-700";
    let shadowStyle: React.CSSProperties = {};

    // 1. Color coordinates or custom starts
    if (tile.color) {
      if (tile.color === "blue") {
        bgClass = "bg-blue-600 dark:bg-blue-700";
        borderClass = "border-blue-500 dark:border-blue-600";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #1e3a8a, 0 10px 16px rgba(0,0,0,0.4)" };
      } else if (tile.color === "red") {
        bgClass = "bg-red-600 dark:bg-red-700";
        borderClass = "border-red-500 dark:border-red-600";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #991b1b, 0 10px 16px rgba(0,0,0,0.4)" };
      } else if (tile.color === "green") {
        bgClass = "bg-emerald-600 dark:bg-emerald-700";
        borderClass = "border-emerald-500 dark:border-emerald-600";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #065f46, 0 10px 16px rgba(0,0,0,0.4)" };
      } else if (tile.color === "yellow") {
        bgClass = "bg-amber-400 dark:bg-amber-500";
        borderClass = "border-amber-300 dark:border-amber-400";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #92400e, 0 10px 16px rgba(0,0,0,0.4)" };
      }
    } else {
      // 2. Playful shapes coloring matching MazeMaster
      if (tile.shape === "straight") {
        // Straight = Vibrant Blue
        bgClass = "bg-blue-500 dark:bg-blue-650";
        borderClass = "border-blue-400 dark:border-blue-550";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #1e3a8a, 0 10px 16px rgba(0,0,0,0.35)" };
      } else if (tile.shape === "corner") {
        // Corner = Emerald / Teal
        bgClass = "bg-emerald-500 dark:bg-emerald-650";
        borderClass = "border-emerald-400 dark:border-emerald-550";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #047857, 0 10px 16px rgba(0,0,0,0.35)" };
      } else if (tile.shape === "t-junction") {
        // T-junction = Golden Yellow
        bgClass = "bg-amber-400 dark:bg-amber-500";
        borderClass = "border-amber-300 dark:border-amber-400";
        if (is3D) shadowStyle = { boxShadow: "0 6px 0 #b45309, 0 10px 16px rgba(0,0,0,0.35)" };
      }
    }

    return { bgClass, borderClass, shadowStyle };
  };

  const getCornerColorClasses = () => {
    if (!tile.color) return { border: "", text: "", bg: "" };
    const map: Record<string, { border: string; text: string; bg: string }> = {
      blue:   { border: "border-blue-400",   text: "text-white",   bg: "bg-blue-600" },
      red:    { border: "border-red-400",    text: "text-white",    bg: "bg-red-600" },
      green:  { border: "border-green-400",  text: "text-white",  bg: "bg-emerald-600" },
      yellow: { border: "border-yellow-300", text: "text-stone-950", bg: "bg-yellow-400" },
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
        "relative rounded-2xl border-2 overflow-hidden flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]",
        bgClass,
        borderClass,
        isObtainedTreasure && "after:absolute after:inset-0 after:bg-stone-950/30 after:rounded-2xl after:pointer-events-none",
        is3D && "tile-3d",
        className
      )}
      style={is3D ? { ...shadowStyle, transformStyle: "preserve-3d" } : undefined}
      title={tile.isFixed ? "This preset tile is permanently glued to the board. It cannot be moved, slid, or rotated." : undefined}
    >
      {/* Rotation wrapper */}
      <div
        className={cn("absolute inset-0", !disableRotationTransition && "transition-transform duration-200")}
        style={{ transform: `rotate(${tile.rotation}deg)`, transformStyle: is3D ? "preserve-3d" : "flat" }}
      >
        {getPathStyles()}
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
                ? { transform: `rotateZ(${45 - boardRotation}deg) rotateX(-55deg) translateZ(6px)` }
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
              ? { transform: `rotateZ(${45 - boardRotation}deg) rotateX(-55deg) translateZ(8px)` }
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
              ? { transform: `rotateZ(${45 - boardRotation}deg) rotateX(-55deg) translateZ(10px)` }
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
