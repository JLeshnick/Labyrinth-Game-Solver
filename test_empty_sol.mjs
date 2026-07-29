import { solveAllHand } from './src/solver.js';

// Empty board
const board = Array(7).fill(0).map((_, r) => Array(7).fill(0).map((_, c) => ({
  shape: 'straight',
  rotation: 0,
  treasure: null,
  r, c
})));
const spareTile = { shape: 'corner', rotation: 0, treasure: null };
const startPawnPos = { r: 0, c: 0 };

const sols = solveAllHand(board, spareTile, startPawnPos, ["coord:0,1"], null, 2);
console.log(sols.length);
