import { useState, useRef, useCallback } from "react";
import type { SolverSolution, PawnPositions } from "../types";

export interface TravelingPawn {
  color: string;
  path: { r: number; c: number }[];
  durationMs: number;
  key: number;
}

export interface UsePawnAnimationOptions {
  activePawn: string;
  pawnPositions: PawnPositions;
  pawnAnimationSpeed: number;
  onExecuteSolution: (solution: SolverSolution) => void;
  onBeforeExecute?: () => void;
}

export function usePawnAnimation({
  activePawn,
  pawnPositions,
  pawnAnimationSpeed,
  onExecuteSolution,
  onBeforeExecute,
}: UsePawnAnimationOptions) {
  const [travelingPawn, setTravelingPawn] = useState<TravelingPawn | null>(null);
  const [pawnPositionOverride, setPawnPositionOverride] = useState<Record<string, { r: number; c: number }> | null>(null);
  const travelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleExecuteSolutionWithAnimation = useCallback(
    (path: SolverSolution, onComplete?: () => void) => {
      if (!path || path.length === 0) {
        onComplete?.();
        return;
      }
      const turn1 = path[0];
      const pawnColor = path.pawnColor ?? activePawn;
      const fromPos = pawnPositions[pawnColor];
      const fullPath: { r: number; c: number }[] = turn1?.pawnPath || (fromPos ? [fromPos, turn1.endPos] : []);

      if (fullPath.length > 1 && fromPos) {
        if (travelTimerRef.current) clearTimeout(travelTimerRef.current);
        // Lock the pawn display at FROM so it doesn't instantly jump
        setPawnPositionOverride((prev) => ({ ...pawnPositions, ...prev, [pawnColor]: fromPos }));

        // Duration scales based on path length and user speed setting
        const numSteps = fullPath.length - 1;
        const animDuration = Math.max(250, Math.round(pawnAnimationSpeed * Math.min(2, Math.max(0.7, numSteps * 0.4))));

        setTravelingPawn({
          color: pawnColor,
          path: fullPath,
          durationMs: animDuration,
          key: Date.now(),
        });

        // Execute the real move after the animation dot has completed the path
        travelTimerRef.current = setTimeout(() => {
          onBeforeExecute?.();
          onExecuteSolution(path);
          setTravelingPawn(null);
          setPawnPositionOverride(null);
          onComplete?.();
        }, animDuration + 40);
      } else {
        // No animation path possible — execute immediately
        onBeforeExecute?.();
        onExecuteSolution(path);
        onComplete?.();
      }
    },
    [activePawn, pawnPositions, pawnAnimationSpeed, onExecuteSolution, onBeforeExecute]
  );

  return {
    travelingPawn,
    pawnPositionOverride,
    handleExecuteSolutionWithAnimation,
  };
}
