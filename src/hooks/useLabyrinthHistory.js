import { useState, useCallback } from 'react';
import { cloneBoard } from '../solver';

export function useLabyrinthHistory(initialState) {
  const [history, setHistory] = useState(() => {
    if (initialState) {
      return [
        {
          board: cloneBoard(initialState.board),
          spareTile: { ...initialState.spareTile },
          lastShiftArrowId: initialState.lastShiftArrowId,
          activePawn: initialState.activePawn,
          playerHands: JSON.parse(JSON.stringify(initialState.playerHands)),
          playerActiveTargets: { ...initialState.playerActiveTargets }
        }
      ];
    }
    return [];
  });
  
  const [historyIndex, setHistoryIndex] = useState(initialState ? 0 : -1);

  const pushStateToHistory = useCallback((board, spareTile, lastShift, activePawn, playerHands, playerActiveTargets) => {
    const record = {
      board: cloneBoard(board),
      spareTile: { ...spareTile },
      lastShiftArrowId: lastShift,
      activePawn: activePawn,
      playerHands: JSON.parse(JSON.stringify(playerHands)),
      playerActiveTargets: { ...playerActiveTargets }
    };

    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      return [...newHistory, record];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const resetHistory = useCallback((state) => {
    const record = {
      board: cloneBoard(state.board),
      spareTile: { ...state.spareTile },
      lastShiftArrowId: state.lastShiftArrowId,
      activePawn: state.activePawn,
      playerHands: JSON.parse(JSON.stringify(state.playerHands)),
      playerActiveTargets: { ...state.playerActiveTargets }
    };
    setHistory([record]);
    setHistoryIndex(0);
  }, []);

  const undo = useCallback((applyStateCallback) => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      const state = history[prevIdx];
      applyStateCallback(state);
      setHistoryIndex(prevIdx);
      return true;
    }
    return false;
  }, [history, historyIndex]);

  const redo = useCallback((applyStateCallback) => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      const state = history[nextIdx];
      applyStateCallback(state);
      setHistoryIndex(nextIdx);
      return true;
    }
    return false;
  }, [history, historyIndex]);

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
    historyLength: history.length
  };
}
