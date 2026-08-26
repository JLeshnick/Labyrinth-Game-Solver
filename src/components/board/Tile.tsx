import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { TileData, UITheme } from "../../types";
import { cn } from "../../lib/utils";
import { Lock } from "lucide-react";
import { Tooltip } from "../ui/tooltip";
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
  uiTheme?: UITheme;
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
  uiTheme = "brutalist",
}) => {
  // Smoothly fade out overlay elements (banner & lock) in place, wait for board rotation animation to finish (500ms), then fade back in at new position
  const [isRotating, setIsRotating] = React.useState(false);
  const [displayRotation, setDisplayRotation] = React.useState(boardRotation);
  const prevBoardRotationRef = React.useRef(boardRotation);

  // Cumulative rotation for silky smooth clockwise/counter-clockwise spin animations
  const [cumulativeRotation, setCumulativeRotation] = React.useState<number>(tile.rotation);
  const prevTileRotationRef = React.useRef(tile.rotation);
  const prevTileIdRef = React.useRef(tile.id);

  React.useEffect(() => {
    if (prevTileIdRef.current !== tile.id) {
      prevTileIdRef.current = tile.id;
      prevTileRotationRef.current = tile.rotation;
      setCumulativeRotation(tile.rotation);
      return;
    }

    const prev = prevTileRotationRef.current;
    const current = tile.rotation;
    if (prev !== current) {
      let diff = current - (prev % 360);
      if (diff < 0) diff += 360;
      if (diff === 270) diff = -90;
      setCumulativeRotation((c) => c + diff);
      prevTileRotationRef.current = current;
    }
  }, [tile.id, tile.rotation]);

  React.useEffect(() => {
    if (prevBoardRotationRef.current !== boardRotation) {
      const targetRotation = boardRotation;
      setIsRotating(true);

      // Keep hidden while board is rotating (switch displayRotation near end of spin)
      const timer = setTimeout(() => {
        setDisplayRotation(targetRotation);
        prevBoardRotationRef.current = targetRotation;
        requestAnimationFrame(() => {
          setIsRotating(false);
        });
      }, 420);

      return () => clearTimeout(timer);
    }
  }, [boardRotation]);
  // Paths rendering logic — styled as a unified, continuous corridor with a thick Brutalist outline
  const getPathSVG = () => {
    const fillClass = "tile-corridor-fill";
    const strokeClass = "stroke-stone-950";
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
              d="M 32 -5 H 68 V 22 A 10 10 0 0 0 78 32 H 105 V 68 H 68 A 36 36 0 0 1 32 32 Z"
              className={fillClass}
            />
            {/* Outer curved wall */}
            <path
              d="M 32 -5 V 32 A 36 36 0 0 0 68 68 H 105"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Inner curved wall */}
            <path
              d="M 68 -5 V 22 A 10 10 0 0 0 78 32 H 105"
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
              d="M -5 68 H 105 V 32 H 82 A 14 14 0 0 1 68 18 V -5 H 32 V 18 A 14 14 0 0 1 18 32 H -5 Z"
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
            {/* Left curved corner wall */}
            <path
              d="M -5 32 H 18 A 14 14 0 0 0 32 18 V -5"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
            {/* Right curved corner wall */}
            <path
              d="M 105 32 H 82 A 14 14 0 0 1 68 18 V -5"
              fill="none"
              className={strokeClass}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
            />
          </svg>
        );
      default:
        return null;
    }
  };

  const isSimplistic = uiTheme === "simplistic";

  const getTileStyles = () => {
    let bgClass = "bg-card";
    let borderClass = isSimplistic ? "border border-border/80" : "border-2 border-stone-950";
    let shadowStyle: React.CSSProperties = {};

    // 1. Pawn start corner presets keep their team color background
    if (tile.color) {
      if (tile.color === "blue") {
        bgClass = isSimplistic ? "bg-blue-600/90 text-white" : "bg-blue-600 text-white";
      } else if (tile.color === "red") {
        bgClass = isSimplistic ? "bg-red-600/90 text-white" : "bg-red-600 text-white";
      } else if (tile.color === "green") {
        bgClass = isSimplistic ? "bg-emerald-600/90 text-white" : "bg-emerald-600 text-white";
      } else if (tile.color === "yellow") {
        bgClass = isSimplistic ? "bg-amber-400/90 text-stone-950" : "bg-amber-400 text-stone-950";
      }
    } else {
      // 2. Standard tiles: bg-card uses --card CSS variable (dark: #1b1917, light: #ffffff)
      bgClass = "bg-card";
    }

    if (is3D) {
      shadowStyle = {
        boxShadow: isSimplistic ? "0 4px 12px rgba(0,0,0,0.2)" : "0 6px 0 0 #000000, 0 8px 12px rgba(0,0,0,0.35)",
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
        "relative transition-all duration-150 flex items-center justify-center select-none group/tile",
        isSimplistic ? "rounded-xl" : "rounded-2xl",
        bgClass,
        borderClass,
        isObtainedTreasure && "after:absolute after:inset-0 after:bg-stone-950/30 after:rounded-xl after:pointer-events-none",
        is3D
          ? "tile-3d"
          : isSimplistic
          ? "shadow-xs hover:shadow-sm hover:scale-[1.02] active:scale-[0.98]"
          : "shadow-[4px_4px_0_0_#000000] dark:shadow-[4px_4px_0_0_#292524] hover:translate-x-[-1.5px] hover:translate-y-[-1.5px] hover:shadow-[5.5px_5.5px_0_0_#44403c] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[2px_2px_0_0_#292524]",
        className
      )}
      style={is3D ? { ...shadowStyle, transformStyle: "preserve-3d" } : undefined}
    >
      {/* Inner container with overflow-hidden to cleanly clip the SVG paths */}
      <div className={cn("absolute inset-0 overflow-hidden", isSimplistic ? "rounded-[11px]" : "rounded-[14px]")} style={{ transformStyle: is3D ? "preserve-3d" : "flat" }}>
        {/* Path rotation wrapper */}
        <div
          className="absolute inset-0"
          style={{
            transform: `rotate(${disableRotationTransition ? tile.rotation : cumulativeRotation}deg)`,
            transition: disableRotationTransition ? "none" : "transform 280ms cubic-bezier(0.34, 1.4, 0.64, 1)",
            transformStyle: is3D ? "preserve-3d" : "flat",
          }}
        >
          {getPathSVG()}
        </div>
      </div>

      {/* Counter-rotating overlay container for screen-upright elements (Lock badge & Treasure banner) */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none z-10 transform-gpu transition-opacity duration-400 ease-in-out",
          isRotating ? "opacity-0" : "opacity-100"
        )}
        style={{ transform: `rotate(${-displayRotation}deg)` }}
      >
        {/* Fixed tile lock badge — anchored to top-right of screen-oriented tile */}
        {tile.isFixed && (
          <Tooltip content="Permanently fixed preset tile (glued to board)" side="top" containerClassName="absolute top-1 right-1 z-[100]">
            <div className={cn(
              "p-0.5 rounded-md pointer-events-auto cursor-help flex items-center justify-center",
              isSimplistic
                ? "bg-slate-900/90 border border-slate-700/60 text-amber-400 shadow-xs"
                : "bg-stone-950 border-2 border-stone-950 text-amber-400 shadow-[2px_2px_0_0_#000000]"
            )}>
              <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
            </div>
          </Tooltip>
        )}

        {/* Treasure name banner — anchored to bottom edge facing the user */}
        {tile.treasure && (
          <div
            className={cn(
              "absolute bottom-0 inset-x-0 h-3.5 flex items-center justify-center pointer-events-none overflow-hidden",
              isSimplistic ? "border-t border-border/80 rounded-b-[11px] backdrop-blur-xs" : "border-t border-stone-950 rounded-b-[14px]",
              isObtainedTreasure
                ? "bg-stone-600/70 opacity-50"
                : isCurrentTarget
                ? "bg-theme-primary text-stone-950"
                : isSimplistic
                ? "bg-amber-400/80 text-stone-950"
                : "bg-amber-300 text-stone-950"
            )}
            title={tile.treasure.name}
          >
            <span
              className={cn(
                "text-[8px] sm:text-[9px] font-black text-stone-950 leading-none text-center select-none uppercase tracking-tighter inline-block whitespace-nowrap px-0.5 font-mono",
                isObtainedTreasure && "line-through opacity-70"
              )}
            >
              {TREASURE_SHORT_NAMES[tile.treasure.id] ?? tile.treasure.name}
            </span>
          </div>
        )}
      </div>
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
