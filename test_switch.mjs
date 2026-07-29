import { solveAllHand } from './src/solver.js';

const board = Array(7).fill(0).map((_, r) => Array(7).fill(0).map((_, c) => ({
  shape: 'straight',
  rotation: 0,
  treasure: null,
  r, c
})));
const spareTile = { shape: 'corner', rotation: 0, treasure: null };

// Call solveAllHand for coord
const sols = solveAllHand(board, spareTile, {r:0,c:0}, ["coord:2,2"], null, 1);
console.log("Found:", sols.length);
if (sols.length > 0) {
  console.log("CardId:", sols[0].cardId);
}
