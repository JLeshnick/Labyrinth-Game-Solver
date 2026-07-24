// Web Worker for Labyrinth Strategist Solver
// Offloads pathfinding and BFS iterations from the main React UI thread

import { solveAllHandOrdered, solveCoopStep } from './solver';

self.onmessage = (e) => {
  const { board, spareTile, pawnPos, pawnPositions, handCards, lastShiftArrowId, maxTurns, isCoop, activePawns, remainingTreasures } = e.data;

  try {
    let solutions = [];
    if (isCoop) {
      solutions = solveCoopStep(board, spareTile, pawnPositions, activePawns, remainingTreasures, lastShiftArrowId, maxTurns);
    } else {
      solutions = solveAllHandOrdered(board, spareTile, pawnPos, handCards, lastShiftArrowId, maxTurns);
    }
    self.postMessage({ success: true, solutions });
  } catch (error) {
    self.postMessage({ success: false, error: error.message });
  }
};
