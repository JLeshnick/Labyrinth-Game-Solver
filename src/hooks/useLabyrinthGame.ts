import { useState, useEffect, useRef, useCallback } from "react";
import {
  SHIFT_ARROWS,
  generateMovablePool,
  DEFAULT_PAWN_POSITIONS,
  EMPTY_PLAYER_HANDS,
  EMPTY_PLAYER_TARGETS,
  EMPTY_OBTAINED_TREASURES,
} from "../constants";
import type {
  TileData,
  Rotation,
  Shape,
  PawnPositions,
  AppGameState,
  SolverSolution,
} from "../types";
import { fromSolverGrid, fromSolverSpare } from "../lib/solverAdapter";
import { executeSlideInGrid, isOppositeArrow, getReachableCells } from "../solver";
import {
  playClickSound,
  playSlideSound,
  playSuccessSound,
  playPawnMoveSound,
} from "../utils/audio";
import { useLabyrinthHistory } from "./useLabyrinthHistory";
import { useLabyrinthStorage } from "./useLabyrinthStorage";
import { useBoardManagement, createInitialPresetGrid } from "./useBoardManagement";
import { usePawnManagement } from "./usePawnManagement";
import { useTreasureCollection } from "./useTreasureCollection";

export interface UseLabyrinthGameOptions {
  isMuted: boolean;
  onToast: (msg: string) => void;
}

export function useLabyrinthGame({
  isMuted,
  onToast,
}: UseLabyrinthGameOptions) {
  // ── Composed Sub-Hooks ───────────────────────────────────────────────────────
  const board = useBoardManagement();
  const pawns = usePawnManagement();
  const treasures = useTreasureCollection();

  const {
    history,
    historyIndex,
    pushStateToHistory,
    resetHistory,
    hydrateHistory,
    undo,
    redo,
    jumpToHistory,
    canUndo,
    canRedo,
  } = useLabyrinthHistory(null);

  const { saveAutosave, loadAutosave } = useLabyrinthStorage();

  // ── Overall Game Lifecycle State ─────────────────────────────────────────────
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameStartState, setGameStartState] = useState<AppGameState | null>(null);
  const [setupTab, setSetupTab] = useState<"tiles" | "players" | "mode" | "cards">("tiles");

  // Skip the very first autosave so mount-time empty state doesn't clobber a saved state
  const skipFirstAutosave = useRef(true);

  // Auto-save during setup (when game has not started)
  useEffect(() => {
    if (skipFirstAutosave.current) {
      skipFirstAutosave.current = false;
      return;
    }
    if (isGameStarted) return;
    if (board.grid.length === 0) return;
    saveAutosave({
      board: board.grid,
      looseTiles: board.looseTiles,
      spareTile: board.spareTile,
      activePawn: pawns.activePawn,
      playerHands: treasures.playerHands,
      playerActiveTargets: treasures.playerActiveTargets,
      obtainedTreasures: treasures.obtainedTreasures,
      lastShiftArrowId: board.lastShiftArrowId,
      isGameStarted,
      gameStartState: gameStartState ?? null,
      pawnPositions: pawns.pawnPositions,
      gameMode: treasures.gameMode,
      remainingCoopTreasures: treasures.remainingCoopTreasures,
      coopObtainedTreasures: treasures.coopObtainedTreasures,
    });
  }, [
    board.grid,
    board.looseTiles,
    board.spareTile,
    board.lastShiftArrowId,
    pawns.activePawn,
    pawns.pawnPositions,
    treasures.playerHands,
    treasures.playerActiveTargets,
    treasures.obtainedTreasures,
    treasures.gameMode,
    treasures.remainingCoopTreasures,
    treasures.coopObtainedTreasures,
    isGameStarted,
    gameStartState,
    saveAutosave,
  ]);

  // Sync history and historyIndex to autosave whenever they change
  useEffect(() => {
    if (history.length > 0) {
      saveAutosave({ history, historyIndex });
    }
  }, [history, historyIndex, saveAutosave]);

  // ── Board resets & hydration ─────────────────────────────────────────────────
  const resetBoardToInitialPresets = useCallback(() => {
    const { initialGrid } = board.resetBoardPresets();
    pawns.resetPawnState();
    treasures.resetTreasureState();
    setIsGameStarted(false);
    setGameStartState(null);

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
  }, [board, pawns, treasures, resetHistory]);

  const resetAllDefaults = useCallback(() => {
    resetBoardToInitialPresets();
    pawns.setActivePlayers(["red", "blue", "green", "yellow"]);
    pawns.setActivePawn("red");
    treasures.setGameMode("standard");
    try {
      localStorage.removeItem("labyrinth_autosave");
      localStorage.removeItem("labyrinth_active_players");
    } catch {
      /* storage blocked */
    }
  }, [resetBoardToInitialPresets, pawns, treasures]);

  const hydrateFromSaved = useCallback(
    (saved: Partial<AppGameState>, fallbackSpare: TileData) => {
      board.setGrid(saved.board ?? []);
      board.setLooseTiles(saved.looseTiles || []);
      board.setSpareTile(saved.spareTile ?? fallbackSpare);
      board.setLastShiftArrowId(saved.lastShiftArrowId || null);

      pawns.setActivePawn(saved.activePawn || "red");
      pawns.setPawnPositions(saved.pawnPositions || DEFAULT_PAWN_POSITIONS);
      pawns.setCustomTargetCoords(null);
      pawns.totalShiftsRef.current = 0;
      pawns.setTotalShifts(0);

      treasures.setPlayerHands(saved.playerHands || EMPTY_PLAYER_HANDS);
      treasures.setPlayerActiveTargets(saved.playerActiveTargets || EMPTY_PLAYER_TARGETS);
      treasures.setObtainedTreasures(saved.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      treasures.setGameMode(saved.gameMode || "standard");
      treasures.setRemainingCoopTreasures(saved.remainingCoopTreasures || []);
      treasures.setCoopObtainedTreasures(saved.coopObtainedTreasures || []);

      setIsGameStarted(saved.isGameStarted || false);
      setGameStartState(saved.gameStartState || null);

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
    [board, pawns, treasures, resetHistory, hydrateHistory]
  );

  // ── Game Actions ─────────────────────────────────────────────────────────────
  const handleRandomizeBoard = useCallback(() => {
    if (isGameStarted) return;
    if (!isMuted) playClickSound();

    const initialGrid = createInitialPresetGrid();
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
      board.setSpareTile(finalSpare);
      board.setLooseTiles([finalSpare]);
      board.setGrid(initialGrid);
      board.setLastShiftArrowId(null);
      pawns.setCustomTargetCoords(null);
      pawns.totalShiftsRef.current = 0;
      pawns.setTotalShifts(0);
      setGameStartState(null);

      pushStateToHistory(
        initialGrid,
        finalSpare,
        null,
        pawns.activePawn,
        treasures.playerHands,
        treasures.playerActiveTargets,
        treasures.obtainedTreasures,
        pawns.pawnPositions,
        "Board randomized",
        undefined,
        undefined,
        treasures.gameMode,
        treasures.remainingCoopTreasures,
        treasures.coopObtainedTreasures
      );
      saveAutosave({
        board: initialGrid,
        looseTiles: [finalSpare],
        spareTile: finalSpare,
        activePawn: pawns.activePawn,
        playerHands: treasures.playerHands,
        playerActiveTargets: treasures.playerActiveTargets,
        obtainedTreasures: treasures.obtainedTreasures,
        lastShiftArrowId: null,
        isGameStarted: false,
        gameStartState: null,
        pawnPositions: pawns.pawnPositions,
        gameMode: treasures.gameMode,
        remainingCoopTreasures: treasures.remainingCoopTreasures,
        coopObtainedTreasures: treasures.coopObtainedTreasures,
      });
      onToast("Board Randomized Successfully!");
    }
  }, [
    isGameStarted,
    isMuted,
    board,
    pawns,
    treasures,
    pushStateToHistory,
    saveAutosave,
    onToast,
  ]);

  const handleTileClick = useCallback(
    (id: string) => {
      board.handleTileClick(id, isGameStarted, isMuted);
    },
    [board, isGameStarted, isMuted]
  );

  const handleAddCard = useCallback(
    (treasureId: string) => {
      treasures.handleAddCard(treasureId, pawns.activePawn, (pawn) => {
        pawns.setPawnStats((prev) => {
          const current =
            prev[pawn] ?? {
              tilesMoved: 0,
              shiftsUsed: 0,
              treasuresFound: 0,
              totalTargets: 0,
            };
          return {
            ...prev,
            [pawn]: { ...current, totalTargets: current.totalTargets + 1 },
          };
        });
      });
    },
    [treasures, pawns]
  );

  const handleRemoveCard = useCallback(
    (treasureId: string) => {
      treasures.handleRemoveCard(treasureId, pawns.activePawn);
    },
    [treasures, pawns.activePawn]
  );

  const handleAddAllCards = useCallback(() => {
    treasures.handleAddAllCards(pawns.activePawn, (pawn, count) => {
      pawns.setPawnStats((prev) => {
        const current =
          prev[pawn] ?? {
            tilesMoved: 0,
            shiftsUsed: 0,
            treasuresFound: 0,
            totalTargets: 0,
          };
        return {
          ...prev,
          [pawn]: { ...current, totalTargets: count },
        };
      });
    });
  }, [treasures, pawns]);

  const handleClearAllCards = useCallback(() => {
    treasures.handleClearAllCards(pawns.activePawn, (pawn) => {
      pawns.setPawnStats((prev) => {
        const current =
          prev[pawn] ?? {
            tilesMoved: 0,
            shiftsUsed: 0,
            treasuresFound: 0,
            totalTargets: 0,
          };
        return {
          ...prev,
          [pawn]: { ...current, totalTargets: 0 },
        };
      });
    });
  }, [treasures, pawns]);

  const handleSelectTargetTreasure = useCallback(
    (pawnColor: string, treasureId: string | null) => {
      treasures.handleSelectTargetTreasure(
        pawnColor,
        treasureId,
        (target) => pawns.setCustomTargetCoords(target),
        () => pawns.setCustomTargetCoords(null)
      );
    },
    [treasures, pawns]
  );

  const handleSlide = useCallback(
    (arrowId: string) => {
      if (board.lastShiftArrowId && isOppositeArrow(arrowId, board.lastShiftArrowId)) {
        onToast("Can't reverse the shift action immediately!");
        return;
      }
      if (!isMuted) playSlideSound();

      const arrow = SHIFT_ARROWS.find((a) => a.id === arrowId);
      if (!arrow) return;

      const solverBoard = board.getSolverFormattedBoard(board.grid, pawns.pawnPositions);
      const { newSpare } = executeSlideInGrid(
        solverBoard,
        board.getSolverFormattedSpare(board.spareTile),
        arrow.type,
        arrow.index,
        arrow.dir
      );

      const nextGrid = fromSolverGrid(board.grid, solverBoard, board.nextTileId);
      const nextSpare = fromSolverSpare(newSpare, String(Date.now()));
      const nextPositions: PawnPositions = { ...pawns.pawnPositions };

      Object.entries(pawns.pawnPositions).forEach(([color, pos]) => {
        let nr = pos.r,
          nc = pos.c;
        if (arrow.type === "row" && arrow.index === pos.r) {
          nc =
            arrow.dir === "left"
              ? pos.c === 6
                ? 0
                : pos.c + 1
              : pos.c === 0
              ? 6
              : pos.c - 1;
        } else if (arrow.type === "col" && arrow.index === pos.c) {
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

      pawns.setPawnPositions(nextPositions);
      board.setGrid(nextGrid);
      board.setSpareTile(nextSpare);
      board.setLastShiftArrowId(arrowId);

      const slideLabel = arrow
        ? `Slide ${arrow.type === "row" ? `row ${arrow.index}` : `col ${arrow.index}`} ${arrow.dir}`
        : `Slide`;

      pushStateToHistory(
        nextGrid,
        nextSpare,
        arrowId,
        pawns.activePawn,
        treasures.playerHands,
        treasures.playerActiveTargets,
        treasures.obtainedTreasures,
        nextPositions,
        slideLabel,
        undefined,
        undefined,
        treasures.gameMode,
        treasures.remainingCoopTreasures,
        treasures.coopObtainedTreasures
      );
      saveAutosave({
        board: nextGrid,
        looseTiles: [],
        spareTile: nextSpare,
        activePawn: pawns.activePawn,
        playerHands: treasures.playerHands,
        playerActiveTargets: treasures.playerActiveTargets,
        obtainedTreasures: treasures.obtainedTreasures,
        lastShiftArrowId: arrowId,
        isGameStarted,
        gameStartState,
        pawnPositions: nextPositions,
        gameMode: treasures.gameMode,
        remainingCoopTreasures: treasures.remainingCoopTreasures,
        coopObtainedTreasures: treasures.coopObtainedTreasures,
      });
    },
    [
      board,
      pawns,
      treasures,
      isMuted,
      isGameStarted,
      gameStartState,
      pushStateToHistory,
      saveAutosave,
      onToast,
    ]
  );

  const handleCellClick = useCallback(
    (r: number, c: number) => {
      if (!isGameStarted) return;

      const startCoord = pawns.pawnPositions[pawns.activePawn];
      if (!startCoord) return;

      const solverBoard = board.getSolverFormattedBoard(board.grid, pawns.pawnPositions);
      const { cells } = getReachableCells(solverBoard, startCoord.r, startCoord.c);
      const reachable = cells.some(
        (cell: { r: number; c: number }) => cell.r === r && cell.c === c
      );

      if (reachable) {
        if (!isMuted) playPawnMoveSound();
        const nextPositions = { ...pawns.pawnPositions, [pawns.activePawn]: { r, c } };
        pawns.setPawnPositions(nextPositions);
        pawns.trackPawnMove(pawns.activePawn, 1);

        const landedTreasure = board.grid[r][c]?.treasure;
        let nextPlayerHands = treasures.playerHands;
        let nextPlayerActiveTargets = treasures.playerActiveTargets;
        let nextObtainedTreasures = treasures.obtainedTreasures;
        let nextRemainingCoop = treasures.remainingCoopTreasures;
        let nextObtainedCoop = treasures.coopObtainedTreasures;
        let claimed = false;

        if (treasures.gameMode === "coop" || treasures.gameMode === "auto") {
          if (landedTreasure && treasures.remainingCoopTreasures.includes(landedTreasure.id)) {
            if (!isMuted) playSuccessSound();
            nextRemainingCoop = treasures.remainingCoopTreasures.filter((tid) => tid !== landedTreasure.id);
            nextObtainedCoop = [...treasures.coopObtainedTreasures, landedTreasure.id];
            treasures.setRemainingCoopTreasures(nextRemainingCoop);
            treasures.setCoopObtainedTreasures(nextObtainedCoop);
            pawns.trackPawnTreasure(pawns.activePawn);
            onToast(`Goal Achieved: Found ${landedTreasure.name}!`);
            claimed = true;
          } else if (treasures.remainingCoopTreasures.length === 0) {
            const home = DEFAULT_PAWN_POSITIONS[pawns.activePawn];
            if (home && r === home.r && c === home.c) {
              onToast(`${pawns.activePawn.toUpperCase()} has reached home!`);
              const allHome = pawns.activePlayers.every((p) => {
                const pos = nextPositions[p];
                const pHome = DEFAULT_PAWN_POSITIONS[p];
                return pos && pHome && pos.r === pHome.r && pos.c === pHome.c;
              });
              if (allHome) {
                if (!isMuted) playSuccessSound();
                onToast(
                  treasures.gameMode === "auto"
                    ? "Autoplay Victory! All treasures collected and all pawns are home!"
                    : "Cooperative Victory! All treasures collected and all pawns are home!"
                );
              }
            }
          }
        } else {
          if (landedTreasure && (treasures.playerHands[pawns.activePawn] || []).includes(landedTreasure.id)) {
            if (!isMuted) playSuccessSound();
            const nextHand = (treasures.playerHands[pawns.activePawn] || []).filter(
              (tid) => tid !== landedTreasure.id
            );
            nextPlayerHands = { ...treasures.playerHands, [pawns.activePawn]: nextHand };
            nextPlayerActiveTargets = {
              ...treasures.playerActiveTargets,
              [pawns.activePawn]: nextHand.length > 0 ? nextHand[0] : null,
            };
            nextObtainedTreasures = {
              ...treasures.obtainedTreasures,
              [pawns.activePawn]: [
                ...(treasures.obtainedTreasures[pawns.activePawn] || []),
                landedTreasure.id,
              ],
            };
            treasures.setPlayerHands(nextPlayerHands);
            treasures.setPlayerActiveTargets(nextPlayerActiveTargets);
            treasures.setObtainedTreasures(nextObtainedTreasures);
            pawns.trackPawnTreasure(pawns.activePawn);
            onToast(`Goal Achieved: Found ${landedTreasure.name}!`);
            claimed = true;
          }
        }

        if (!claimed) {
          onToast(`Moved ${pawns.activePawn.toUpperCase()} pawn to (${r}, ${c})`);
        }

        const moveLabel = claimed && landedTreasure
          ? `${pawns.activePawn[0].toUpperCase()}${pawns.activePawn.slice(1)} found ${landedTreasure.name}`
          : `${pawns.activePawn[0].toUpperCase()}${pawns.activePawn.slice(1)} → (${r},${c})`;

        let nextPawn = pawns.activePawn;
        if (treasures.gameMode === "coop" || treasures.gameMode === "auto" || !claimed) {
          const currentIndex = pawns.activePlayers.indexOf(pawns.activePawn);
          nextPawn = pawns.activePlayers[(currentIndex + 1) % pawns.activePlayers.length] || pawns.activePawn;
        }

        pushStateToHistory(
          board.grid,
          board.spareTile,
          board.lastShiftArrowId,
          nextPawn,
          nextPlayerHands,
          nextPlayerActiveTargets,
          nextObtainedTreasures,
          nextPositions,
          moveLabel,
          pawns.activePawn,
          [startCoord, { r, c }],
          treasures.gameMode,
          nextRemainingCoop,
          nextObtainedCoop
        );

        saveAutosave({
          board: board.grid,
          looseTiles: [],
          spareTile: board.spareTile,
          activePawn: nextPawn,
          playerHands: nextPlayerHands,
          playerActiveTargets: nextPlayerActiveTargets,
          obtainedTreasures: nextObtainedTreasures,
          lastShiftArrowId: board.lastShiftArrowId,
          isGameStarted,
          gameStartState,
          pawnPositions: nextPositions,
          gameMode: treasures.gameMode,
          remainingCoopTreasures: nextRemainingCoop,
          coopObtainedTreasures: nextObtainedCoop,
        });

        if (treasures.gameMode === "coop" || treasures.gameMode === "auto" || !claimed) {
          pawns.switchToNextPawn();
        }
      } else {
        if (pawns.customTargetCoords && pawns.customTargetCoords.r === r && pawns.customTargetCoords.c === c) {
          pawns.setCustomTargetCoords(null);
          onToast("Cleared custom target");
        } else {
          pawns.setCustomTargetCoords({ r, c, type: "coord" });
          onToast(`Custom target set at (${r}, ${c}). Solving path...`);
        }
      }
    },
    [
      isGameStarted,
      isMuted,
      board,
      pawns,
      treasures,
      gameStartState,
      pushStateToHistory,
      saveAutosave,
      onToast,
    ]
  );

  const handleStartGame = useCallback(() => {
    if (board.looseTiles.length !== 1) {
      onToast("Cannot start! Make sure exactly 33 tiles are placed on the board.");
      return;
    }
    if (!isMuted) playSuccessSound();

    let initialRemainingCoop: string[] = [];
    if (treasures.gameMode === "coop" || treasures.gameMode === "auto") {
      const boardTreasures: string[] = [];
      board.grid.forEach((row) => {
        row.forEach((tile) => {
          if (tile && tile.treasure) {
            boardTreasures.push(tile.treasure.id);
          }
        });
      });
      board.looseTiles.forEach((tile) => {
        if (tile && tile.treasure) {
          boardTreasures.push(tile.treasure.id);
        }
      });
      initialRemainingCoop = boardTreasures;
      treasures.setRemainingCoopTreasures(initialRemainingCoop);
      treasures.setCoopObtainedTreasures([]);
    }

    const startState: AppGameState = {
      board: board.grid.map((r) => [...r]),
      spareTile: { ...board.looseTiles[0] },
      looseTiles: [],
      activePawn: pawns.activePawn,
      playerHands: { ...treasures.playerHands },
      playerActiveTargets: { ...treasures.playerActiveTargets },
      obtainedTreasures: { ...treasures.obtainedTreasures },
      lastShiftArrowId: null,
      isGameStarted: false,
      gameStartState: null,
      pawnPositions: { ...pawns.pawnPositions },
      gameMode: treasures.gameMode,
      remainingCoopTreasures: initialRemainingCoop,
      coopObtainedTreasures: [],
    };

    board.setSpareTile(board.looseTiles[0]);
    board.setLooseTiles([]);
    setIsGameStarted(true);
    setGameStartState(startState);
    pawns.setCustomTargetCoords(null);
    pawns.totalShiftsRef.current = 0;
    pawns.setTotalShifts(0);

    pushStateToHistory(
      board.grid,
      board.looseTiles[0],
      null,
      pawns.activePawn,
      treasures.playerHands,
      treasures.playerActiveTargets,
      treasures.obtainedTreasures,
      pawns.pawnPositions,
      "Game started",
      undefined,
      undefined,
      treasures.gameMode,
      initialRemainingCoop,
      []
    );
    saveAutosave({
      board: board.grid,
      looseTiles: [],
      spareTile: board.looseTiles[0],
      activePawn: pawns.activePawn,
      playerHands: treasures.playerHands,
      playerActiveTargets: treasures.playerActiveTargets,
      obtainedTreasures: treasures.obtainedTreasures,
      lastShiftArrowId: null,
      isGameStarted: true,
      gameStartState: startState,
      pawnPositions: pawns.pawnPositions,
      gameMode: treasures.gameMode,
      remainingCoopTreasures: initialRemainingCoop,
      coopObtainedTreasures: [],
    });
    onToast(
      treasures.gameMode === "auto"
        ? "Auto Mode active! Sit back while the solver automatically executes optimal moves."
        : treasures.gameMode === "coop"
        ? "Cooperative Game started! Collect all treasures and get all pawns back home."
        : "Game started! Slide the spare tile and move your pawn to targets."
    );
  }, [
    board,
    pawns,
    treasures,
    isMuted,
    pushStateToHistory,
    saveAutosave,
    onToast,
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

    board.setGrid(gameStartState.board);
    board.setLooseTiles([gameStartState.spareTile]);
    board.setSpareTile(gameStartState.spareTile);
    board.setLastShiftArrowId(null);

    pawns.setPawnPositions(restoredPawnPositions);
    pawns.setActivePawn(restoredActivePawn);
    pawns.setCustomTargetCoords(null);
    pawns.setPawnStats({});
    pawns.totalShiftsRef.current = 0;
    pawns.setTotalShifts(0);

    treasures.setPlayerHands(restoredHands);
    treasures.setPlayerActiveTargets(restoredTargets);
    treasures.setObtainedTreasures(restoredObtained);
    treasures.setGameMode(restoredGameMode);
    treasures.setRemainingCoopTreasures(restoredRemainingCoop);
    treasures.setCoopObtainedTreasures(restoredObtainedCoop);

    setIsGameStarted(false);
    setGameStartState(null);

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
    board,
    pawns,
    treasures,
    resetHistory,
    saveAutosave,
  ]);

  const handleExecuteSolution = useCallback(
    (path: SolverSolution) => {
      if (path.length === 0) return;
      const turn1 = path[0];
      const arrow = SHIFT_ARROWS.find((a) => a.id === turn1.arrowId);
      if (!arrow) return;
      if (!isMuted) playSlideSound();

      const pawnToMove = path.pawnColor ?? pawns.activePawn;
      if (pawnToMove !== pawns.activePawn) {
        pawns.setActivePawn(pawnToMove);
      }

      const rotDegrees = ([0, 90, 180, 270] as Rotation[])[turn1.rotation];
      const solverBoard = board.getSolverFormattedBoard(board.grid, pawns.pawnPositions);
      const { newSpare } = executeSlideInGrid(
        solverBoard,
        board.getSolverFormattedSpare({ ...board.spareTile, rotation: rotDegrees }),
        arrow.type,
        arrow.index,
        arrow.dir
      );

      const nextGrid = fromSolverGrid(board.grid, solverBoard, board.nextTileId);
      const nextSpare = fromSolverSpare(newSpare, String(Date.now()));
      const nextPositions: PawnPositions = {
        ...pawns.pawnPositions,
        [pawnToMove]: { r: turn1.endPos.r, c: turn1.endPos.c },
      };

      board.setGrid(nextGrid);
      board.setSpareTile(nextSpare);
      board.setLastShiftArrowId(turn1.arrowId);

      pawns.setPawnPositions(nextPositions);
      pawns.totalShiftsRef.current += 1;
      pawns.setTotalShifts((n) => n + 1);
      pawns.trackPawnMove(pawnToMove, 1);

      const landedTreasure = nextGrid[turn1.endPos.r][turn1.endPos.c]?.treasure;
      let nextPlayerHands = treasures.playerHands;
      let nextPlayerActiveTargets = treasures.playerActiveTargets;
      let nextObtainedTreasures = treasures.obtainedTreasures;
      let nextRemainingCoop = treasures.remainingCoopTreasures;
      let nextObtainedCoop = treasures.coopObtainedTreasures;
      let claimed = false;

      if (treasures.gameMode === "coop" || treasures.gameMode === "auto") {
        if (landedTreasure && treasures.remainingCoopTreasures.includes(landedTreasure.id)) {
          if (!isMuted) playSuccessSound();
          nextRemainingCoop = treasures.remainingCoopTreasures.filter((tid) => tid !== landedTreasure.id);
          nextObtainedCoop = [...treasures.coopObtainedTreasures, landedTreasure.id];
          treasures.setRemainingCoopTreasures(nextRemainingCoop);
          treasures.setCoopObtainedTreasures(nextObtainedCoop);
          pawns.trackPawnTreasure(pawnToMove);
          onToast(`Goal Achieved: Found ${landedTreasure.name}!`);
          claimed = true;
        } else if (treasures.remainingCoopTreasures.length === 0) {
          const home = DEFAULT_PAWN_POSITIONS[pawnToMove];
          if (home && turn1.endPos.r === home.r && turn1.endPos.c === home.c) {
            onToast(`${pawnToMove.toUpperCase()} has reached home!`);
            const allHome = pawns.activePlayers.every((p) => {
              const pos = nextPositions[p];
              const pHome = DEFAULT_PAWN_POSITIONS[p];
              return pos && pHome && pos.r === pHome.r && pos.c === pHome.c;
            });
            if (allHome) {
              if (!isMuted) playSuccessSound();
              onToast(
                treasures.gameMode === "auto"
                  ? "Autoplay Victory! All treasures collected and all pawns are home!"
                  : "Cooperative Victory! All treasures collected and all pawns are home!"
              );
            }
          }
        }
      } else {
        if (landedTreasure && (treasures.playerHands[pawnToMove] || []).includes(landedTreasure.id)) {
          if (!isMuted) playSuccessSound();
          const nextHand = (treasures.playerHands[pawnToMove] || []).filter(
            (tid) => tid !== landedTreasure.id
          );
          nextPlayerHands = { ...treasures.playerHands, [pawnToMove]: nextHand };
          nextPlayerActiveTargets = {
            ...treasures.playerActiveTargets,
            [pawnToMove]: nextHand.length > 0 ? nextHand[0] : null,
          };
          nextObtainedTreasures = {
            ...treasures.obtainedTreasures,
            [pawnToMove]: [
              ...(treasures.obtainedTreasures[pawnToMove] || []),
              landedTreasure.id,
            ],
          };
          treasures.setPlayerHands(nextPlayerHands);
          treasures.setPlayerActiveTargets(nextPlayerActiveTargets);
          treasures.setObtainedTreasures(nextObtainedTreasures);
          pawns.trackPawnTreasure(pawnToMove);
          onToast(`Goal Achieved: Found ${landedTreasure.name}!`);
          claimed = true;
        }
      }
      const execLabel = claimed && landedTreasure
        ? `${pawnToMove[0].toUpperCase()}${pawnToMove.slice(1)} found ${landedTreasure.name}`
        : `${pawnToMove[0].toUpperCase()}${pawnToMove.slice(1)} → (${turn1.endPos.r},${turn1.endPos.c})`;
      const execPath = (turn1 as { pawnPath?: { r: number; c: number }[] }).pawnPath ?? [
        pawns.pawnPositions[pawnToMove],
        turn1.endPos,
      ];

      let nextPawnForSave = pawnToMove;
      const currentIndex = pawns.activePlayers.indexOf(pawnToMove);
      nextPawnForSave = pawns.activePlayers[(currentIndex + 1) % pawns.activePlayers.length] || pawnToMove;

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
        treasures.gameMode,
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
        gameMode: treasures.gameMode,
        remainingCoopTreasures: nextRemainingCoop,
        coopObtainedTreasures: nextObtainedCoop,
      });

      pawns.switchToNextPawn();
    },
    [
      isMuted,
      board,
      pawns,
      treasures,
      isGameStarted,
      gameStartState,
      pushStateToHistory,
      saveAutosave,
      onToast,
    ]
  );

  // ── Undo / Redo (apply history back to internal state) ──────────────────────
  const handleUndo = useCallback(() => {
    undo((state) => {
      board.setGrid(state.board);
      board.setSpareTile(state.spareTile);
      board.setLastShiftArrowId(state.lastShiftArrowId);
      pawns.setActivePawn(state.activePawn);
      treasures.setPlayerHands(state.playerHands);
      treasures.setPlayerActiveTargets(state.playerActiveTargets);
      treasures.setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      if (state.pawnPositions) pawns.setPawnPositions(state.pawnPositions);
      if (state.gameMode) treasures.setGameMode(state.gameMode);
      if (state.remainingCoopTreasures) treasures.setRemainingCoopTreasures(state.remainingCoopTreasures);
      if (state.coopObtainedTreasures) treasures.setCoopObtainedTreasures(state.coopObtainedTreasures);
    });
  }, [undo, board, pawns, treasures]);

  const handleRedo = useCallback(() => {
    redo((state) => {
      board.setGrid(state.board);
      board.setSpareTile(state.spareTile);
      board.setLastShiftArrowId(state.lastShiftArrowId);
      pawns.setActivePawn(state.activePawn);
      treasures.setPlayerHands(state.playerHands);
      treasures.setPlayerActiveTargets(state.playerActiveTargets);
      treasures.setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      if (state.pawnPositions) pawns.setPawnPositions(state.pawnPositions);
      if (state.gameMode) treasures.setGameMode(state.gameMode);
      if (state.remainingCoopTreasures) treasures.setRemainingCoopTreasures(state.remainingCoopTreasures);
      if (state.coopObtainedTreasures) treasures.setCoopObtainedTreasures(state.coopObtainedTreasures);
    });
  }, [redo, board, pawns, treasures]);

  const handleJumpToHistory = useCallback(
    (index: number) => {
      jumpToHistory(index, (state) => {
        board.setGrid(state.board);
        board.setSpareTile(state.spareTile);
        board.setLastShiftArrowId(state.lastShiftArrowId);
        pawns.setActivePawn(state.activePawn);
        treasures.setPlayerHands(state.playerHands);
        treasures.setPlayerActiveTargets(state.playerActiveTargets);
        treasures.setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
        if (state.pawnPositions) pawns.setPawnPositions(state.pawnPositions);
        if (state.gameMode) treasures.setGameMode(state.gameMode);
        if (state.remainingCoopTreasures) treasures.setRemainingCoopTreasures(state.remainingCoopTreasures);
        if (state.coopObtainedTreasures) treasures.setCoopObtainedTreasures(state.coopObtainedTreasures);
      });
    },
    [jumpToHistory, board, pawns, treasures]
  );

  return {
    // Board state
    grid: board.grid,
    setGrid: board.setGrid,
    looseTiles: board.looseTiles,
    setLooseTiles: board.setLooseTiles,
    spareTile: board.spareTile,
    setSpareTile: board.setSpareTile,
    lastShiftArrowId: board.lastShiftArrowId,
    showEmptyTiles: board.showEmptyTiles,
    setShowEmptyTiles: board.setShowEmptyTiles,
    // Game lifecycle
    isGameStarted,
    gameStartState,
    setupTab,
    setSetupTab,
    // Pawn state
    activePawn: pawns.activePawn,
    setActivePawn: pawns.setActivePawn,
    activePlayers: pawns.activePlayers,
    setActivePlayers: pawns.setActivePlayers,
    pawnPositions: pawns.pawnPositions,
    setPawnPositions: pawns.setPawnPositions,
    pawnStats: pawns.pawnStats,
    customTargetCoords: pawns.customTargetCoords,
    setCustomTargetCoords: pawns.setCustomTargetCoords,
    totalShiftsRef: pawns.totalShiftsRef,
    totalShifts: pawns.totalShifts,
    // Treasure state
    playerHands: treasures.playerHands,
    playerActiveTargets: treasures.playerActiveTargets,
    obtainedTreasures: treasures.obtainedTreasures,
    gameMode: treasures.gameMode,
    setGameMode: treasures.setGameMode,
    remainingCoopTreasures: treasures.remainingCoopTreasures,
    setRemainingCoopTreasures: treasures.setRemainingCoopTreasures,
    coopObtainedTreasures: treasures.coopObtainedTreasures,
    setCoopObtainedTreasures: treasures.setCoopObtainedTreasures,
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
    getSolverFormattedBoard: board.getSolverFormattedBoard,
    getSolverFormattedSpare: board.getSolverFormattedSpare,
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
    switchToNextPawn: pawns.switchToNextPawn,
  };
}
