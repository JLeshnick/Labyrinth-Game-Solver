import { solveAllHandOrdered } from './src/solver.js';
const board = Array.from({ length: 7 }, (_, r) => 
  Array.from({ length: 7 }, (_, c) => ({
    r, c, shape: 'I', dir: 0, treasure: (r === 2 && c === 2) ? "custom_target" : null, isFixed: false, pawns: []
  }))
);
// Make a clear path
board[0][6] = { r: 0, c: 6, shape: 'I', dir: 1, treasure: null, isFixed: false, pawns: ["red"] };
board[0][2] = { r: 0, c: 2, shape: 'I', dir: 1, treasure: null, isFixed: false, pawns: [] };
board[1][2] = { r: 1, c: 2, shape: 'I', dir: 1, treasure: null, isFixed: false, pawns: [] };

const spareTile = { shape: 'I', dir: 0, treasure: null, isFixed: false, pawns: [] };
const pawnPos = { r: 0, c: 6 };

const solutions = solveAllHandOrdered(board, spareTile, pawnPos, ["custom_target"], null, 1);
console.log("Solutions found:", solutions.length);
