/* eslint-disable @typescript-eslint/no-explicit-any */

declare module "../solver" {
  export function cloneBoard(board: any): any;
  export function parseArrowId(arrowId: string): { type: string; index: number; dir: string };
  export function isOppositeArrow(arrowId1: string | null, arrowId2: string | null): boolean;
  export function executeSlideInGrid(board: any, spareTile: any, type: string, index: number, dir: string): { newSpare: any; fallenTile: any };
  export function solveAllHand(board: any, spareTile: any, startPawnPos: any, handCards: any[], lastShiftArrowId: string | null, maxTurns: number): any[];
  export function getReachableCells(board: any, sr: number, sc: number): { cells: { r: number; c: number }[]; parentMap: Record<string, { r: number; c: number }> };
  export function areConnected(board: any, r1: number, c1: number, r2: number, c2: number): boolean;
  export const DIRECTIONS: Record<string, number>;
  export const DELTAS: { r: number; c: number }[];
  export function hashBoard(board: any, spareTile: any): string;
  export function getOpenDirections(shape: string, dir: number): number[];
  export function quickSolveMinTurns(board: any, spareTile: any, startPawnPos: any, targetTreasure: string, lastShiftArrowId: string | null, maxTurns: number): number | null;
}

declare module "./solver" {
  export function cloneBoard(board: any): any;
  export function parseArrowId(arrowId: string): { type: string; index: number; dir: string };
  export function isOppositeArrow(arrowId1: string | null, arrowId2: string | null): boolean;
  export function executeSlideInGrid(board: any, spareTile: any, type: string, index: number, dir: string): { newSpare: any; fallenTile: any };
  export function solveAllHand(board: any, spareTile: any, startPawnPos: any, handCards: any[], lastShiftArrowId: string | null, maxTurns: number): any[];
  export function getReachableCells(board: any, sr: number, sc: number): { cells: { r: number; c: number }[]; parentMap: Record<string, { r: number; c: number }> };
  export function areConnected(board: any, r1: number, c1: number, r2: number, c2: number): boolean;
  export const DIRECTIONS: Record<string, number>;
  export const DELTAS: { r: number; c: number }[];
  export function hashBoard(board: any, spareTile: any): string;
  export function getOpenDirections(shape: string, dir: number): number[];
  export function quickSolveMinTurns(board: any, spareTile: any, startPawnPos: any, targetTreasure: string, lastShiftArrowId: string | null, maxTurns: number): number | null;
}

export {};
