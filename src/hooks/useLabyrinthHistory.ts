import { useState, useCallback } from "react";

// Safe deep-clone that handles null cells in the React TileData grid
function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

interface HistoryRecord {
  board: any;
  spareTile: any;
  lastShiftArrowId: string | null;
  activePawn: string;
  playerHands: Record<string, string[]>;
  playerActiveTargets: Record<string, string | null>;
  pawnPositions?: Record<string, { r: number; c: number }>;
}

export function useLabyrinthHistory(initialState: HistoryRecord | null) {
  const [history, setHistory] = useState<HistoryRecord[]>(() => {
    if (initialState) {
      return [
        {
          board: deepClone(initialState.board),
          spareTile: { ...initialState.spareTile },
          lastShiftArrowId: initialState.lastShiftArrowId,
          activePawn: initialState.activePawn,
          playerHands: JSON.parse(JSON.stringify(initialState.playerHands)),
          playerActiveTargets: { ...initialState.playerActiveTargets },
          pawnPositions: initialState.pawnPositions ? { ...initialState.pawnPositions } : undefined,
        },
      ];
    }
    return [];
  });

  const [historyIndex, setHistoryIndex] = useState(initialState ? 0 : -1);

  const pushStateToHistory = useCallback(
    (
      board: any,
      spareTile: any,
      lastShift: string | null,
      activePawn: string,
      playerHands: Record<string, string[]>,
      playerActiveTargets: Record<string, string | null>,
      pawnPositions?: Record<string, { r: number; c: number }>
    ) => {
      const record: HistoryRecord = {
        board: deepClone(board),
        spareTile: { ...spareTile },
        lastShiftArrowId: lastShift,
        activePawn: activePawn,
        playerHands: JSON.parse(JSON.stringify(playerHands)),
        playerActiveTargets: { ...playerActiveTargets },
        pawnPositions: pawnPositions ? { ...pawnPositions } : undefined,
      };

      setHistory((prev) => {
        const newHistory = prev.slice(0, historyIndex + 1);
        return [...newHistory, record];
      });
      setHistoryIndex((prev) => prev + 1);
    },
    [historyIndex]
  );

  const resetHistory = useCallback((state: HistoryRecord) => {
    const record: HistoryRecord = {
      board: deepClone(state.board),
      spareTile: { ...state.spareTile },
      lastShiftArrowId: state.lastShiftArrowId,
      activePawn: state.activePawn,
      playerHands: JSON.parse(JSON.stringify(state.playerHands)),
      playerActiveTargets: { ...state.playerActiveTargets },
      pawnPositions: state.pawnPositions ? { ...state.pawnPositions } : undefined,
    };
    setHistory([record]);
    setHistoryIndex(0);
  }, []);

  const undo = useCallback(
    (applyStateCallback: (state: HistoryRecord) => void) => {
      if (historyIndex > 0) {
        const prevIdx = historyIndex - 1;
        const state = history[prevIdx];
        applyStateCallback(state);
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
        const state = history[nextIdx];
        applyStateCallback(state);
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
