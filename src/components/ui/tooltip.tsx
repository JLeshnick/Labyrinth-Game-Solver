import React from "react";
import { cn } from "@/lib/utils";
import * as RadixTooltip from "@radix-ui/react-tooltip";

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "top-left" | "top-right" | "bottom" | "bottom-left" | "bottom-right" | "left" | "right" | "left-start" | "right-start" | "left-end" | "right-end";
  className?: string;
  containerClassName?: string;
  style?: React.CSSProperties;
}

export function Tooltip({ content, children, side = "bottom", className, containerClassName, style }: TooltipProps) {
  if (!content) return children;

  let radixSide: "top" | "right" | "bottom" | "left" = "bottom";
  let radixAlign: "start" | "center" | "end" = "center";
  
  if (side.startsWith("top")) radixSide = "top";
  if (side.startsWith("bottom")) radixSide = "bottom";
  if (side.startsWith("left")) radixSide = "left";
  if (side.startsWith("right")) radixSide = "right";
  
  if (side.includes("-left") || side.includes("-start")) radixAlign = "start";
  if (side.includes("-right") || side.includes("-end")) radixAlign = "end";

  return (
    <RadixTooltip.Provider delayDuration={150}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <div className={cn("inline-flex", containerClassName)} style={style}>
            {children}
          </div>
        </RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            side={radixSide}
            align={radixAlign}
            sideOffset={6}
            className={cn(
              "z-[999999] px-3 py-2 rounded-xl text-[11px] font-bold min-w-[180px] max-w-[260px] whitespace-normal text-left leading-tight shadow-[0_10px_25px_-5px_rgba(0,0,0,0.8)]",
              "app-dialog-panel neo-brutalism-card text-stone-200 border-2 border-stone-950 bg-stone-900",
              "animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              className
            )}
          >
            {content}
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}
