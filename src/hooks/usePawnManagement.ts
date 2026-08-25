import { useState, useEffect, useRef, useCallback } from "react";
import { DEFAULT_PAWN_POSITIONS } from "../constants";
import type { PawnPositions } from "../types";

export type PawnStat = {
  tilesMoved: number;
  shiftsUsed: number;
  treasuresFound: number;
  totalTargets: number;
};

export function usePawnManagement() {
  const [activePawn, setActivePawn] = useState<string>("red");
  const [pawnPositions, setPawnPositions] = useState<PawnPositions>(DEFAULT_PAWN_POSITIONS);
  const [pawnStats, setPawnStats] = useState<Record<string, PawnStat>>({});
  const [customTargetCoords, setCustomTargetCoords] = useState<{
    r: number;
    c: number;
    type?: "coord" | "empty";
  } | null>(null);

  const totalShiftsRef = useRef(0);
  const [totalShifts, setTotalShifts] = useState(0);

  // Active players — stored in localStorage as a preference
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("labyrinth_active_players");
      return saved ? (JSON.parse(saved) as string[]) : ["red", "blue", "green", "yellow"];
    } catch {
      return ["red", "blue", "green", "yellow"];
    }
  });

  // Sync activePlayers to localStorage; ensure activePawn is in the list
  useEffect(() => {
    try {
      localStorage.setItem("labyrinth_active_players", JSON.stringify(activePlayers));
    } catch {
      /* storage full/blocked */
    }
    if (!activePlayers.includes(activePawn)) {
      setActivePawn(activePlayers[0] || "red");
    }
  }, [activePlayers, activePawn]);

  const trackPawnMove = useCallback((pawnColor: string, tilesMoved: number = 1) => {
    setPawnStats((prev) => {
      const current =
        prev[pawnColor] ?? {
          tilesMoved: 0,
          shiftsUsed: 0,
          treasuresFound: 0,
          totalTargets: 0,
        };
      return {
        ...prev,
        [pawnColor]: { ...current, tilesMoved: current.tilesMoved + tilesMoved },
      };
    });
  }, []);

  const trackPawnTreasure = useCallback((pawnColor: string) => {
    setPawnStats((prev) => {
      const current =
        prev[pawnColor] ?? {
          tilesMoved: 0,
          shiftsUsed: 0,
          treasuresFound: 0,
          totalTargets: 0,
        };
      return {
        ...prev,
        [pawnColor]: {
          ...current,
          treasuresFound: current.treasuresFound + 1,
        },
      };
    });
  }, []);

  const switchToNextPawn = useCallback(() => {
    const currentIndex = activePlayers.indexOf(activePawn);
    const nextPawn = activePlayers[(currentIndex + 1) % activePlayers.length];
    if (nextPawn) setActivePawn(nextPawn);
    setCustomTargetCoords(null);
  }, [activePawn, activePlayers]);

  const resetPawnState = useCallback(() => {
    setPawnPositions(DEFAULT_PAWN_POSITIONS);
    setCustomTargetCoords(null);
    setPawnStats({});
    totalShiftsRef.current = 0;
    setTotalShifts(0);
  }, []);

  return {
    activePawn,
    setActivePawn,
    pawnPositions,
    setPawnPositions,
    pawnStats,
    setPawnStats,
    customTargetCoords,
    setCustomTargetCoords,
    activePlayers,
    setActivePlayers,
    totalShiftsRef,
    totalShifts,
    setTotalShifts,
    trackPawnMove,
    trackPawnTreasure,
    switchToNextPawn,
    resetPawnState,
  };
}
