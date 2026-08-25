import React from "react";
import { Button } from "./ui/button";
import {
  Undo2,
  Redo2,
  RotateCw,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Clock,
} from "lucide-react";
import { cn } from "../lib/utils";
import { playClickSound } from "../utils/audio";

export interface MobileActionsBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isGameStarted: boolean;
  onOpenHistory: () => void;
  onRotateBoard: () => void;
  mobilePanelStop: "peek" | "expanded";
  onToggleMobilePanel: () => void;
  solutionsCount: number;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const MobileActionsBar: React.FC<MobileActionsBarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isGameStarted,
  onOpenHistory,
  onRotateBoard,
  mobilePanelStop,
  onToggleMobilePanel,
  solutionsCount,
  isMuted,
  onToggleMute,
}) => {
  return (
    <div
      className="md:hidden fixed bottom-0 left-0 right-0 app-mobile-nav px-2 flex items-center justify-around z-40"
      style={{
        paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
        paddingTop: "6px",
        height: "56px",
      }}
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={!canUndo}
        onClick={() => {
          if (!isMuted) playClickSound();
          onUndo();
        }}
        className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 disabled:opacity-30 h-auto py-1 px-3 cursor-pointer"
      >
        <Undo2 className="w-4 h-4" />
        <span className="text-[9px] font-medium">Undo</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        disabled={!canRedo}
        onClick={() => {
          if (!isMuted) playClickSound();
          onRedo();
        }}
        className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 disabled:opacity-30 h-auto py-1 px-3 cursor-pointer"
      >
        <Redo2 className="w-4 h-4" />
        <span className="text-[9px] font-medium">Redo</span>
      </Button>

      {isGameStarted && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!isMuted) playClickSound();
            onOpenHistory();
          }}
          className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 h-auto py-1 px-3 cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          <span className="text-[9px] font-medium">History</span>
        </Button>
      )}

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (!isMuted) playClickSound();
          onRotateBoard();
        }}
        className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 h-auto py-1 px-3 cursor-pointer"
      >
        <RotateCw className="w-4 h-4" />
        <span className="text-[9px] font-medium">Rotate</span>
      </Button>

      {/* Panel toggle button — expands/collapses the persistent split panel */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleMobilePanel}
        className={cn(
          "flex flex-col items-center gap-0.5 h-auto py-1 px-3 cursor-pointer relative",
          mobilePanelStop === "expanded" ? "text-theme-primary" : "text-stone-400 hover:text-stone-200"
        )}
      >
        {mobilePanelStop === "expanded" ? (
          <ChevronDownIcon className="w-4 h-4" />
        ) : (
          <ChevronUp className="w-4 h-4" />
        )}
        <span className="text-[9px] font-medium">
          {isGameStarted ? "Solver" : "Setup"}
        </span>
        {/* Badge for solver solutions */}
        {isGameStarted && solutionsCount > 0 && mobilePanelStop === "peek" && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-theme-primary text-stone-950 text-[8px] font-bold flex items-center justify-center">
            {solutionsCount}
          </span>
        )}
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={onToggleMute}
        className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 h-auto py-1 px-3 cursor-pointer"
      >
        {isMuted ? (
          <VolumeX className="w-4 h-4 text-stone-500" />
        ) : (
          <Volume2 className="w-4 h-4 text-theme-primary" />
        )}
        <span className="text-[9px] font-medium">{isMuted ? "Unmute" : "Mute"}</span>
      </Button>
    </div>
  );
};
