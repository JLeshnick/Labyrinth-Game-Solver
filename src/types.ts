export type Shape = 'corner' | 'straight' | 't-junction';

export type Rotation = 0 | 90 | 180 | 270;

export type PawnColor = 'red' | 'blue' | 'green' | 'yellow';

export type UITheme = 'brutalist' | 'simplistic';

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

export interface HistoryRecord {
  board: (TileData | null)[][];
  spareTile: TileData;
  lastShiftArrowId: string | null;
  activePawn: string;
  playerHands: PlayerMap<string[]>;
  playerActiveTargets: PlayerMap<string | null>;
  obtainedTreasures: PlayerMap<string[]>;
  pawnPositions?: PawnPositions;
  label?: string;
  movedPawn?: string;
  pawnPath?: { r: number; c: number }[];
  gameMode?: "standard" | "coop" | "auto";
  remainingCoopTreasures?: string[];
  coopObtainedTreasures?: string[];
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
  gameMode?: "standard" | "coop" | "auto";
  remainingCoopTreasures?: string[];
  coopObtainedTreasures?: string[];
  history?: HistoryRecord[];
  historyIndex?: number;
  lastSavedAt?: number;
}

export interface BoardScanCell {
  row: number;
  col: number;
  shape: Shape;
  rotation: Rotation;
  treasureId: string | null;
  confidence: number;
  flagged: boolean;
}

export type BoardScanResult = BoardScanCell[];

export interface ScoreBreakdown {
  reachabilityScore: number;
  fixedSpaceBonus: number;
  tileExitsBonus: number;
  wrapPenalty: number;
  walkBonus: number;
  turnsPenalty: number;
  totalScore: number;
}

export interface SolverSolutionStep {
  arrowId: string;
  rotation: number;
  endPos: { r: number; c: number };
  pawnPath?: { r: number; c: number }[];
  pawnColor?: string;
  cardId?: string;
  targetCoord?: { r: number; c: number };
  explanation?: {
    slide: string;
    walk: string;
    safety: string;
  };
  safetyScore?: number;
  algorithmScore?: number;
  scoreBreakdown?: ScoreBreakdown;
}

export interface SolverSolution extends Array<SolverSolutionStep> {
  pawnColor?: string;
  cardId?: string;
  explanation?: {
    slide: string;
    walk: string;
    safety: string;
  };
  safetyScore?: number;
  algorithmScore?: number;
  scoreBreakdown?: ScoreBreakdown;
  isFallback?: boolean;
}
