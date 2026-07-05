import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { TileData } from "../types";
import { cn } from "../lib/utils";

interface TileProps {
  tile: TileData;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}

export const Tile: React.FC<TileProps> = ({ tile, onClick, className, disabled }) => {
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
      onClick={() => {
        // Prevent drag events from triggering click
        if (transform && (Math.abs(transform.x) > 5 || Math.abs(transform.y) > 5)) return;
        onClick?.();
      }}
      className={cn(
        "relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-md shadow-sm border border-amber-900 overflow-hidden flex items-center justify-center transition-opacity",
        isDragging ? "opacity-50" : "opacity-100",
        tile.isFixed ? "bg-amber-800" : "bg-amber-700 cursor-grab active:cursor-grabbing",
        className
      )}
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
            "absolute w-6 h-6 sm:w-8 sm:h-8 rounded-full border-2 border-white shadow-md z-10",
            getCornerColor()
          )}
        />
      )}

      {/* Treasure Text */}
      {tile.treasure && (
        <div className="absolute z-10 p-1 bg-white/80 backdrop-blur-sm rounded text-[8px] sm:text-[10px] md:text-xs font-bold text-center leading-tight max-w-[90%] text-amber-950 shadow-sm pointer-events-none">
          {tile.treasure.name}
        </div>
      )}
    </div>
  );
};
