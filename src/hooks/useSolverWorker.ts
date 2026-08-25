import { useState, useRef, useEffect, useCallback } from "react";
import type { SolverSolution, TileData, PlayerMap, PawnPositions } from "../types";
import { DEFAULT_PAWN_POSITIONS } from "../constants";

export interface UseSolverWorkerOptions {
  isGameStarted: boolean;
  grid: (TileData | null)[][];
  spareTile: TileData;
  activePawn: string;
  activePlayers: string[];
  pawnPositions: PawnPositions;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  lastShiftArrowId: string | null;
  gameMode: "standard" | "coop" | "auto";
  remainingCoopTreasures: string[];
  customTargetCoords: { r: number; c: number; type?: "coord" | "empty" } | null;
  solverDepth: number;
  getSolverFormattedBoard: (board: (TileData | null)[][], pawnPositions: PawnPositions) => unknown[][];
  getSolverFormattedSpare: (spare: TileData) => unknown;
  showToast: (msg: string) => void;
  switchToNextPawn: () => void;
}

export function useSolverWorker({
  isGameStarted,
  grid,
  spareTile,
  activePawn,
  activePlayers,
  pawnPositions,
  playerHands,
  playerActiveTargets,
  lastShiftArrowId,
  gameMode,
  remainingCoopTreasures,
  customTargetCoords,
  solverDepth,
  getSolverFormattedBoard,
  getSolverFormattedSpare,
  showToast,
  switchToNextPawn,
}: UseSolverWorkerOptions) {
  const [solutions, setSolutions] = useState<SolverSolution[]>([]);
  const [hoveredSolutionIndex, setHoveredSolutionIndex] = useState<number | null>(null);
  const [lockedScoreBreakdownSolution, setLockedScoreBreakdownSolution] = useState<SolverSolution | null>(null);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  const hoveredSolution =
    hoveredSolutionIndex !== null && solutions && hoveredSolutionIndex < solutions.length
      ? solutions[hoveredSolutionIndex]
      : null;

  const handleSetHoveredSolution = useCallback(
    (sol: SolverSolution | null) => {
      if (sol === null) {
        setHoveredSolutionIndex(0);
      } else {
        const idx = solutions.indexOf(sol);
        if (idx !== -1) {
          setHoveredSolutionIndex(idx);
        }
      }
    },
    [solutions]
  );

  const clearSolutions = useCallback(() => {
    setSolutions([]);
    setHoveredSolutionIndex(null);
    setLockedScoreBreakdownSolution(null);
  }, []);

  // Web Worker lifecycle
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL("../solver.worker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current.onmessage = (e) => {
        const { success, solutions: computed, error } = e.data as {
          success: boolean;
          solutions: SolverSolution[];
          error: string;
        };
        if (success) {
          setSolutions(computed || []);
          setHoveredSolutionIndex(0);
        } else {
          console.error("Worker solver failed:", error);
          showToast("Solver error — try adjusting targets or reducing max turns.");
        }
        setIsLoadingSolutions(false);
      };
      workerRef.current.onerror = (e) => {
        console.error("Worker crashed:", e);
        showToast("Solver worker crashed. Reload to retry.");
        setIsLoadingSolutions(false);
      };
    } catch (err) {
      console.warn("Failed to instantiate Web Worker solver.", err);
    }

    return () => workerRef.current?.terminate();
  }, [showToast]);

  // Solver re-run on board/pawn/hand changes
  useEffect(() => {
    if (!isGameStarted || grid.length === 0 || !workerRef.current) return;
    const isCoop = gameMode === "coop" || gameMode === "auto";

    if (isCoop && remainingCoopTreasures.length === 0) {
      const activeHome = DEFAULT_PAWN_POSITIONS[activePawn];
      const activePos = pawnPositions[activePawn];
      const isAlreadyHome = activeHome && activePos && activePos.r === activeHome.r && activePos.c === activeHome.c;
      const anyPawnNotHome = activePlayers.some((p) => {
        const h = DEFAULT_PAWN_POSITIONS[p];
        const pos = pawnPositions[p];
        return pos && h && (pos.r !== h.r || pos.c !== h.c);
      });

      if (isAlreadyHome && anyPawnNotHome) {
        switchToNextPawn();
        return;
      }
    }

    const currentPawnCoord = pawnPositions[activePawn];
    const handCards = customTargetCoords
      ? [`${customTargetCoords.type || "coord"}:${customTargetCoords.r},${customTargetCoords.c}`]
      : playerHands[activePawn] || [];

    if (!isCoop && (!currentPawnCoord || handCards.length === 0)) {
      setSolutions([]);
      return;
    }
    if (isCoop && !currentPawnCoord) {
      setSolutions([]);
      return;
    }

    setIsLoadingSolutions(true);
    setSolutions([]);
    setHoveredSolutionIndex(null);

    const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
    const solverSpare = getSolverFormattedSpare(spareTile);

    let isCoopSolve = isCoop;
    let coopTarget = null;
    if (isCoop && customTargetCoords) {
      isCoopSolve = false;
      const activeHome = DEFAULT_PAWN_POSITIONS[activePawn];
      const isHomeSelected = activeHome && customTargetCoords.r === activeHome.r && customTargetCoords.c === activeHome.c;
      coopTarget = isHomeSelected
        ? `home_${activePawn}`
        : `${customTargetCoords.type || "coord"}:${customTargetCoords.r},${customTargetCoords.c}`;
    }

    const selectedTarget = gameMode === "auto" ? null : playerActiveTargets[activePawn];
    const coopTreasures = isCoop && selectedTarget ? [selectedTarget] : remainingCoopTreasures;
    const coopActivePawns = [activePawn];

    workerRef.current.postMessage({
      board: solverBoard,
      spareTile: solverSpare,
      pawnPos: currentPawnCoord,
      pawnPositions,
      handCards: coopTarget ? [coopTarget] : handCards,
      lastShiftArrowId,
      maxTurns: solverDepth,
      isCoop: isCoopSolve,
      activePawns: coopActivePawns,
      remainingTreasures: coopTreasures,
    });
  }, [
    grid,
    spareTile,
    activePawn,
    playerHands,
    playerActiveTargets,
    lastShiftArrowId,
    isGameStarted,
    pawnPositions,
    getSolverFormattedBoard,
    getSolverFormattedSpare,
    customTargetCoords,
    solverDepth,
    gameMode,
    activePlayers,
    remainingCoopTreasures,
    switchToNextPawn,
  ]);

  return {
    solutions,
    hoveredSolution,
    hoveredSolutionIndex,
    setHoveredSolutionIndex,
    handleSetHoveredSolution,
    lockedScoreBreakdownSolution,
    setLockedScoreBreakdownSolution,
    isLoadingSolutions,
    clearSolutions,
  };
}
