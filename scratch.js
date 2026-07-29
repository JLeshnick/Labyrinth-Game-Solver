import { solveAllHandOrdered, getReachableCells } from './src/solver.js';

// Setup board
const board = Array.from({ length: 7 }, (_, r) => 
  Array.from({ length: 7 }, (_, c) => ({
    r, c, shape: 'I', dir: 0, treasure: (r === 2 && c === 2) ? "custom_target" : null, isFixed: false, pawns: []
  }))
);

const spareTile = { shape: 'I', dir: 0, treasure: null, isFixed: false, pawns: [] };
const pawnPos = { r: 0, c: 6 };

const solutions = solveAllHandOrdered(board, spareTile, pawnPos, ["custom_target"], null, 1);
console.log(solutions.length);
