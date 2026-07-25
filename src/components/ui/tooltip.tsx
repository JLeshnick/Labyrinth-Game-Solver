import React from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "bottom-right" | "left" | "right";
  className?: string;
}

export function Tooltip({ content, children, side = "bottom", className }: TooltipProps) {
  if (!content) return children;

  const posClass =
    side === "top"          ? "bottom-full mb-2 left-1/2 -translate-x-1/2" :
    side === "left"         ? "right-full mr-2 top-1/2 -translate-y-1/2" :
    side === "right"        ? "left-full ml-2 top-1/2 -translate-y-1/2" :
    side === "bottom-right" ? "top-full mt-2 right-0" :
    /* bottom */              "top-full mt-2 left-1/2 -translate-x-1/2";

  return (
    <div className="relative group inline-flex">
      {children}
      <div
        role="tooltip"
        className={cn(
          "absolute z-50 px-2 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap",
          "app-dialog-panel neo-brutalism-card text-stone-200",
          "invisible opacity-0 group-hover:visible group-hover:opacity-100",
          "transition-opacity duration-100 pointer-events-none",
          posClass,
          className
        )}
      >
        {content}
      </div>
    </div>
  );
}
