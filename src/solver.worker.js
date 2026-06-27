// Web Worker for Labyrinth Strategist Solver
// Offloads pathfinding and BFS iterations from the main React UI thread

import { solveAllHand } from './solver';

self.onmessage = (e) => {
  const { board, spareTile, pawnPos, handCards, lastShiftArrowId, maxTurns } = e.data;
  
  try {
    const solutions = solveAllHand(board, spareTile, pawnPos, handCards, lastShiftArrowId, maxTurns);
    self.postMessage({ success: true, solutions });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
