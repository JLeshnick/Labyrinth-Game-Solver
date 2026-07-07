import { useState, useCallback } from "react";
import type { TileData, PlayerMap, PawnPositions } from "../types";

// Safe deep-clone that handles null cells in the React TileData grid
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

interface HistoryRecord {
  board: (TileData | null)[][];
  spareTile: TileData;
  lastShiftArrowId: string | null;
  activePawn: string;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  obtainedTreasures: PlayerMap<string[]>;
  pawnPositions?: PawnPositions;
}

export function useLabyrinthHistory(initialState: HistoryRecord | null) {
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    if (initialState) {
      return [deepClone(initialState)];
    }
    return [];
  });

  const [historyIndex, setHistoryIndex] = useState(initialState ? 0 : -1);

  const pushStateToHistory = useCallback(
    (
      board: (TileData | null)[][],
      spareTile: TileData,
      lastShift: string | null,
      activePawn: string,
      playerHands: PlayerMap<string[]>,
      playerActiveTargets: PlayerMap<string | null>,
      obtainedTreasures: PlayerMap<string[]>,
      pawnPositions?: PawnPositions
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
      });

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, record];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
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

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  return {
    pushStateToHistory,
    resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
    historyIndex,
    historyLength: history.length,
  };
}
