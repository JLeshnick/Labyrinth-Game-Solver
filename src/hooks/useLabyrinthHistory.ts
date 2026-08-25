import { useState, useCallback, useRef } from "react";
import type { TileData, PlayerMap, PawnPositions } from "../types";

const MAX_HISTORY = 50;

// Safe deep-clone using structuredClone with fallback for test/legacy environments
function deepClone<T>(obj: T): T {
  if (typeof structuredClone === "function") {
    return structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

export interface HistoryRecord {
  board: (TileData | null)[][];
  spareTile: TileData;
  lastShiftArrowId: string | null;
  activePawn: string;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  obtainedTreasures: PlayerMap<string[]>;
  pawnPositions?: PawnPositions;
  label?: string;
  movedPawn?: string;
  pawnPath?: { r: number; c: number }[];
  gameMode?: "standard" | "coop" | "auto";
  remainingCoopTreasures?: string[];
  coopObtainedTreasures?: string[];
}

export function useLabyrinthHistory(initialState: HistoryRecord | null) {
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    if (initialState) {
      return [deepClone(initialState)];
    }
    return [];
  });

  const [historyIndex, setHistoryIndex] = useState(initialState ? 0 : -1);

  const historyIndexRef = useRef(historyIndex);
  historyIndexRef.current = historyIndex;

  const pushStateToHistory = useCallback(
    (
      board: (TileData | null)[][],
      spareTile: TileData,
      lastShift: string | null,
      activePawn: string,
      playerHands: PlayerMap<string[]>,
      playerActiveTargets: PlayerMap<string | null>,
      obtainedTreasures: PlayerMap<string[]>,
      pawnPositions?: PawnPositions,
      label?: string,
      movedPawn?: string,
      pawnPath?: { r: number; c: number }[],
      gameMode?: "standard" | "coop" | "auto",
      remainingCoopTreasures?: string[],
      coopObtainedTreasures?: string[]
    ) => {
      const record: HistoryRecord = deepClone({
        board,
        spareTile,
        lastShiftArrowId: lastShift,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        pawnPositions,
        label,
        movedPawn,
        pawnPath,
        gameMode,
        remainingCoopTreasures,
        coopObtainedTreasures,
      });

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndexRef.current + 1);
        const updated = [...newHistory, record];
        if (updated.length > MAX_HISTORY) {
          const trimmed = updated.slice(updated.length - MAX_HISTORY);
          setHistoryIndex(trimmed.length - 1);
          return trimmed;
        }
        setHistoryIndex(updated.length - 1);
        return updated;
      });
    },
    []
  );

  const resetHistory = useCallback((state: HistoryRecord) => {
    setHistory([deepClone(state)]);
    setHistoryIndex(0);
  }, []);

  const undo = useCallback(
    (applyStateCallback: (state: HistoryRecord) => void) => {
      if (historyIndex > 0) {
        const prevIdx = historyIndex - 1;
        applyStateCallback(history[prevIdx]);
        setHistoryIndex(prevIdx);
        return true;
      }
      return false;
    },
    [history, historyIndex]
  );

  const redo = useCallback(
    (applyStateCallback: (state: HistoryRecord) => void) => {
      if (historyIndex < history.length - 1) {
        const nextIdx = historyIndex + 1;
        applyStateCallback(history[nextIdx]);
        setHistoryIndex(nextIdx);
        return true;
      }
      return false;
    },
    [history, historyIndex]
  );

  const jumpToHistory = useCallback(
    (index: number, applyStateCallback: (state: HistoryRecord) => void) => {
      const clamped = Math.max(0, Math.min(index, history.length - 1));
      applyStateCallback(history[clamped]);
      setHistoryIndex(clamped);
      historyIndexRef.current = clamped;
    },
    [history]
  );

  const hydrateHistory = useCallback((newHistory: HistoryRecord[], newIndex: number) => {
    setHistory(newHistory);
    setHistoryIndex(newIndex);
    historyIndexRef.current = newIndex;
  }, []);

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    history,
    pushStateToHistory,
    resetHistory,
    hydrateHistory,
    undo,
    redo,
    jumpToHistory,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
