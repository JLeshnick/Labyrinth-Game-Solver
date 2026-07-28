import React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "bottom-left" | "bottom-right" | "left" | "right" | "left-start" | "right-start" | "left-end" | "right-end";
  className?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
}

export function Tooltip({ content, children, side = "bottom", className, containerClassName, style }: TooltipProps) {
  if (!content) return children;

  const posClass =
    side === "top"          ? "bottom-full mb-2 left-1/2 -translate-x-1/2" :
    side === "left"         ? "right-full mr-2 top-1/2 -translate-y-1/2" :
    side === "left-start"   ? "right-full mr-2 top-0" :
    side === "left-end"     ? "right-full mr-2 bottom-0" :
    side === "right"        ? "left-full ml-2 top-1/2 -translate-y-1/2" :
    side === "right-start"  ? "left-full ml-2 top-0" :
    side === "right-end"    ? "left-full ml-2 bottom-0" :
    side === "bottom-right" ? "top-full mt-2 right-0" :
    side === "bottom-left"  ? "top-full mt-2 left-0" :
    /* bottom */              "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <div className={cn("relative group/tooltip inline-flex", containerClassName)} style={style}>
      {children}
      <div
        role="tooltip"
        className={cn(
          "absolute z-[99999] px-3 py-2 rounded-xl text-[11px] font-bold min-w-[180px] max-w-[260px] whitespace-normal text-left leading-tight shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8)]",
          "app-dialog-panel neo-brutalism-card text-stone-200 border-2 border-stone-950 bg-stone-900",
          "invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100",
          "transition-opacity duration-150 pointer-events-none",
          posClass,
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}
