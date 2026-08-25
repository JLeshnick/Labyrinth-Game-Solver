import { useState, useCallback, useEffect } from "react";
import { ROTATIONS } from "../constants";
import type { Rotation, TileData } from "../types";

export interface UseSlideStagingOptions {
  spareTile: TileData;
  activePawn: string;
  isGameStarted: boolean;
  onSlide: (arrowId: string) => void;
  onRotateSpare: (tileId: string) => void;
  setTurnPhase: (phase: "slide" | "move") => void;
}

export function useSlideStaging({
  spareTile,
  activePawn,
  isGameStarted,
  onSlide,
  onRotateSpare,
  setTurnPhase,
}: UseSlideStagingOptions) {
  const [stagedArrow, setStagedArrow] = useState<string | null>(null);
  const [stagedRotation, setStagedRotation] = useState<Rotation>(0);

  // Turn phase reset on turn or spare rotation change
  useEffect(() => {
    if (isGameStarted) {
      setTurnPhase("slide");
      setStagedArrow(null);
      setStagedRotation(spareTile.rotation as Rotation);
    }
  }, [activePawn, isGameStarted, spareTile.rotation, setTurnPhase]);

  const handleArrowClick = useCallback(
    (arrowId: string) => {
      if (stagedArrow === arrowId) {
        // Already staged — rotate the staged spare instead
        setStagedRotation(
          (prev) =>
            (ROTATIONS as unknown as Rotation[])[
              (ROTATIONS.indexOf(prev) + 1) % 4
            ]
        );
      } else {
        setStagedArrow(arrowId);
        setStagedRotation(spareTile.rotation as Rotation);
      }
    },
    [stagedArrow, spareTile.rotation]
  );

  const rotateStaged = useCallback(() => {
    setStagedRotation(
      (prev) =>
        (ROTATIONS as unknown as Rotation[])[
          (ROTATIONS.indexOf(prev) + 1) % 4
        ]
    );
  }, []);

  const commitStagedSlide = useCallback(() => {
    if (!stagedArrow) return;
    if (stagedRotation !== spareTile.rotation) {
      const turns =
        (ROTATIONS.indexOf(stagedRotation) -
          ROTATIONS.indexOf(spareTile.rotation) +
          4) %
        4;
      for (let i = 0; i < turns; i++) onRotateSpare(spareTile.id);
    }
    onSlide(stagedArrow);
    setStagedArrow(null);
    setTurnPhase("move");
  }, [stagedArrow, stagedRotation, spareTile, onRotateSpare, onSlide, setTurnPhase]);

  const cancelStagedSlide = useCallback(() => {
    setStagedArrow(null);
    setStagedRotation(spareTile.rotation as Rotation);
  }, [spareTile.rotation]);

  return {
    stagedArrow,
    stagedRotation,
    setStagedArrow,
    setStagedRotation,
    handleArrowClick,
    rotateStaged,
    commitStagedSlide,
    cancelStagedSlide,
  };
}
