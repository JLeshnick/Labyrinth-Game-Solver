export type Shape = 'corner' | 'straight' | 't-junction';

export type Rotation = 0 | 90 | 180 | 270;

export type PawnColor = 'red' | 'blue' | 'green' | 'yellow';

export interface Treasure {
  id: string;
  name: string;
}

export interface TileData {
  id: string;
  shape: Shape;
  treasure?: Treasure;
  isFixed: boolean;
  color?: PawnColor;
  rotation: Rotation;
}

export interface PawnPositions {
  red: { r: number; c: number };
  blue: { r: number; c: number };
  green: { r: number; c: number };
  yellow: { r: number; c: number };
  [key: string]: { r: number; c: number };
}

export interface PlayerMap<T> {
  red: T;
  blue: T;
  green: T;
  yellow: T;
  [key: string]: T;
}

/** The serialisable state saved/restored by history and storage hooks. */
export interface AppGameState {
  board: (TileData | null)[][];
  spareTile: TileData;
  looseTiles: TileData[];
  activePawn: string;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  lastShiftArrowId: string | null;
  isGameStarted: boolean;
  gameStartState: AppGameState | null;
  pawnPositions: PawnPositions;
}
