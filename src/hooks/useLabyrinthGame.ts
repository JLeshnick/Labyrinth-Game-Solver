import { useState, useEffect, useRef, useCallback } from "react";
import {
  FIXED_TILES_PRESETS,
  SHIFT_ARROWS,
  generateMovablePool,
  DEFAULT_PAWN_POSITIONS,
  EMPTY_PLAYER_HANDS,
  EMPTY_PLAYER_TARGETS,
  EMPTY_OBTAINED_TREASURES,
  TREASURES,
} from "../constants";
import type {
  TileData,
  Rotation,
  Shape,
  PlayerMap,
  PawnPositions,
  AppGameState,
} from "../types";
import {
  toSolverBoard,
  toSolverSpare,
  fromSolverGrid,
  fromSolverSpare,
} from "../lib/solverAdapter";
import { executeSlideInGrid, isOppositeArrow, getReachableCells } from "../solver";
import {
  playClickSound,
  playSlideSound,
  playRotateSound,
  playSuccessSound,
  playPawnMoveSound,
} from "../utils/audio";
import { useLabyrinthHistory } from "./useLabyrinthHistory";
import { useLabyrinthStorage } from "./useLabyrinthStorage";
const HOME_POSITIONS: Record<string, { r: number; c: number }> = {
  red:    { r: 0, c: 0 },
  blue:   { r: 6, c: 6 },
  green:  { r: 6, c: 0 },
  yellow: { r: 0, c: 6 }
};

type PawnStat = {
  tilesMoved: number;
  shiftsUsed: number;
  treasuresFound: number;
  totalTargets: number;
};

export interface UseLabyrinthGameOptions {
  isMuted: boolean;
  onToast: (msg: string) => void;
}

export function useLabyrinthGame({
  isMuted,
  onToast,
}: UseLabyrinthGameOptions) {
  // ── Internal sub-hooks ───────────────────────────────────────────────────────
  const { history, historyIndex, pushStateToHistory, resetHistory, hydrateHistory, undo, redo, jumpToHistory, canUndo, canRedo } =
    useLabyrinthHistory(null);

  const { saveAutosave, loadAutosave } = useLabyrinthStorage();

  // ── Tile ID counter ──────────────────────────────────────────────────────────
  const tileCounter = useRef(0);
  const nextTileId = useCallback(() => `movable_${++tileCounter.current}`, []);

  // ── Core game state ──────────────────────────────────────────────────────────
  const [grid, setGrid] = useState<(TileData | null)[][]>(() =>
    Array(7)
      .fill(null)
      .map(() => Array(7).fill(null))
  );
  const [looseTiles, setLooseTiles] = useState<TileData[]>([]);
  const [spareTile, setSpareTile] = useState<TileData>({
    id: "spare_initial",
    shape: "straight",
    rotation: 0,
    isFixed: false,
  });
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameStartState, setGameStartState] = useState<AppGameState | null>(null);
  const [activePawn, setActivePawn] = useState<string>("red");
  const [lastShiftArrowId, setLastShiftArrowId] = useState<string | null>(null);
  const [pawnPositions, setPawnPositions] =
    useState<PawnPositions>(DEFAULT_PAWN_POSITIONS);
  const [playerHands, setPlayerHands] =
    useState<PlayerMap<string[]>>(EMPTY_PLAYER_HANDS);
  const [playerActiveTargets, setPlayerActiveTargets] =
    useState<PlayerMap<string | null>>(EMPTY_PLAYER_TARGETS);
  const [obtainedTreasures, setObtainedTreasures] =
    useState<PlayerMap<string[]>>(EMPTY_OBTAINED_TREASURES);
  const [pawnStats, setPawnStats] = useState<Record<string, PawnStat>>({});
  const [gameMode, setGameMode] = useState<"standard" | "coop" | "auto">("standard");
  const [remainingCoopTreasures, setRemainingCoopTreasures] = useState<string[]>([]);
  const [coopObtainedTreasures, setCoopObtainedTreasures] = useState<string[]>([]);
  const [showEmptyTiles, setShowEmptyTiles] = useState(false);
  const [customTargetCoords, setCustomTargetCoords] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const totalShiftsRef = useRef(0);

  // Setup panel state (used by handleTileClick / handleCellClick)
  const [setupTab, setSetupTab] = useState<"tiles" | "players" | "mode" | "cards">("tiles");

  // Active players — stored in localStorage as a preference
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("labyrinth_active_players");
      return saved ? (JSON.parse(saved) as string[]) : ["red", "blue", "green", "yellow"];
    } catch {
      return ["red", "blue", "green", "yellow"];
    }
  });

  // ── Effects ──────────────────────────────────────────────────────────────────

  // Sync activePlayers to localStorage; ensure activePawn is in the list
  useEffect(() => {
    try {
      localStorage.setItem("labyrinth_active_players", JSON.stringify(activePlayers));
    } catch {
      /* storage full/blocked */
    }
    if (!activePlayers.includes(activePawn)) {
      setActivePawn(activePlayers[0] || "red");
    }
  }, [activePlayers, activePawn]);

  // Skip the very first autosave so the hook's mount-time empty state
  // doesn't clobber a real autosave before App has a chance to hydrate from it.
  const skipFirstAutosave = useRef(true);

  // Auto-save during setup (when game has not started)
  useEffect(() => {
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    if (isGameStarted) return;
    if (grid.length === 0) return; // Do not clobber existing save with an empty mount state
    saveAutosave({
      board: grid,
      looseTiles,
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      lastShiftArrowId,
      isGameStarted,
      gameStartState: gameStartState ?? null,
      pawnPositions,
      gameMode,
      remainingCoopTreasures,
      coopObtainedTreasures,
    });
    // Intentionally only react to board/card/pawn state changes — not every callback
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    grid,
    looseTiles,
    spareTile,
    activePawn,
    playerHands,
    playerActiveTargets,
    obtainedTreasures,
    lastShiftArrowId,
    isGameStarted,
    pawnPositions,
    gameMode,
    remainingCoopTreasures,
    coopObtainedTreasures,
  ]);

  // Sync history and historyIndex to autosave whenever they change
  useEffect(() => {
    if (history.length > 0) {
      saveAutosave({ history, historyIndex });
    }
  }, [history, historyIndex, saveAutosave]);

  // ── Solver adapter helpers ───────────────────────────────────────────────────
  const getSolverFormattedBoard = useCallback(
    (g: (TileData | null)[][], pos: Record<string, { r: number; c: number }>) =>
      toSolverBoard(g, pos),
    []
  );

  const getSolverFormattedSpare = useCallback(
    (tile: TileData) => toSolverSpare(tile),
    []
  );

  // ── Stat trackers ────────────────────────────────────────────────────────────
  const trackPawnMove = useCallback((pawnColor: string, tilesMoved: number = 1) => {
    setPawnStats((prev) => {
      const current =
        prev[pawnColor] ?? {
          tilesMoved: 0,
          shiftsUsed: 0,
          treasuresFound: 0,
          totalTargets: 0,
        };
      return {
        ...prev,
        [pawnColor]: { ...current, tilesMoved: current.tilesMoved + tilesMoved },
      };
    });
  }, []);

  const trackPawnTreasure = useCallback((pawnColor: string) => {
    setPawnStats((prev) => {
      const current =
        prev[pawnColor] ?? {
          tilesMoved: 0,
          shiftsUsed: 0,
          treasuresFound: 0,
          totalTargets: 0,
        };
      return {
        ...prev,
        [pawnColor]: {
          ...current,
          treasuresFound: current.treasuresFound + 1,
        },
      };
    });
  }, []);

  // ── Turn management ──────────────────────────────────────────────────────────
  const switchToNextPawn = useCallback(() => {
    const currentIndex = activePlayers.indexOf(activePawn);
    const nextPawn = activePlayers[(currentIndex + 1) % activePlayers.length];
    if (nextPawn) setActivePawn(nextPawn);
    setCustomTargetCoords(null);
  }, [activePawn, activePlayers]);

  // ── Board initialization ─────────────────────────────────────────────────────
  const resetBoardToInitialPresets = useCallback(() => {
    const initialGrid: (TileData | null)[][] = Array(7)
      .fill(null)
      .map(() => Array(7).fill(null));
    Object.entries(FIXED_TILES_PRESETS).forEach(([coord, tilePartial]) => {
      const [x, y] = coord.split(",").map(Number);
      initialGrid[y][x] = {
        id: `fixed_${x}_${y}`,
        shape: tilePartial.shape!,
        rotation: tilePartial.rotation!,
        treasure: tilePartial.treasure,
        isFixed: true,
        color: tilePartial.color,
      };
    });
    const freshMovablePool = generateMovablePool();
    setGrid(initialGrid);
    setPawnPositions(DEFAULT_PAWN_POSITIONS);
    setLooseTiles(freshMovablePool);
    setSpareTile({
      id: "spare_initial",
      shape: "straight",
      rotation: 0,
      isFixed: false,
    });
    setIsGameStarted(false);
    setGameStartState(null);
    setLastShiftArrowId(null);
    setPlayerHands(EMPTY_PLAYER_HANDS);
    setPlayerActiveTargets(EMPTY_PLAYER_TARGETS);
    setObtainedTreasures(EMPTY_OBTAINED_TREASURES);
    setCustomTargetCoords(null);
    setPawnStats({});
    totalShiftsRef.current = 0;

    resetHistory({
      board: initialGrid,
      spareTile: {
        id: "spare_initial",
        shape: "straight" as Shape,
        rotation: 0 as Rotation,
        isFixed: false,
      },
      activePawn: "red",
      playerHands: EMPTY_PLAYER_HANDS,
      playerActiveTargets: EMPTY_PLAYER_TARGETS,
      obtainedTreasures: EMPTY_OBTAINED_TREASURES,
      lastShiftArrowId: null,
      pawnPositions: DEFAULT_PAWN_POSITIONS,
    });
  }, [resetHistory]);

  const resetAllDefaults = useCallback(() => {
    resetBoardToInitialPresets();
    setActivePlayers(["red", "blue", "green", "yellow"]);
    setActivePawn("red");
    setGameMode("standard");
    setRemainingCoopTreasures([]);
    setCoopObtainedTreasures([]);
    try {
      localStorage.removeItem("labyrinth_autosave");
      localStorage.removeItem("labyrinth_active_players");
    } catch {
      /* storage blocked */
    }
  }, [resetBoardToInitialPresets]);

  // ── hydrate from autosave on mount ───────────────────────────────────────────
  const hydrateFromSaved = useCallback(
    (saved: Partial<AppGameState>, fallbackSpare: TileData) => {
      setGrid(saved.board ?? []);
      setLooseTiles(saved.looseTiles || []);
      setSpareTile(saved.spareTile ?? fallbackSpare);
      setActivePawn(saved.activePawn || "red");
      setPlayerHands(saved.playerHands || EMPTY_PLAYER_HANDS);
      setPlayerActiveTargets(saved.playerActiveTargets || EMPTY_PLAYER_TARGETS);
      setObtainedTreasures(saved.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      setLastShiftArrowId(saved.lastShiftArrowId || null);
      setIsGameStarted(saved.isGameStarted || false);
      setGameStartState(saved.gameStartState || null);
      setPawnPositions(saved.pawnPositions || DEFAULT_PAWN_POSITIONS);
      setGameMode(saved.gameMode || "standard");
      setRemainingCoopTreasures(saved.remainingCoopTreasures || []);
      setCoopObtainedTreasures(saved.coopObtainedTreasures || []);
      setCustomTargetCoords(null);
      totalShiftsRef.current = 0;

      if (saved.history && saved.historyIndex !== undefined) {
        hydrateHistory(saved.history, saved.historyIndex);
      } else {
        resetHistory({
          board: saved.board ?? [],
          spareTile: saved.spareTile ?? fallbackSpare,
          lastShiftArrowId: saved.lastShiftArrowId || null,
          activePawn: saved.activePawn || "red",
          playerHands: saved.playerHands || EMPTY_PLAYER_HANDS,
          playerActiveTargets: saved.playerActiveTargets || EMPTY_PLAYER_TARGETS,
          obtainedTreasures: saved.obtainedTreasures || EMPTY_OBTAINED_TREASURES,
          pawnPositions: saved.pawnPositions,
          gameMode: saved.gameMode || "standard",
          remainingCoopTreasures: saved.remainingCoopTreasures || [],
          coopObtainedTreasures: saved.coopObtainedTreasures || [],
        });
      }
    },
    [resetHistory]
  );

  // ── Game actions ─────────────────────────────────────────────────────────────

  const handleRandomizeBoard = useCallback(() => {
    if (isGameStarted) return;
    if (!isMuted) playClickSound();

    const initialGrid: (TileData | null)[][] = Array(7)
      .fill(null)
      .map(() => Array(7).fill(null));
    Object.entries(FIXED_TILES_PRESETS).forEach(([coord, tilePartial]) => {
      const [x, y] = coord.split(",").map(Number);
      initialGrid[y][x] = {
        id: `fixed_${x}_${y}`,
        shape: tilePartial.shape!,
        rotation: tilePartial.rotation!,
        treasure: tilePartial.treasure,
        isFixed: true,
        color: tilePartial.color,
      };
    });

    const pool = generateMovablePool();
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    const rotations: Rotation[] = [0, 90, 180, 270];
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        if (x % 2 === 0 && y % 2 === 0) continue;
        const tile = pool.pop();
        if (tile) {
          initialGrid[y][x] = {
            ...tile,
            rotation: rotations[Math.floor(Math.random() * 4)],
          };
        }
      }
    }

    const remainingSpare = pool.pop();
    if (remainingSpare) {
      const finalSpare = {
        ...remainingSpare,
        rotation: rotations[Math.floor(Math.random() * 4)],
      };
      setSpareTile(finalSpare);
      setLooseTiles([finalSpare]);
      setGrid(initialGrid);
      setCustomTargetCoords(null);
      setLastShiftArrowId(null);
      setGameStartState(null);
      totalShiftsRef.current = 0;

      pushStateToHistory(
        initialGrid,
        finalSpare,
        null,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        pawnPositions,
        "Board randomized",
        undefined,
        undefined,
        gameMode,
        remainingCoopTreasures,
        coopObtainedTreasures
      );
      saveAutosave({
        board: initialGrid,
        looseTiles: [finalSpare],
        spareTile: finalSpare,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        lastShiftArrowId: null,
        isGameStarted: false,
        gameStartState: null,
        pawnPositions,
        gameMode,
        remainingCoopTreasures,
        coopObtainedTreasures,
      });
      onToast("Board Randomized Successfully!");
    }
  }, [
    isGameStarted,
    isMuted,
    activePawn,
    playerHands,
    playerActiveTargets,
    obtainedTreasures,
    pawnPositions,
    pushStateToHistory,
    saveAutosave,
    onToast,
  ]);

  const handleTileClick = useCallback(
    (id: string) => {
      if (id === spareTile.id) {
        if (!isMuted) playRotateSound();
        setSpareTile((prev) => ({
          ...prev,
          rotation: ((prev.rotation + 90) % 360) as Rotation,
        }));
        return;
      }
      if (isGameStarted) return;

      if (!isMuted) playRotateSound();
      setLooseTiles((prev) =>
        prev.map((t) =>
          t.id === id
            ? { ...t, rotation: ((t.rotation + 90) % 360) as Rotation }
            : t
        )
      );
      setGrid((prev) =>
        prev.map((row) =>
          row.map((tile) =>
            tile && tile.id === id && !tile.isFixed
              ? { ...tile, rotation: ((tile.rotation + 90) % 360) as Rotation }
              : tile
          )
        )
      );
    },
    [spareTile.id, isGameStarted, isMuted]
  );

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!isGameStarted) return;

      const startCoord = pawnPositions[activePawn];
      if (!startCoord) return;

      const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
      const { cells } = getReachableCells(solverBoard, startCoord.r, startCoord.c);
      const reachable = cells.some(
        (cell: { r: number; c: number }) => cell.r === r && cell.c === c
      );

      if (reachable) {
        if (!isMuted) playPawnMoveSound();
        const nextPositions = { ...pawnPositions, [activePawn]: { r, c } };
        setPawnPositions(nextPositions);
        trackPawnMove(activePawn, 1);

        const landedTreasure = grid[r][c]?.treasure;
        let nextPlayerHands = playerHands;
        let nextPlayerActiveTargets = playerActiveTargets;
        let nextObtainedTreasures = obtainedTreasures;
        let nextRemainingCoop = remainingCoopTreasures;
        let nextObtainedCoop = coopObtainedTreasures;
        let claimed = false;

        if (gameMode === "coop") {
          if (landedTreasure && remainingCoopTreasures.includes(landedTreasure.id)) {
            if (!isMuted) playSuccessSound();
            nextRemainingCoop = remainingCoopTreasures.filter((tid) => tid !== landedTreasure.id);
            nextObtainedCoop = [...coopObtainedTreasures, landedTreasure.id];
            setRemainingCoopTreasures(nextRemainingCoop);
            setCoopObtainedTreasures(nextObtainedCoop);
            trackPawnTreasure(activePawn);
            onToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
            claimed = true;
          } else if (remainingCoopTreasures.length === 0) {
            const home = HOME_POSITIONS[activePawn];
            if (home && r === home.r && c === home.c) {
              onToast(`${activePawn.toUpperCase()} has reached home! 🏠`);
              const allHome = activePlayers.every((p) => {
                const pos = nextPositions[p];
                const pHome = HOME_POSITIONS[p];
                return pos && pHome && pos.r === pHome.r && pos.c === pHome.c;
              });
              if (allHome) {
                if (!isMuted) playSuccessSound();
                onToast("Cooperative Victory! All treasures collected and all pawns are home! 🎉🏆");
              }
            }
          }
        } else {
          if (landedTreasure && playerHands[activePawn].includes(landedTreasure.id)) {
            if (!isMuted) playSuccessSound();
            const nextHand = playerHands[activePawn].filter((tid) => tid !== landedTreasure.id);
            nextPlayerHands = { ...playerHands, [activePawn]: nextHand };
            nextPlayerActiveTargets = {
              ...playerActiveTargets,
              [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
            };
            nextObtainedTreasures = {
              ...obtainedTreasures,
              [activePawn]: [
                ...(obtainedTreasures[activePawn] || []),
                landedTreasure.id,
              ],
            };
            setPlayerHands(nextPlayerHands);
            setPlayerActiveTargets(nextPlayerActiveTargets);
            setObtainedTreasures(nextObtainedTreasures);
            trackPawnTreasure(activePawn);
            onToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
            claimed = true;
          }
        }

        if (!claimed) {
          onToast(`Moved ${activePawn.toUpperCase()} pawn to (${r}, ${c})`);
        }

        const moveLabel = claimed && landedTreasure
          ? `${activePawn[0].toUpperCase()}${activePawn.slice(1)} found ${landedTreasure.name}`
          : `${activePawn[0].toUpperCase()}${activePawn.slice(1)} → (${r},${c})`;

        let nextPawn = activePawn;
        if (gameMode === "coop" || !claimed) {
          const currentIndex = activePlayers.indexOf(activePawn);
          nextPawn = activePlayers[(currentIndex + 1) % activePlayers.length] || activePawn;
        }

        pushStateToHistory(
          grid,
          spareTile,
          lastShiftArrowId,
          nextPawn,
          nextPlayerHands,
          nextPlayerActiveTargets,
          nextObtainedTreasures,
          nextPositions,
          moveLabel,
          activePawn,
          [startCoord, { r, c }],
          gameMode,
          nextRemainingCoop,
          nextObtainedCoop
        );

        saveAutosave({
          board: grid,
          looseTiles: [],
          spareTile,
          activePawn: nextPawn,
          playerHands: nextPlayerHands,
          playerActiveTargets: nextPlayerActiveTargets,
          obtainedTreasures: nextObtainedTreasures,
          lastShiftArrowId,
          isGameStarted,
          gameStartState,
          pawnPositions: nextPositions,
          gameMode,
          remainingCoopTreasures: nextRemainingCoop,
          coopObtainedTreasures: nextObtainedCoop,
        });

        if (gameMode === "coop" || !claimed) {
          switchToNextPawn();
        }
      } else {
        if (customTargetCoords && customTargetCoords.r === r && customTargetCoords.c === c) {
          setCustomTargetCoords(null);
          onToast("Cleared custom target");
        } else {
          setCustomTargetCoords({ r, c });
          onToast(`Custom target set at (${r}, ${c}). Solving path...`);
        }
      }
    },
    [
      isGameStarted,
      isMuted,
      pawnPositions,
      activePawn,
      grid,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      spareTile,
      lastShiftArrowId,
      gameStartState,
      customTargetCoords,
      getSolverFormattedBoard,
      trackPawnMove,
      trackPawnTreasure,
      pushStateToHistory,
      saveAutosave,
      switchToNextPawn,
      onToast,
      gameMode,
      remainingCoopTreasures,
      coopObtainedTreasures,
      activePlayers,
    ]
  );

  const handleSlide = useCallback(
    (arrowId: string) => {
      if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
        onToast("Can't reverse the shift action immediately!");
        return;
      }
      if (!isMuted) playSlideSound();

      const arrow = SHIFT_ARROWS.find((a) => a.id === arrowId);
      if (!arrow) return;

      const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
      const { newSpare } = executeSlideInGrid(
        solverBoard,
        getSolverFormattedSpare(spareTile),
        arrow.type,
        arrow.index,
        arrow.dir
      );

      const nextGrid = fromSolverGrid(grid, solverBoard, nextTileId);
      const nextSpare = fromSolverSpare(newSpare, String(Date.now()));
      const nextPositions: PawnPositions = { ...pawnPositions };

      Object.entries(pawnPositions).forEach(([color, pos]) => {
        let nr = pos.r,
          nc = pos.c;
        if (arrow.type === "row" && arrow.index === pos.r) {
          // dir === "left" means arrow pushing right (spare inserts at c=0, tile slides right: c -> c+1, 6 wraps to 0)
          // dir === "right" means arrow pushing left (spare inserts at c=6, tile slides left: c -> c-1, 0 wraps to 6)
          nc =
            arrow.dir === "left"
              ? pos.c === 6
                ? 0
                : pos.c + 1
              : pos.c === 0
              ? 6
              : pos.c - 1;
        } else if (arrow.type === "col" && arrow.index === pos.c) {
          // dir === "top" means arrow pushing down (spare inserts at r=0, tile slides down: r -> r+1, 6 wraps to 0)
          // dir === "bottom" means arrow pushing up (spare inserts at r=6, tile slides up: r -> r-1, 0 wraps to 6)
          nr =
            arrow.dir === "top"
              ? pos.r === 6
                ? 0
                : pos.r + 1
              : pos.r === 0
              ? 6
              : pos.r - 1;
        }
        nextPositions[color] = { r: nr, c: nc };
      });

      setPawnPositions(nextPositions);
      setGrid(nextGrid);
      setSpareTile(nextSpare);
      setLastShiftArrowId(arrowId);

      const slideLabel = arrow ? `Slide ${arrow.type === "row" ? `row ${arrow.index}` : `col ${arrow.index}`} ${arrow.dir}` : `Slide`;
      pushStateToHistory(
        nextGrid,
        nextSpare,
        arrowId,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        nextPositions,
        slideLabel,
        undefined,
        undefined,
        gameMode,
        remainingCoopTreasures,
        coopObtainedTreasures
      );
      saveAutosave({
        board: nextGrid,
        looseTiles: [],
        spareTile: nextSpare,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        lastShiftArrowId: arrowId,
        isGameStarted,
        gameStartState,
        pawnPositions: nextPositions,
        gameMode,
        remainingCoopTreasures,
        coopObtainedTreasures,
      });
    },
    [
      lastShiftArrowId,
      isMuted,
      grid,
      pawnPositions,
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      isGameStarted,
      gameStartState,
      getSolverFormattedBoard,
      getSolverFormattedSpare,
      nextTileId,
      pushStateToHistory,
      saveAutosave,
      onToast,
      gameMode,
      remainingCoopTreasures,
      coopObtainedTreasures,
    ]
  );

  const handleAddCard = useCallback(
    (treasureId: string) => {
      if (playerHands[activePawn].includes(treasureId)) return;
      const nextHand = [...playerHands[activePawn], treasureId];
      setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
      if (!playerActiveTargets[activePawn]) {
        setPlayerActiveTargets((prev) => ({ ...prev, [activePawn]: treasureId }));
      }
      setPawnStats((prev) => {
        const current =
          prev[activePawn] ?? {
            tilesMoved: 0,
            shiftsUsed: 0,
            treasuresFound: 0,
            totalTargets: 0,
          };
        return {
          ...prev,
          [activePawn]: { ...current, totalTargets: current.totalTargets + 1 },
        };
      });
    },
    [activePawn, playerHands, playerActiveTargets]
  );

  const handleRemoveCard = useCallback(
    (treasureId: string) => {
      const nextHand = playerHands[activePawn].filter((id) => id !== treasureId);
      setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
      setPlayerActiveTargets((prev) => ({
        ...prev,
        [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
      }));
    },
    [activePawn, playerHands]
  );

  const handleAddAllCards = useCallback(() => {
    // Collect all treasures that are not already in other players' hands
    const allAvailable = TREASURES.filter((t) => {
      return !Object.entries(playerHands).some(([color, hand]) => color !== activePawn && hand.includes(t.id));
    }).map((t) => t.id);

    setPlayerHands((prev) => ({ ...prev, [activePawn]: allAvailable }));
    setPlayerActiveTargets((prev) => ({
      ...prev,
      [activePawn]: allAvailable.length > 0 ? allAvailable[0] : null,
    }));
    setPawnStats((prev) => {
      const current =
        prev[activePawn] ?? {
          tilesMoved: 0,
          shiftsUsed: 0,
          treasuresFound: 0,
          totalTargets: 0,
        };
      return {
        ...prev,
        [activePawn]: { ...current, totalTargets: allAvailable.length },
      };
    });
  }, [activePawn, playerHands]);

  const handleClearAllCards = useCallback(() => {
    setPlayerHands((prev) => ({ ...prev, [activePawn]: [] }));
    setPlayerActiveTargets((prev) => ({ ...prev, [activePawn]: null }));
    setPawnStats((prev) => {
      const current =
        prev[activePawn] ?? {
          tilesMoved: 0,
          shiftsUsed: 0,
          treasuresFound: 0,
          totalTargets: 0,
        };
      return {
        ...prev,
        [activePawn]: { ...current, totalTargets: 0 },
      };
    });
  }, [activePawn]);

  const handleSelectTargetTreasure = useCallback(
    (pawnColor: string, treasureId: string | null) => {
      if (treasureId && treasureId.startsWith("coord:")) {
        const [r, c] = treasureId.substring(6).split(",").map(Number);
        setCustomTargetCoords({ r, c });
      } else {
        setPlayerActiveTargets((prev) => ({ ...prev, [pawnColor]: treasureId }));
        setPlayerHands((prev) => ({ ...prev, [pawnColor]: treasureId ? [treasureId] : [] }));
        setCustomTargetCoords(null);
      }
    },
    []
  );

  const handleStartGame = useCallback(() => {
    if (looseTiles.length !== 1) {
      onToast("Cannot start! Make sure exactly 33 tiles are placed on the board.");
      return;
    }
    if (!isMuted) playSuccessSound();

    let initialRemainingCoop: string[] = [];
    if (gameMode === "coop") {
      const boardTreasures: string[] = [];
      grid.forEach((row) => {
        row.forEach((tile) => {
          if (tile && tile.treasure) {
            boardTreasures.push(tile.treasure.id);
          }
        });
      });
      looseTiles.forEach((tile) => {
        if (tile && tile.treasure) {
          boardTreasures.push(tile.treasure.id);
        }
      });
      initialRemainingCoop = boardTreasures;
      setRemainingCoopTreasures(initialRemainingCoop);
      setCoopObtainedTreasures([]);
    }

    const startState: AppGameState = {
      board: grid.map((r) => [...r]),
      spareTile: { ...looseTiles[0] },
      looseTiles: [],
      activePawn,
      playerHands: { ...playerHands },
      playerActiveTargets: { ...playerActiveTargets },
      obtainedTreasures: { ...obtainedTreasures },
      lastShiftArrowId: null,
      isGameStarted: false,
      gameStartState: null,
      pawnPositions: { ...pawnPositions },
      gameMode,
      remainingCoopTreasures: initialRemainingCoop,
      coopObtainedTreasures: [],
    };

    setSpareTile(looseTiles[0]);
    setLooseTiles([]);
    setIsGameStarted(true);
    setGameStartState(startState);
    setCustomTargetCoords(null);
    totalShiftsRef.current = 0;

    pushStateToHistory(
      grid,
      looseTiles[0],
      null,
      activePawn,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      pawnPositions,
      "Game started",
      undefined,
      undefined,
      gameMode,
      initialRemainingCoop,
      []
    );
    saveAutosave({
      board: grid,
      looseTiles: [],
      spareTile: looseTiles[0],
      activePawn,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      lastShiftArrowId: null,
      isGameStarted: true,
      gameStartState: startState,
      pawnPositions,
      gameMode,
      remainingCoopTreasures: initialRemainingCoop,
      coopObtainedTreasures: [],
    });
    onToast(
      gameMode === "auto"
        ? "Auto Mode active! Sit back while the solver automatically executes optimal moves."
        : gameMode === "coop"
        ? "Cooperative Game started! Collect all treasures and get all pawns back home."
        : "Game started! Slide the spare tile and move your pawn to targets."
    );
  }, [
    looseTiles,
    isMuted,
    grid,
    activePawn,
    playerHands,
    playerActiveTargets,
    obtainedTreasures,
    pawnPositions,
    pushStateToHistory,
    saveAutosave,
    onToast,
    gameMode,
  ]);

  const handleEndGame = useCallback(() => {
    if (!gameStartState) return;
    if (!isMuted) playClickSound();

    const restoredPawnPositions = gameStartState.pawnPositions ?? DEFAULT_PAWN_POSITIONS;
    const restoredHands = gameStartState.playerHands ?? EMPTY_PLAYER_HANDS;
    const restoredTargets = gameStartState.playerActiveTargets ?? EMPTY_PLAYER_TARGETS;
    const restoredObtained = gameStartState.obtainedTreasures ?? EMPTY_OBTAINED_TREASURES;
    const restoredActivePawn = gameStartState.activePawn ?? "red";
    const restoredGameMode = gameStartState.gameMode ?? "standard";
    const restoredRemainingCoop = gameStartState.remainingCoopTreasures ?? [];
    const restoredObtainedCoop = gameStartState.coopObtainedTreasures ?? [];

    setGrid(gameStartState.board);
    setLooseTiles([gameStartState.spareTile]);
    setSpareTile(gameStartState.spareTile);
    setPawnPositions(restoredPawnPositions);
    setPlayerHands(restoredHands);
    setPlayerActiveTargets(restoredTargets);
    setObtainedTreasures(restoredObtained);
    setActivePawn(restoredActivePawn);
    setGameMode(restoredGameMode);
    setRemainingCoopTreasures(restoredRemainingCoop);
    setCoopObtainedTreasures(restoredObtainedCoop);
    setIsGameStarted(false);
    setLastShiftArrowId(null);
    setGameStartState(null);
    setCustomTargetCoords(null);
    setPawnStats({});
    totalShiftsRef.current = 0;

    resetHistory({
      board: gameStartState.board,
      spareTile: gameStartState.spareTile,
      lastShiftArrowId: null,
      activePawn: restoredActivePawn,
      playerHands: restoredHands,
      playerActiveTargets: restoredTargets,
      obtainedTreasures: restoredObtained,
      pawnPositions: restoredPawnPositions,
      gameMode: restoredGameMode,
      remainingCoopTreasures: restoredRemainingCoop,
      coopObtainedTreasures: restoredObtainedCoop,
    });

    saveAutosave({
      board: gameStartState.board,
      looseTiles: [gameStartState.spareTile],
      spareTile: gameStartState.spareTile,
      activePawn: restoredActivePawn,
      playerHands: restoredHands,
      playerActiveTargets: restoredTargets,
      obtainedTreasures: restoredObtained,
      lastShiftArrowId: null,
      isGameStarted: false,
      gameStartState: null,
      pawnPositions: restoredPawnPositions,
      gameMode: restoredGameMode,
      remainingCoopTreasures: restoredRemainingCoop,
      coopObtainedTreasures: restoredObtainedCoop,
    });
  }, [
    gameStartState,
    isMuted,
    resetHistory,
    saveAutosave,
  ]);

  const handleExecuteSolution = useCallback(
    (path: {
      arrowId: string;
      rotation: number;
      endPos: { r: number; c: number };
    }[]) => {
      if (path.length === 0) return;
      const turn1 = path[0];
      const arrow = SHIFT_ARROWS.find((a) => a.id === turn1.arrowId);
      if (!arrow) return;
      if (!isMuted) playSlideSound();

      // Read which pawn is moving from the solver solution (coop mode supports multi-pawn steps)
      const pawnToMove = (path as any).pawnColor ?? activePawn;
      if (pawnToMove !== activePawn) {
        setActivePawn(pawnToMove);
      }

      const rotDegrees = ([0, 90, 180, 270] as Rotation[])[turn1.rotation];
      const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
      const { newSpare } = executeSlideInGrid(
        solverBoard,
        getSolverFormattedSpare({ ...spareTile, rotation: rotDegrees }),
        arrow.type,
        arrow.index,
        arrow.dir
      );

      const nextGrid = fromSolverGrid(grid, solverBoard, nextTileId);
      const nextSpare = fromSolverSpare(newSpare, String(Date.now()));
      const nextPositions: PawnPositions = {
        ...pawnPositions,
        [pawnToMove]: { r: turn1.endPos.r, c: turn1.endPos.c },
      };

      setGrid(nextGrid);
      setSpareTile(nextSpare);
      setPawnPositions(nextPositions);
      setLastShiftArrowId(turn1.arrowId);
      totalShiftsRef.current += 1;
      trackPawnMove(pawnToMove, 1);

      const landedTreasure = nextGrid[turn1.endPos.r][turn1.endPos.c]?.treasure;
      let nextPlayerHands = playerHands;
      let nextPlayerActiveTargets = playerActiveTargets;
      let nextObtainedTreasures = obtainedTreasures;
      let nextRemainingCoop = remainingCoopTreasures;
      let nextObtainedCoop = coopObtainedTreasures;
      let claimed = false;

      if (gameMode === "coop") {
        if (landedTreasure && remainingCoopTreasures.includes(landedTreasure.id)) {
          if (!isMuted) playSuccessSound();
          nextRemainingCoop = remainingCoopTreasures.filter((tid) => tid !== landedTreasure.id);
          nextObtainedCoop = [...coopObtainedTreasures, landedTreasure.id];
          setRemainingCoopTreasures(nextRemainingCoop);
          setCoopObtainedTreasures(nextObtainedCoop);
          trackPawnTreasure(pawnToMove);
          onToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
          claimed = true;
        } else if (remainingCoopTreasures.length === 0) {
          const home = HOME_POSITIONS[pawnToMove];
          if (home && turn1.endPos.r === home.r && turn1.endPos.c === home.c) {
            onToast(`${pawnToMove.toUpperCase()} has reached home! 🏠`);
            const allHome = activePlayers.every((p) => {
              const pos = nextPositions[p];
              const pHome = HOME_POSITIONS[p];
              return pos && pHome && pos.r === pHome.r && pos.c === pHome.c;
            });
            if (allHome) {
              if (!isMuted) playSuccessSound();
              onToast("Cooperative Victory! All treasures collected and all pawns are home! 🎉🏆");
            }
          }
        }
      } else {
        if (landedTreasure && playerHands[pawnToMove].includes(landedTreasure.id)) {
          if (!isMuted) playSuccessSound();
          const nextHand = playerHands[pawnToMove].filter((tid) => tid !== landedTreasure.id);
          nextPlayerHands = { ...playerHands, [pawnToMove]: nextHand };
          nextPlayerActiveTargets = {
            ...playerActiveTargets,
            [pawnToMove]: nextHand.length > 0 ? nextHand[0] : null,
          };
          nextObtainedTreasures = {
            ...obtainedTreasures,
            [pawnToMove]: [
              ...(obtainedTreasures[pawnToMove] || []),
              landedTreasure.id,
            ],
          };
          setPlayerHands(nextPlayerHands);
          setPlayerActiveTargets(nextPlayerActiveTargets);
          setObtainedTreasures(nextObtainedTreasures);
          trackPawnTreasure(pawnToMove);
          onToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
          claimed = true;
        }
      }
      const execLabel = claimed && landedTreasure
        ? `${pawnToMove[0].toUpperCase()}${pawnToMove.slice(1)} found ${landedTreasure.name}`
        : `${pawnToMove[0].toUpperCase()}${pawnToMove.slice(1)} → (${turn1.endPos.r},${turn1.endPos.c})`;
      const execPath = (turn1 as { pawnPath?: { r: number; c: number }[] }).pawnPath ?? [pawnPositions[pawnToMove], turn1.endPos];

      let nextPawnForSave = pawnToMove;
      const currentIndex = activePlayers.indexOf(pawnToMove);
      nextPawnForSave = activePlayers[(currentIndex + 1) % activePlayers.length] || pawnToMove;

      pushStateToHistory(
        nextGrid,
        nextSpare,
        turn1.arrowId,
        nextPawnForSave,
        nextPlayerHands,
        nextPlayerActiveTargets,
        nextObtainedTreasures,
        nextPositions,
        execLabel,
        pawnToMove,
        execPath,
        gameMode,
        nextRemainingCoop,
        nextObtainedCoop
      );

      saveAutosave({
        board: nextGrid,
        looseTiles: [],
        spareTile: nextSpare,
        activePawn: nextPawnForSave,
        playerHands: nextPlayerHands,
        playerActiveTargets: nextPlayerActiveTargets,
        obtainedTreasures: nextObtainedTreasures,
        lastShiftArrowId: turn1.arrowId,
        isGameStarted,
        gameStartState,
        pawnPositions: nextPositions,
        gameMode,
        remainingCoopTreasures: nextRemainingCoop,
        coopObtainedTreasures: nextObtainedCoop,
      });

      switchToNextPawn();
    },
    [
      isMuted,
      grid,
      pawnPositions,
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      isGameStarted,
      gameStartState,
      getSolverFormattedBoard,
      getSolverFormattedSpare,
      nextTileId,
      trackPawnMove,
      trackPawnTreasure,
      pushStateToHistory,
      saveAutosave,
      switchToNextPawn,
      onToast,
      gameMode,
      remainingCoopTreasures,
      coopObtainedTreasures,
      activePlayers,
    ]
  );

  // ── Undo / Redo (apply history back to internal state) ──────────────────────
  const handleUndo = useCallback(() => {
    undo((state) => {
      setGrid(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActivePawn(state.activePawn);
      setPlayerHands(state.playerHands);
      setPlayerActiveTargets(state.playerActiveTargets);
      setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      if (state.pawnPositions) setPawnPositions(state.pawnPositions);
      if (state.gameMode) setGameMode(state.gameMode);
      if (state.remainingCoopTreasures) setRemainingCoopTreasures(state.remainingCoopTreasures);
      if (state.coopObtainedTreasures) setCoopObtainedTreasures(state.coopObtainedTreasures);
    });
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo((state) => {
      setGrid(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActivePawn(state.activePawn);
      setPlayerHands(state.playerHands);
      setPlayerActiveTargets(state.playerActiveTargets);
      setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      if (state.pawnPositions) setPawnPositions(state.pawnPositions);
      if (state.gameMode) setGameMode(state.gameMode);
      if (state.remainingCoopTreasures) setRemainingCoopTreasures(state.remainingCoopTreasures);
      if (state.coopObtainedTreasures) setCoopObtainedTreasures(state.coopObtainedTreasures);
    });
  }, [redo]);

  const handleJumpToHistory = useCallback((index: number) => {
    jumpToHistory(index, (state) => {
      setGrid(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActivePawn(state.activePawn);
      setPlayerHands(state.playerHands);
      setPlayerActiveTargets(state.playerActiveTargets);
      setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      if (state.pawnPositions) setPawnPositions(state.pawnPositions);
      if (state.gameMode) setGameMode(state.gameMode);
      if (state.remainingCoopTreasures) setRemainingCoopTreasures(state.remainingCoopTreasures);
      if (state.coopObtainedTreasures) setCoopObtainedTreasures(state.coopObtainedTreasures);
    });
  }, [jumpToHistory]);

  return {
    // Core game state
    grid,
    setGrid,
    looseTiles,
    setLooseTiles,
    spareTile,
    setSpareTile,
    isGameStarted,
    gameStartState,
    activePawn,
    setActivePawn,
    activePlayers,
    setActivePlayers,
    lastShiftArrowId,
    pawnPositions,
    setPawnPositions,
    playerHands,
    playerActiveTargets,
    obtainedTreasures,
    pawnStats,
    customTargetCoords,
    setCustomTargetCoords,
    showEmptyTiles,
    setShowEmptyTiles,
    setupTab,
    setSetupTab,
    totalShiftsRef,
    // History
    history,
    historyIndex,
    canUndo,
    canRedo,
    handleUndo,
    handleRedo,
    handleJumpToHistory,
    // Storage
    saveAutosave,
    loadAutosave,
    // Solver adapter helpers
    getSolverFormattedBoard,
    getSolverFormattedSpare,
    // Initialisation
    hydrateFromSaved,
    resetBoardToInitialPresets,
    resetAllDefaults,
    // Game handlers
    handleRandomizeBoard,
    handleTileClick,
    handleCellClick,
    handleSlide,
    handleAddCard,
    handleRemoveCard,
    handleAddAllCards,
    handleClearAllCards,
    handleSelectTargetTreasure,
    handleStartGame,
    handleEndGame,
    handleExecuteSolution,
    switchToNextPawn,
    gameMode,
    setGameMode,
    remainingCoopTreasures,
    setRemainingCoopTreasures,
    coopObtainedTreasures,
    setCoopObtainedTreasures,
    totalShifts: totalShiftsRef.current,
  };
}
