import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { SHIFT_ARROWS, TREASURES } from "./constants";
import type { TileData, SolverSolution } from "./types";
import { Board } from "./components/Board";
import { Tile } from "./components/Tile";
import { Button } from "./components/ui/button";
import { SolverPanel } from "./components/SolverPanel";
import { SetupPanel } from "./components/SetupPanel";
import { StatsPanel } from "./components/StatsPanel";
import { AppHeader } from "./components/AppHeader";
import { Dialog, DialogContent } from "./components/ui/dialog";
import { useLabyrinthGame } from "./hooks/useLabyrinthGame";
import { playClickSound } from "./utils/audio";
import { fromSolverGrid } from "./lib/solverAdapter";
import { executeSlideInGrid, getReachableCells, quickSolveMinTurns } from "./solver";
import type { Rotation } from "./types";
import {
  Sparkles,
  Undo2,
  Redo2,
  RotateCw,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { cn } from "./lib/utils";

export default function App() {
  const sensors = useSensors(
    // Touch: press-and-hold to drag so the loose-tile tray can scroll freely
    // without a stray drag; mouse/pen keep the responsive distance activation.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  // ── UI-only state (stays in App) ─────────────────────────────────────────────
  const [isMuted, setIsMuted] = useState(
    () => localStorage.getItem("labyrinth_audio_muted") === "true"
  );
  const [baseTheme, setBaseThemeState] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("labyrinth_theme") ?? "";
    return saved === "light" ? "light" : "dark";
  });
  const [boardRotation, setBoardRotation] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [accentColor, setAccentColorState] = useState(
    () => localStorage.getItem("labyrinth_accent_color") ?? ""
  );
  const [showStats, setShowStats] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [turnPhase, setTurnPhase] = useState<"slide" | "move">("slide");
  const [stagedArrow, setStagedArrow] = useState<string | null>(null);
  const [stagedRotation, setStagedRotation] = useState<0 | 90 | 180 | 270>(0);
  const [showOneMoveTargets, setShowOneMoveTargets] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(true);
  const [hasShownSetupHint, setHasShownSetupHint] = useState(false);

  // ── Solver worker ─────────────────────────────────────────────────────────────
  const [solutions, setSolutions] = useState<SolverSolution[]>([]);
  const [hoveredSolution, setHoveredSolution] = useState<SolverSolution | null>(null);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);
  const [maxTurns, setMaxTurns] = useState(2);
  const workerRef = useRef<Worker | null>(null);

  // ── Toast system ──────────────────────────────────────────────────────────────
  const [toastText, setToastText] = useState<string | null>(null);
  const showToast = useCallback(
    (msg: string) => {
      setToastText(msg);
      if (!isMuted) playClickSound();
    },
    [isMuted]
  );

  useEffect(() => {
    if (!toastText) return;
    const t = setTimeout(() => setToastText(null), 3000);
    return () => clearTimeout(t);
  }, [toastText]);

  // ── Theme effect ─────────────────────────────────────────────────────────────
  const setBaseTheme = useCallback((t: "dark" | "light") => {
    setBaseThemeState(t);
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", baseTheme);
    try {
      localStorage.setItem("labyrinth_theme", baseTheme);
    } catch {
      /* storage full */
    }
  }, [baseTheme]);

  // ── Accent color ──────────────────────────────────────────────────────────────
  const applyAccentColor = useCallback((hex: string) => {
    if (!hex) return;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    document.documentElement.style.setProperty("--theme-color", hex);
    document.documentElement.style.setProperty("--theme-color-hover", hex);
    document.documentElement.style.setProperty("--theme-color-rgb", `${r}, ${g}, ${b}`);
    document.documentElement.style.setProperty("--theme-glow", `rgba(${r}, ${g}, ${b}, 0.15)`);
  }, []);

  const setAccentColor = useCallback(
    (hex: string) => {
      setAccentColorState(hex);
      applyAccentColor(hex);
      try {
        localStorage.setItem("labyrinth_accent_color", hex);
      } catch {
        /* storage full */
      }
    },
    [applyAccentColor]
  );

  // Apply saved accent color on mount
  useEffect(() => {
    if (accentColor) applyAccentColor(accentColor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Mute toggle ───────────────────────────────────────────────────────────────
  const handleToggleMute = useCallback(() => {
    const next = !isMuted;
    setIsMuted(next);
    try {
      localStorage.setItem("labyrinth_audio_muted", String(next));
    } catch {
      /* storage full */
    }
    setToastText(next ? "Muted retro sound effects 🔇" : "Sound effects enabled 🔊");
  }, [isMuted]);

  // ── Game hook ─────────────────────────────────────────────────────────────────
  const game = useLabyrinthGame({
    isMuted,
    onToast: showToast,
  });

  // ── Setup guidance for mobile users ───────────────────────────────────────────
  useEffect(() => {
    if (game.isGameStarted) {
      setHasShownSetupHint(false);
      setMobileSheetOpen(false);
    }
  }, [game.isGameStarted]);

  useEffect(() => {
    if (!game.isGameStarted && game.looseTiles.length !== 1 && !hasShownSetupHint) {
      setMobileSheetOpen(true);
      showToast("Tap Randomize Board or place tiles to finish setup.");
      setHasShownSetupHint(true);
    }
  }, [game.isGameStarted, game.looseTiles.length, hasShownSetupHint, showToast]);

  // ── Turn-phase-aware slide, arrow staging, and cell-click ────────────────────
  const handleArrowClick = useCallback(
    (arrowId: string) => {
      if (stagedArrow === arrowId) {
        // Already staged — rotate the staged spare instead
        setStagedRotation(
          (prev) =>
            ([0, 90, 180, 270] as (0 | 90 | 180 | 270)[])[
              ([0, 90, 180, 270].indexOf(prev) + 1) % 4
            ]
        );
      } else {
        setStagedArrow(arrowId);
        // Initialise staged rotation from the current spare tile's actual rotation
        setStagedRotation(game.spareTile.rotation as 0 | 90 | 180 | 270);
      }
    },
    [stagedArrow, game.spareTile.rotation]
  );

  const commitStagedSlide = useCallback(() => {
    if (!stagedArrow) return;
    // Apply staged rotation to the real spare, then slide
    if (stagedRotation !== game.spareTile.rotation) {
      // Rotate the spare to the staged rotation by clicking until it matches
      const turns =
        ([0, 90, 180, 270].indexOf(stagedRotation) -
          [0, 90, 180, 270].indexOf(game.spareTile.rotation as 0 | 90 | 180 | 270) +
          4) %
        4;
      for (let i = 0; i < turns; i++) game.handleTileClick(game.spareTile.id);
    }
    game.handleSlide(stagedArrow);
    setStagedArrow(null);
    setTurnPhase("move");
  }, [stagedArrow, stagedRotation, game]);

  const cancelStagedSlide = useCallback(() => {
    setStagedArrow(null);
    setStagedRotation(game.spareTile.rotation as 0 | 90 | 180 | 270);
  }, [game.spareTile.rotation]);

  const handleManualCellClick = useCallback(
    (r: number, c: number) => {
      if (!game.isGameStarted) {
        game.handleCellClick(r, c);
        return;
      }
      if (turnPhase === "slide") {
        // In slide phase, clicking a cell sets it as custom target (any cell, not just treasures)
        game.setCustomTargetCoords({ r, c });
        return;
      }
      if (turnPhase !== "move") return;
      game.handleCellClick(r, c);
      setTurnPhase("slide");
    },
    [game, turnPhase]
  );

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      const tag = active?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      const ctrl = e.ctrlKey || e.metaKey;
      if (ctrl && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        if (!isMuted) playClickSound();
        game.handleUndo();
        return;
      }
      if (ctrl && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        if (!isMuted) playClickSound();
        game.handleRedo();
        return;
      }
      if (ctrl && e.key === "s") {
        e.preventDefault();
        showToast("Autosave keeps your layout ready next time ✨");
        return;
      }
      if (e.key === "?" && !ctrl) {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, game.handleUndo, game.handleRedo, showToast]);

  // ── Turn phase reset ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (game.isGameStarted) {
      setTurnPhase("slide");
      setStagedArrow(null);
      setStagedRotation(game.spareTile.rotation as 0 | 90 | 180 | 270);
    }
  }, [game.activePawn, game.isGameStarted, game.spareTile.rotation]);

  // ── Solver worker lifecycle ───────────────────────────────────────────────────
  useEffect(() => {
    try {
      workerRef.current = new Worker(new URL("./solver.worker.js", import.meta.url), {
        type: "module",
      });
      workerRef.current.onmessage = (e) => {
        const { success, solutions: computed, error } = e.data as {
          success: boolean;
          solutions: SolverSolution[];
          error: string;
        };
        if (success) setSolutions(computed || []);
        else {
          console.error("Worker solver failed:", error);
          showToast("Solver error — try adjusting targets or reducing max turns.");
        }
        setIsLoadingSolutions(false);
      };
      workerRef.current.onerror = (e) => {
        console.error("Worker crashed:", e);
        showToast("Solver worker crashed. Reload to retry.");
        setIsLoadingSolutions(false);
      };
    } catch (err) {
      console.warn("Failed to instantiate Web Worker solver.", err);
    }

    // Attempt load from autosave once on mount
    const saved = game.loadAutosave();
    if (saved?.board) {
      game.hydrateFromSaved(saved, game.spareTile);
    } else {
      game.resetBoardToInitialPresets();
    }

    return () => workerRef.current?.terminate();
    // Mount-only: do not re-run when game callbacks change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Solver re-run on board/pawn/hand changes ──────────────────────────────────
  useEffect(() => {
    if (!game.isGameStarted || game.grid.length === 0 || !workerRef.current) return;
    const currentPawnCoord = game.pawnPositions[game.activePawn];
    const handCards = game.customTargetCoords
      ? ["custom_target"]
      : game.playerHands[game.activePawn] || [];
    if (!currentPawnCoord || handCards.length === 0) {
      setSolutions([]);
      return;
    }

    setIsLoadingSolutions(true);
    let solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
    const solverSpare = game.getSolverFormattedSpare(game.spareTile);

    if (game.customTargetCoords) {
      solverBoard = solverBoard.map(
        (
          row: {
            r: number;
            c: number;
            treasure: string | null;
            shape: string;
            dir: number;
            isFixed: boolean;
            pawns: string[];
          }[],
          r: number
        ) =>
          row.map(
            (
              cell: {
                r: number;
                c: number;
                treasure: string | null;
                shape: string;
                dir: number;
                isFixed: boolean;
                pawns: string[];
              },
              c: number
            ) =>
              r === game.customTargetCoords!.r && c === game.customTargetCoords!.c
                ? { ...cell, treasure: "custom_target" }
                : cell
          )
      );
    }

    workerRef.current.postMessage({
      board: solverBoard,
      spareTile: solverSpare,
      pawnPos: currentPawnCoord,
      handCards,
      lastShiftArrowId: game.lastShiftArrowId,
      maxTurns,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    game.grid,
    game.spareTile,
    game.activePawn,
    game.playerHands,
    game.lastShiftArrowId,
    maxTurns,
    game.isGameStarted,
    game.pawnPositions,
    game.getSolverFormattedBoard,
    game.getSolverFormattedSpare,
    game.customTargetCoords,
  ]);

  // ── Drag and Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const tileId = active.id as string;
    const tileData = active.data.current as TileData;
    if (tileData.isFixed) return;

    const overId = over.id as string;
    const removeTile = (id: string) => {
      game.setLooseTiles((prev) => prev.filter((t) => t.id !== id));
      game.setGrid((prev) =>
        prev.map((row) =>
          row.map((tile) => (tile?.id === id ? null : tile))
        )
      );
    };
    const findTile = (id: string): TileData | undefined => {
      const inLoose = game.looseTiles.find((t) => t.id === id);
      if (inLoose) return inLoose;
      for (let r = 0; r < 7; r++)
        for (let c = 0; c < 7; c++)
          if (game.grid[r][c]?.id === id) return game.grid[r][c]!;
    };
    const tileToMove = findTile(tileId);
    if (!tileToMove) return;

    if (overId === "side_panel") {
      removeTile(tileId);
      game.setLooseTiles((prev) => [...prev, tileToMove]);
    } else if (overId.startsWith("board_")) {
      const [, sx, sy] = overId.split("_");
      const tx = parseInt(sx);
      const ty = parseInt(sy);
      if (game.grid[ty][tx] === null) {
        removeTile(tileId);
        game.setGrid((prev) => {
          const next = prev.map((row) => [...row]);
          next[ty][tx] = tileToMove;
          return next;
        });
      }
    }
  };

  // ── Preview state for hovered solver suggestion ───────────────────────────────
  const previewState = useMemo(() => {
    if (
      !hoveredSolution ||
      (hoveredSolution as { arrowId: string; rotation: number }[]).length === 0
    )
      return null;
    const turn1 = (hoveredSolution as { arrowId: string; rotation: number }[])[0];
    const arrow = SHIFT_ARROWS.find((a) => a.id === turn1.arrowId);
    if (!arrow) return null;
    try {
      const solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
      const rotDegrees = ([0, 90, 180, 270] as Rotation[])[turn1.rotation];
      const solverSpare = game.getSolverFormattedSpare({
        ...game.spareTile,
        rotation: rotDegrees,
      });
      executeSlideInGrid(solverBoard, solverSpare, arrow.type, arrow.index, arrow.dir);
      const previewGrid = fromSolverGrid(
        game.grid,
        solverBoard,
        () => "preview_temp_inserted"
      );
      const previewPawnPositions = { ...game.pawnPositions };
      Object.entries(game.pawnPositions).forEach(([color, pos]) => {
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
        previewPawnPositions[color] = { r: nr, c: nc };
      });
      return {
        grid: previewGrid,
        pawnPositions: previewPawnPositions,
        spareTile: { ...game.spareTile, rotation: rotDegrees },
      };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hoveredSolution,
    game.grid,
    game.pawnPositions,
    game.spareTile,
    game.getSolverFormattedBoard,
    game.getSolverFormattedSpare,
  ]);

  const overlaySuggestedPath = useMemo(() => {
    if (
      !hoveredSolution ||
      (hoveredSolution as { pawnPath: { r: number; c: number }[] }[]).length === 0
    )
      return null;
    return (hoveredSolution as { pawnPath: { r: number; c: number }[] }[])[0].pawnPath;
  }, [hoveredSolution]);

  const activeTargetCoords = useMemo(() => {
    const targetId = game.playerActiveTargets[game.activePawn];
    if (!targetId) return null;
    const gridToSearch = previewState?.grid ?? game.grid;
    if (!gridToSearch.length) return null;
    for (let r = 0; r < 7; r++)
      for (let c = 0; c < 7; c++) {
        const cell = gridToSearch[r]?.[c];
        if (cell?.treasure?.id === targetId) return { r, c };
      }
    return null;
  }, [game.playerActiveTargets, game.activePawn, game.grid, previewState]);

  const stagedPreviewState = useMemo(() => {
    if (hoveredSolution || !stagedArrow || turnPhase !== "slide") return null;
    const arrow = SHIFT_ARROWS.find((a) => a.id === stagedArrow);
    if (!arrow) return null;
    try {
      const solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
      const solverSpare = game.getSolverFormattedSpare({
        ...game.spareTile,
        rotation: stagedRotation,
      });
      executeSlideInGrid(solverBoard, solverSpare, arrow.type, arrow.index, arrow.dir);
      const previewGrid = fromSolverGrid(
        game.grid,
        solverBoard,
        () => "staged_preview"
      );
      const previewPawnPositions = { ...game.pawnPositions };
      Object.entries(game.pawnPositions).forEach(([color, pos]) => {
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
        previewPawnPositions[color] = { r: nr, c: nc };
      });
      return {
        grid: previewGrid,
        pawnPositions: previewPawnPositions,
        spareTile: { ...game.spareTile, rotation: stagedRotation },
      };
    } catch {
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hoveredSolution,
    stagedArrow,
    stagedRotation,
    turnPhase,
    game.grid,
    game.pawnPositions,
    game.spareTile,
    game.getSolverFormattedBoard,
    game.getSolverFormattedSpare,
  ]);

  const reachableCells = useMemo<{ r: number; c: number }[]>(() => {
    if (!game.isGameStarted) return [];
    // During move phase, use the post-slide game grid
    if (turnPhase === "move") {
      const pawnPos = game.pawnPositions[game.activePawn];
      if (!pawnPos) return [];
      try {
        const solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
        const { cells } = getReachableCells(solverBoard, pawnPos.r, pawnPos.c);
        return cells as { r: number; c: number }[];
      } catch {
        return [];
      }
    }
    // During staged preview, show reachable cells from the staged board
    if (stagedPreviewState) {
      const pawnPos = stagedPreviewState.pawnPositions[game.activePawn];
      if (!pawnPos) return [];
      try {
        const solverBoard = game.getSolverFormattedBoard(
          stagedPreviewState.grid,
          stagedPreviewState.pawnPositions
        );
        const { cells } = getReachableCells(solverBoard, pawnPos.r, pawnPos.c);
        return cells as { r: number; c: number }[];
      } catch {
        return [];
      }
    }
    return [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    game.isGameStarted,
    turnPhase,
    game.grid,
    game.pawnPositions,
    game.activePawn,
    game.getSolverFormattedBoard,
    stagedPreviewState,
  ]);

  const effectivePreview = previewState || stagedPreviewState;

  const oneMoveTargets = useMemo<{ id: string; name: string }[]>(() => {
    if (!game.isGameStarted || !showOneMoveTargets) return [];
    const pawnPos = game.pawnPositions[game.activePawn];
    if (!pawnPos) return [];
    const allObtained = Object.values(game.obtainedTreasures).flat();
    try {
      const solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
      const solverSpare = game.getSolverFormattedSpare(game.spareTile);
      return TREASURES.filter((t) => {
        if (allObtained.includes(t.id)) return false;
        try {
          const turns = quickSolveMinTurns(
            solverBoard.map((row) => row.map((c) => ({ ...c }))),
            { ...solverSpare },
            pawnPos,
            t.id,
            game.lastShiftArrowId,
            1
          );
          return turns === 1;
        } catch {
          return false;
        }
      });
    } catch {
      return [];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    game.isGameStarted,
    showOneMoveTargets,
    game.grid,
    game.pawnPositions,
    game.activePawn,
    game.spareTile,
    game.obtainedTreasures,
    game.lastShiftArrowId,
    game.getSolverFormattedBoard,
    game.getSolverFormattedSpare,
  ]);

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-theme-primary-10 blur-[120px] rounded-full pointer-events-none" />

      <AppHeader
        isGameStarted={game.isGameStarted}
        canUndo={game.canUndo}
        canRedo={game.canRedo}
        isMuted={isMuted}
        showStats={showStats}
        baseTheme={baseTheme}
        activePlayers={game.activePlayers}
        activePawn={game.activePawn}
        looseTiles={game.looseTiles}
        accentColor={accentColor}
        setAccentColor={setAccentColor}
        isSettingsOpen={isSettingsOpen}
        onOpenSettings={() => {
          if (!isMuted) playClickSound();
          setIsSettingsOpen(true);
        }}
        onCloseSettings={() => setIsSettingsOpen(false)}
        onUndo={() => game.handleUndo()}
        onRedo={() => game.handleRedo()}
        onResetBoard={() => game.resetBoardToInitialPresets()}
        onRotateBoard={() => setBoardRotation((prev) => (prev + 90) % 360)}
        onToggleStats={() => setShowStats((prev) => !prev)}
        onStartGame={game.handleStartGame}
        onEndGame={game.handleEndGame}
        onToggleMute={handleToggleMute}
        onSetBaseTheme={setBaseTheme}
        onSetActivePlayers={game.setActivePlayers}
        showToast={showToast}
        onRandomizeBoard={game.handleRandomizeBoard}
        playerHands={game.playerHands}
        obtainedTreasures={game.obtainedTreasures}
      />

      <main className="flex-1 flex flex-col md:flex-row relative z-10 w-full px-2 sm:px-3 md:px-4 lg:px-6 pt-2 sm:pt-3 pb-[72px] md:pb-3 gap-3 md:gap-4 lg:gap-8 justify-center overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 md:flex-[1.4] lg:flex-[1.5] w-full flex min-w-0 min-h-0 items-center justify-center relative">
            <div
              className="relative aspect-square w-full h-auto flex-shrink-0 mx-auto max-w-[min(100vw-1rem,calc(100svh-220px))] sm:max-w-[min(100vw-2rem,calc(100svh-280px))] md:max-w-[calc(100svh-180px)] lg:max-w-[calc(100svh-140px)]"
            >

              <Board
                grid={effectivePreview ? effectivePreview.grid : game.grid}
                originalGrid={game.grid}
                pawnPositions={
                  effectivePreview ? effectivePreview.pawnPositions : game.pawnPositions
                }
                onCellClick={handleManualCellClick}
                onTileClick={game.handleTileClick}
                isGameStarted={game.isGameStarted}
                lastShiftArrowId={game.lastShiftArrowId}
                onArrowClick={handleArrowClick}
                hoveredPath={overlaySuggestedPath}
                hoveredSolutionArrow={
                  hoveredSolution
                    ? (hoveredSolution as { arrowId: string }[])[0].arrowId
                    : stagedArrow || null
                }
                boardRotation={boardRotation}
                customTargetCoords={game.customTargetCoords}
                activeTargetCoords={activeTargetCoords}
                reachableCells={reachableCells}
                turnPhase={turnPhase}
                stagedArrow={stagedArrow}
                onTreasureClick={(treasureId, alreadyObtained) => {
                  if (turnPhase === "move") return; // ignore treasure clicks during pawn movement
                  game.handleSelectTargetTreasure(game.activePawn, treasureId);
                  if (alreadyObtained) {
                    showToast(
                      `⚠️ ${
                        TREASURES.find((t) => t.id === treasureId)?.name ?? treasureId
                      } already obtained — solving anyway`
                    );
                  }
                }}
                allObtainedTreasures={Object.values(game.obtainedTreasures).flat()}
                activeTargetTreasureId={game.playerActiveTargets[game.activePawn]}
              />
            </div>
          </div>

          {/* Tablet & desktop side panel (md+) */}
          <div className="hidden md:flex w-full md:w-[320px] lg:w-[400px] xl:w-[440px] flex-col flex-shrink-0 min-h-0 md:h-full gap-3">
            {game.isGameStarted ? (
              <SolverPanel
                solutions={solutions}
                isLoadingSolutions={isLoadingSolutions}
                hoveredSolution={hoveredSolution}
                setHoveredSolution={setHoveredSolution}
                maxTurns={maxTurns}
                setMaxTurns={setMaxTurns}
                activePawn={game.activePawn}
                setActivePawn={game.setActivePawn}
                activePlayers={game.activePlayers}
                isMuted={isMuted}
                spareTile={previewState ? previewState.spareTile : game.spareTile}
                customTargetCoords={game.customTargetCoords}
                setCustomTargetCoords={game.setCustomTargetCoords}
                onExecuteSolution={game.handleExecuteSolution}
                playerActiveTargets={game.playerActiveTargets}
                onSelectTargetTreasure={game.handleSelectTargetTreasure}
                stagedArrow={stagedArrow}
                stagedRotation={stagedRotation}
                onRotateStaged={() =>
                  setStagedRotation(
                    (prev) =>
                      ([0, 90, 180, 270] as (0 | 90 | 180 | 270)[])[
                        ([0, 90, 180, 270].indexOf(prev) + 1) % 4
                      ]
                  )
                }
                onCommitSlide={commitStagedSlide}
                onCancelSlide={cancelStagedSlide}
                turnPhase={turnPhase}
                showOneMoveTargets={showOneMoveTargets}
                onToggleOneMoveTargets={() => setShowOneMoveTargets((v) => !v)}
                oneMoveTargets={oneMoveTargets}
              />
            ) : (
              <SetupPanel
                looseTiles={game.looseTiles}
                activePlayers={game.activePlayers}
                activePawn={game.activePawn}
                setActivePawn={game.setActivePawn}
                isMuted={isMuted}
                activePawnPlacementColor={game.activePawnPlacementColor}
                setActivePawnPlacementColor={game.setActivePawnPlacementColor}
                pawnPositions={game.pawnPositions}
                playerHands={game.playerHands}
                onTileClick={game.handleTileClick}
                onRandomizeBoard={game.handleRandomizeBoard}
                onAddCard={game.handleAddCard}
                onRemoveCard={game.handleRemoveCard}
                setupTab={game.setupTab}
                setSetupTab={game.setSetupTab}
              />
            )}
          </div>

          {/* Mobile bottom sheet panel (phones only, < md) */}
          <div
            className={cn(
              "md:hidden fixed inset-x-0 bottom-[56px] z-30 transition-transform duration-300 ease-out",
              mobileSheetOpen ? "translate-y-0" : "translate-y-full"
            )}
            style={{ maxHeight: "70svh" }}
          >
            {/* Backdrop */}
            {mobileSheetOpen && (
              <div
                className="fixed inset-0 bottom-[56px] bg-black/50 backdrop-blur-sm -z-10"
                onClick={() => setMobileSheetOpen(false)}
              />
            )}
            {/* Sheet */}
            <div
              className="app-mobile-sheet rounded-t-2xl shadow-2xl flex flex-col"
              style={{ maxHeight: "70svh" }}
            >
              {/* Drag handle */}
              <div
                className="flex items-center justify-center pt-2 pb-1 cursor-pointer"
                onClick={() => setMobileSheetOpen(false)}
              >
                <div className="w-10 h-1 rounded-full bg-stone-600" />
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain">
                {game.isGameStarted ? (
                  <SolverPanel
                    solutions={solutions}
                    isLoadingSolutions={isLoadingSolutions}
                    hoveredSolution={hoveredSolution}
                    setHoveredSolution={setHoveredSolution}
                    maxTurns={maxTurns}
                    setMaxTurns={setMaxTurns}
                    activePawn={game.activePawn}
                    setActivePawn={game.setActivePawn}
                    activePlayers={game.activePlayers}
                    isMuted={isMuted}
                    spareTile={previewState ? previewState.spareTile : game.spareTile}
                    customTargetCoords={game.customTargetCoords}
                    setCustomTargetCoords={game.setCustomTargetCoords}
                    onExecuteSolution={game.handleExecuteSolution}
                    playerActiveTargets={game.playerActiveTargets}
                    onSelectTargetTreasure={game.handleSelectTargetTreasure}
                    stagedArrow={stagedArrow}
                    stagedRotation={stagedRotation}
                    onRotateStaged={() =>
                      setStagedRotation(
                        (prev) =>
                          ([0, 90, 180, 270] as (0 | 90 | 180 | 270)[])[
                            ([0, 90, 180, 270].indexOf(prev) + 1) % 4
                          ]
                      )
                    }
                    onCommitSlide={commitStagedSlide}
                    onCancelSlide={cancelStagedSlide}
                    turnPhase={turnPhase}
                    showOneMoveTargets={showOneMoveTargets}
                    onToggleOneMoveTargets={() => setShowOneMoveTargets((v) => !v)}
                    oneMoveTargets={oneMoveTargets}
                  />
                ) : (
                  <SetupPanel
                    looseTiles={game.looseTiles}
                    activePlayers={game.activePlayers}
                    activePawn={game.activePawn}
                    setActivePawn={game.setActivePawn}
                    isMuted={isMuted}
                    activePawnPlacementColor={game.activePawnPlacementColor}
                    setActivePawnPlacementColor={game.setActivePawnPlacementColor}
                    pawnPositions={game.pawnPositions}
                    playerHands={game.playerHands}
                    onTileClick={game.handleTileClick}
                    onRandomizeBoard={game.handleRandomizeBoard}
                    onAddCard={game.handleAddCard}
                    onRemoveCard={game.handleRemoveCard}
                    setupTab={game.setupTab}
                    setSetupTab={game.setSetupTab}
                  />
                )}
              </div>
            </div>
          </div>

          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <Tile
                tile={
                  game.looseTiles.find((t) => t.id === activeId) ||
                  game.grid.flat().find((t) => t?.id === activeId)!
                }
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 shadow-2xl shadow-black ring-4 ring-theme-primary/50"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>

      {/* Stats dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent
          className="sm:max-w-[500px] app-dialog-panel border border-stone-800 text-stone-100 shadow-2xl p-0 rounded-2xl overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === " ") e.stopPropagation();
          }}
        >
          <StatsPanel
            activePlayers={game.activePlayers}
            pawnStats={game.pawnStats}
            totalShifts={game.totalShiftsRef.current}
            obtainedTreasures={game.obtainedTreasures}
          />
        </DialogContent>
      </Dialog>

      {/* Toast */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {toastText}
      </div>
      {toastText && (
        <div
          className="fixed bottom-[72px] md:bottom-6 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-2.5 sm:py-3 bg-stone-900 border border-theme-primary-20 text-stone-100 font-semibold text-xs sm:text-sm rounded-full shadow-2xl shadow-black z-50 animate-toast-in flex items-center gap-2 whitespace-nowrap"
          aria-hidden="true"
        >
          <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />
          {toastText}
        </div>
      )}

      {/* Mobile Actions Bar (phones only, < md) */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 app-mobile-nav px-2 flex items-center justify-around z-40"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom) + 6px)",
          paddingTop: "6px",
          height: "56px",
        }}
      >
        <Button
          variant="ghost"
          size="sm"
          disabled={!game.canUndo}
          onClick={() => {
            if (!isMuted) playClickSound();
            game.handleUndo();
          }}
          className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 disabled:opacity-30 h-auto py-1 px-3 cursor-pointer"
        >
          <Undo2 className="w-4 h-4" />
          <span className="text-[9px] font-medium">Undo</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          disabled={!game.canRedo}
          onClick={() => {
            if (!isMuted) playClickSound();
            game.handleRedo();
          }}
          className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 disabled:opacity-30 h-auto py-1 px-3 cursor-pointer"
        >
          <Redo2 className="w-4 h-4" />
          <span className="text-[9px] font-medium">Redo</span>
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            if (!isMuted) playClickSound();
            setBoardRotation((prev) => (prev + 90) % 360);
          }}
          className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 h-auto py-1 px-3 cursor-pointer"
        >
          <RotateCw className="w-4 h-4" />
          <span className="text-[9px] font-medium">Rotate</span>
        </Button>

        {/* Panel toggle button — opens bottom sheet */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMobileSheetOpen((v) => !v)}
          className={cn(
            "flex flex-col items-center gap-0.5 h-auto py-1 px-3 cursor-pointer relative",
            mobileSheetOpen ? "text-theme-primary" : "text-stone-400 hover:text-stone-200"
          )}
        >
          {mobileSheetOpen ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          <span className="text-[9px] font-medium">
            {game.isGameStarted ? "Solver" : "Setup"}
          </span>
          {/* Badge for solver solutions */}
          {game.isGameStarted && solutions.length > 0 && !mobileSheetOpen && (
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-theme-primary text-stone-950 text-[8px] font-bold flex items-center justify-center">
              {solutions.length}
            </span>
          )}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleToggleMute}
          className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 h-auto py-1 px-3 cursor-pointer"
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-stone-500" />
          ) : (
            <Volume2 className="w-4 h-4 text-theme-primary" />
          )}
          <span className="text-[9px] font-medium">{isMuted ? "Unmute" : "Mute"}</span>
        </Button>
      </div>
    </div>
  );
}
