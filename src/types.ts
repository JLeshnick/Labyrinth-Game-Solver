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

export interface AppGameState {
  board: (TileData | null)[][];
  spareTile: TileData;
  looseTiles: TileData[];
  activePawn: string;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  obtainedTreasures: PlayerMap<string[]>;
  lastShiftArrowId: string | null;
  isGameStarted: boolean;
  gameStartState: AppGameState | null;
  pawnPositions: PawnPositions;
}

export interface SaveSlot {
  name: string;
  key: string;
  timestamp: number;
}

export interface ElectronAPI {
  platform: string;
  openLocalStorageFolder: () => void;
  listGames: () => Promise<SaveSlot[]>;
  saveGame: (name: string, content: Partial<AppGameState>) => Promise<{ success: boolean }>;
  loadGame: (key: string) => Promise<Partial<AppGameState> | null>;
  deleteGame: (key: string) => Promise<boolean>;
  getSettings: () => Promise<{ gamesDir: string } | null>;
  setSettings: (settings: { gamesDir: string }) => Promise<boolean>;
  selectDirectory: (title: string) => Promise<string | null>;
  openDirectory: (dirPath: string) => Promise<boolean>;
  openExternal?: (url: string) => void | Promise<void>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export interface SolverSolutionStep {
  arrowId: string;
  rotation: number;
  endPos: { r: number; c: number };
  pawnPath?: { r: number; c: number }[];
  explanation?: {
    slide: string;
    walk: string;
    safety: string;
  };
  safetyScore?: number;
}

export interface SolverSolution extends Array<SolverSolutionStep> {
  explanation?: {
    slide: string;
    walk: string;
    safety: string;
  };
  safetyScore: number;
  isFallback?: boolean;
}
