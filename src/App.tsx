import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { TREASURES, DEFAULT_PAWN_POSITIONS } from "./constants";
import type { TileData, AppGameState } from "./types";
import { Board } from "./components/board/Board";
import { SolverPanel } from "./components/panels/SolverPanel";
import { SetupPanel } from "./components/panels/SetupPanel";
import { BoardScanModal } from "./components/modals/BoardScanModal";
import { MoveHistoryDialog } from "./components/modals/MoveHistoryDialog";
import { StatsPanel } from "./components/panels/StatsPanel";
import { AppHeader } from "./components/AppHeader";
import { MobileActionsBar } from "./components/MobileActionsBar";
import { WelcomeGuide } from "./components/modals/WelcomeGuide";
import { InlineErrorBoundary } from "./components/ErrorBoundary";
import { Dialog, DialogContent } from "./components/ui/dialog";
import { useLabyrinthGame } from "./hooks/useLabyrinthGame";
import { useStopwatch } from "./hooks/useStopwatch";
import { useSlideStaging } from "./hooks/useSlideStaging";
import { usePawnAnimation } from "./hooks/usePawnAnimation";
import { useSolverWorker } from "./hooks/useSolverWorker";
import { playClickSound, setAudioMuted } from "./utils/audio";
import { quickSolveMinTurns, solveAllHand } from "./solver";
import {
  Sparkles,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
} from "lucide-react";
import { ResumeGameDialog } from "./components/modals/ResumeGameDialog";
import { AUTOSAVE_KEY } from "./hooks/useLabyrinthStorage";
import { usePreviewState } from "./hooks/usePreviewState";
import { cn } from "./lib/utils";

// Default solver depth. Can be overridden via the Advanced settings panel.
const DEFAULT_SOLVER_DEPTH = 3;

export default function App() {
  const sensors = useSensors(
    // Touch: press-and-hold to drag so the loose-tile tray can scroll freely
    // without a stray drag; mouse/pen keep the responsive distance activation.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } })
  );

  // ── UI-only state (stays in App) ─────────────────────────────────────────────
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia("(max-width: 767px)").matches;
    }
    return false;
  });

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  const [isMuted, setIsMuted] = useState(() => {
    const muted = localStorage.getItem("labyrinth_audio_muted") === "true";
    setAudioMuted(muted);
    return muted;
  });
  const [baseTheme, setBaseThemeState] = useState<"dark" | "light">(() => {
    const saved = localStorage.getItem("labyrinth_theme") ?? "";
    return saved === "light" ? "light" : "dark";
  });
  const [boardRotation, setBoardRotation] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [accentColor, setAccentColorState] = useState(
    () => localStorage.getItem("labyrinth_accent_color") ?? ""
  );
  const [showStats, setShowStats] = useState(false);
  const [, setActiveId] = useState<string | null>(null);
  const [turnPhase, setTurnPhase] = useState<"slide" | "move">("slide");
  const [showOneMoveTargets, setShowOneMoveTargets] = useState(true);
  const [solverDepth, setSolverDepthState] = useState<number>(() => {
    const saved = parseInt(localStorage.getItem("labyrinth_solver_depth") ?? "");
    return [1, 2, 3, 4, 5].includes(saved) ? saved : DEFAULT_SOLVER_DEPTH;
  });
  const [mobilePanelStop, setMobilePanelStopRaw] = useState<"peek" | "expanded">(
    () => (localStorage.getItem("labyrinth_mobile_panel") === "peek" ? "peek" : "expanded")
  );
  const setMobilePanelStop = useCallback((val: "peek" | "expanded" | ((prev: "peek" | "expanded") => "peek" | "expanded")) => {
    setMobilePanelStopRaw((prev) => {
      const next = typeof val === "function" ? val(prev) : val;
      try { localStorage.setItem("labyrinth_mobile_panel", next); } catch { /* storage full */ }
      return next;
    });
  }, []);
  const [hasShownSetupHint, setHasShownSetupHint] = useState(false);
  const [showWelcomeGuide, setShowWelcomeGuide] = useState(
    () => localStorage.getItem("labyrinth_welcome_dismissed") !== "true"
  );
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [pendingResumeState, setPendingResumeState] = useState<Partial<AppGameState> | null>(null);

  // Check for saved game state on boot
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<AppGameState>;
        if (parsed && (parsed.isGameStarted || (parsed.board && parsed.board.some((r) => r.some((c) => c !== null))))) {
          setPendingResumeState(parsed);
          setIsResumeDialogOpen(true);
        }
      }
    } catch {}
  }, []);

  const [is3D, setIs3D] = useState(() => {
    try {
      return localStorage.getItem("labyrinth_3d") === "true";
    } catch {
      return false;
    }
  });

  const toggle3D = useCallback(() => {
    setIs3D((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("labyrinth_3d", String(next));
      } catch {}
      return next;
    });
  }, []);

  const [hoveredHistoryIndex, setHoveredHistoryIndex] = useState<number | null>(null);
  const [boardOpacity, setBoardOpacity] = useState(1);
  const transitionTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleHoverHistory = useCallback((idx: number | null) => {
    setHoveredHistoryIndex((prev) => {
      if (prev === idx) return prev;
      
      setBoardOpacity(0.6);
      if (transitionTimeoutRef.current) clearTimeout(transitionTimeoutRef.current);
      
      transitionTimeoutRef.current = setTimeout(() => {
        setBoardOpacity(1);
      }, 150);
      
      return idx;
    });
  }, []);

  // ── Autoplay & animation settings ──────────────────────────────────────────────
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const [autoPlaySpeed, setAutoPlaySpeed] = useState<0.5 | 1 | 2 | 4>(1);
  const [pawnAnimationSpeed, setPawnAnimationSpeed] = useState<number>(600);

  // ── Toast FIFO Queue system ───────────────────────────────────────────────────
  const [toastQueue, setToastQueue] = useState<{ id: number; msg: string }[]>([]);
  const currentToast = toastQueue[0] || null;

  const showToast = useCallback(
    (msg: string) => {
      setToastQueue((prev) => [...prev, { id: Date.now() + Math.random(), msg }]);
      if (!isMuted) playClickSound();
    },
    [isMuted]
  );

  useEffect(() => {
    if (!currentToast) return;
    const t = setTimeout(() => {
      setToastQueue((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(t);
  }, [currentToast]);

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

  const setSolverDepth = useCallback((depth: number) => {
    setSolverDepthState(depth);
    try {
      localStorage.setItem("labyrinth_solver_depth", String(depth));
    } catch {
      /* storage full */
    }
  }, []);

  // ── Color Theme ──────────────────────────────────────────────────────────────
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
    setAudioMuted(next);
    try {
      localStorage.setItem("labyrinth_audio_muted", String(next));
    } catch {
      /* storage full */
    }
    showToast(next ? "Muted retro sound effects 🔇" : "Sound effects enabled 🔊");
  }, [isMuted, showToast]);

  // ── Game hook ─────────────────────────────────────────────────────────────────
  const game = useLabyrinthGame({
    isMuted,
    onToast: showToast,
  });

  // Dynamic document title update
  useEffect(() => {
    if (!game.isGameStarted) {
      document.title = "Labyrinth Game Solver";
      return;
    }
    const pawnName = game.activePawn.charAt(0).toUpperCase() + game.activePawn.slice(1);
    if (game.gameMode === "auto") {
      document.title = `Auto Mode (${pawnName}) — Labyrinth Solver`;
    } else if (game.gameMode === "coop") {
      document.title = `${pawnName}'s Turn (Co-op) — Labyrinth Solver`;
    } else {
      document.title = `${pawnName}'s Turn — Labyrinth Solver`;
    }
  }, [game.isGameStarted, game.activePawn, game.gameMode]);

  const canStartGame = game.looseTiles.length === 1 || game.looseTiles.length === 0;

  // ── Solver Worker hook ────────────────────────────────────────────────────────
  const {
    solutions,
    hoveredSolution,
    handleSetHoveredSolution,
    lockedScoreBreakdownSolution,
    setLockedScoreBreakdownSolution,
    isLoadingSolutions,
    clearSolutions,
  } = useSolverWorker({
    isGameStarted: game.isGameStarted,
    grid: game.grid,
    spareTile: game.spareTile,
    activePawn: game.activePawn,
    activePlayers: game.activePlayers,
    pawnPositions: game.pawnPositions,
    playerHands: game.playerHands,
    playerActiveTargets: game.playerActiveTargets,
    lastShiftArrowId: game.lastShiftArrowId,
    gameMode: game.gameMode,
    remainingCoopTreasures: game.remainingCoopTreasures,
    customTargetCoords: game.customTargetCoords,
    solverDepth,
    getSolverFormattedBoard: game.getSolverFormattedBoard,
    getSolverFormattedSpare: game.getSolverFormattedSpare,
    showToast,
    switchToNextPawn: game.switchToNextPawn,
  });

  // ── Slide Staging hook ────────────────────────────────────────────────────────
  const {
    stagedArrow,
    stagedRotation,
    handleArrowClick,
    rotateStaged,
    commitStagedSlide,
    cancelStagedSlide,
  } = useSlideStaging({
    spareTile: game.spareTile,
    activePawn: game.activePawn,
    isGameStarted: game.isGameStarted,
    onSlide: game.handleSlide,
    onRotateSpare: game.handleTileClick,
    setTurnPhase,
  });

  // ── Pawn Travel Animation hook ────────────────────────────────────────────────
  const {
    travelingPawn,
    pawnPositionOverride,
    handleExecuteSolutionWithAnimation,
  } = usePawnAnimation({
    activePawn: game.activePawn,
    pawnPositions: game.pawnPositions,
    pawnAnimationSpeed,
    onBeforeExecute: clearSolutions,
    onExecuteSolution: game.handleExecuteSolution,
  });

  const handleScanApply = useCallback(
    (scannedGrid: (TileData | null)[][], looseTiles: TileData[]) => {
      game.setGrid(scannedGrid);
      game.setLooseTiles(looseTiles);
      showToast("Board populated from photo scan!");
    },
    [game, showToast]
  );
  const { elapsedTime, isPaused: isTimerPaused, togglePause: toggleTimer } = useStopwatch(game.isGameStarted);

  // ── Setup guidance for mobile users ───────────────────────────────────────────
  useEffect(() => {
    if (game.isGameStarted) {
      setHasShownSetupHint(false);
      setMobilePanelStop("peek");
    }
  }, [game.isGameStarted, setMobilePanelStop]);

  useEffect(() => {
    if (!game.isGameStarted && game.looseTiles.length !== 1 && !hasShownSetupHint) {
      setMobilePanelStop("expanded");
      showToast("Tap Randomize Board or place tiles to finish setup.");
      setHasShownSetupHint(true);
    }
  }, [game.isGameStarted, game.looseTiles.length, hasShownSetupHint, showToast, setMobilePanelStop]);

  const handleManualCellClick = useCallback(
    (r: number, c: number) => {
      if (!game.isGameStarted) {
        game.handleCellClick(r, c);
        return;
      }
      if (turnPhase === "slide") {
        game.setCustomTargetCoords({ r, c });
        if (game.playerActiveTargets[game.activePawn]) {
          game.handleSelectTargetTreasure(game.activePawn, null);
          // Restore custom target since handleSelectTargetTreasure clears it
          game.setCustomTargetCoords({ r, c });
        }
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
      if (e.key === "?" && !ctrl) {
        e.preventDefault();
        setIsSettingsOpen(true);
        return;
      }
      if ((e.key === "r" || e.key === "R") && !ctrl) {
        e.preventDefault();
        setBoardRotation((prev) => (prev + 90) % 360);
        return;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMuted, game.handleUndo, game.handleRedo, showToast]);

  // ── Autoplay: when in auto mode, auto-execute the top solver suggestion ────────
  const AUTOPLAY_BASE_DELAY_MS = 1000;
  const isExecutingAutoMoveRef = useRef(false);

  useEffect(() => {
    if (!game.isGameStarted || game.gameMode !== "auto") {
      isExecutingAutoMoveRef.current = false;
      return;
    }
    if (autoPlayPaused) return;
    if (isLoadingSolutions) return;
    if (!solutions || solutions.length === 0) return;
    if (isExecutingAutoMoveRef.current) return;

    const delay = Math.max(200, Math.round(AUTOPLAY_BASE_DELAY_MS / autoPlaySpeed));
    const timeoutId = setTimeout(() => {
      const top = solutions[0];
      if (top && !isExecutingAutoMoveRef.current) {
        isExecutingAutoMoveRef.current = true;
        handleExecuteSolutionWithAnimation(top, () => {
          isExecutingAutoMoveRef.current = false;
        });
      }
    }, delay);

    return () => clearTimeout(timeoutId);
  }, [
    solutions,
    isLoadingSolutions,
    game.isGameStarted,
    game.gameMode,
    autoPlayPaused,
    autoPlaySpeed,
    game.grid,
    game.spareTile,
    game.activePawn,
    game.pawnPositions,
    handleExecuteSolutionWithAnimation,
  ]);

  // ── Drag and Drop ─────────────────────────────────────────────────────────────
  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id as string);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;

    const tileId = active.id as string;
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

  // ── Preview state (hovered suggestion, staged arrow, history) ───────────────
  const {
    effectivePreview,
    activeTargetCoords,
    reachableCells,
  } = usePreviewState({
    grid: game.grid,
    pawnPositions: game.pawnPositions,
    spareTile: game.spareTile,
    isGameStarted: game.isGameStarted,
    activePawn: game.activePawn,
    playerActiveTargets: game.playerActiveTargets,
    turnPhase,
    hoveredSolution,
    stagedArrow,
    stagedRotation,
    hoveredHistoryIndex,
    history: game.history,
    getSolverFormattedBoard: game.getSolverFormattedBoard,
    getSolverFormattedSpare: game.getSolverFormattedSpare,
  });

  const isActivePawnHome = useMemo(() => {
    const pawnPos = game.pawnPositions[game.activePawn];
    const home = DEFAULT_PAWN_POSITIONS[game.activePawn];
    if (!pawnPos || !home) return false;
    return pawnPos.r === home.r && pawnPos.c === home.c;
  }, [game.pawnPositions, game.activePawn]);

  const oneMoveTargets = useMemo<{ id: string; name: string }[]>(() => {
    if (!game.isGameStarted || !showOneMoveTargets) return [];
    const pawnPos = game.pawnPositions[game.activePawn];
    if (!pawnPos) return [];
    const allObtained = game.gameMode === "coop" ? (game.coopObtainedTreasures || []) : Object.values(game.obtainedTreasures).flat();
    try {
      const solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
      const solverSpare = game.getSolverFormattedSpare(game.spareTile);
      const targets = TREASURES.filter((t) => {
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

      if (game.showEmptyTiles) {
        const emptySols = solveAllHand(
          solverBoard.map((row) => row.map((c) => ({ ...c }))),
          { ...solverSpare },
          pawnPos,
          ["__ALL_EMPTY__"],
          game.lastShiftArrowId,
          1
        );

        const uniqueEmptyCoords = new Set<string>();
        for (const sol of emptySols) {
          if (sol[0] && sol[0].targetCoord) {
            if (sol[0].targetCoord.r === pawnPos.r && sol[0].targetCoord.c === pawnPos.c) continue;
            uniqueEmptyCoords.add(`${sol[0].targetCoord.r},${sol[0].targetCoord.c}`);
          }
        }

        for (const coord of uniqueEmptyCoords) {
          const [r, c] = coord.split(",");
          targets.push({
            id: `empty:${r},${c}`,
            name: `Cell (${r}, ${c})`
          });
        }
      }

      return targets;
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
    game.gameMode,
    game.coopObtainedTreasures,
    game.obtainedTreasures,
    game.spareTile,
    game.lastShiftArrowId,
    game.getSolverFormattedBoard,
    game.getSolverFormattedSpare,
    game.showEmptyTiles
  ]);

  // ── Unified Side / Sheet Panel Component ──────────────────────────────────────
  const sidePanelContent = game.isGameStarted ? (
    <SolverPanel
      solutions={solutions}
      isLoadingSolutions={isLoadingSolutions}
      setHoveredSolution={handleSetHoveredSolution}
      lockedScoreBreakdownSolution={lockedScoreBreakdownSolution}
      setLockedScoreBreakdownSolution={setLockedScoreBreakdownSolution}
      activePawn={game.activePawn}
      setActivePawn={game.setActivePawn}
      activePlayers={game.activePlayers}
      isMuted={isMuted}
      spareTile={effectivePreview ? effectivePreview.spareTile : game.spareTile}
      customTargetCoords={game.customTargetCoords}
      setCustomTargetCoords={game.setCustomTargetCoords}
      showEmptyTiles={game.showEmptyTiles}
      setShowEmptyTiles={game.setShowEmptyTiles}
      onExecuteSolution={handleExecuteSolutionWithAnimation}
      playerActiveTargets={game.playerActiveTargets}
      onSelectTargetTreasure={game.handleSelectTargetTreasure}
      stagedArrow={stagedArrow}
      stagedRotation={stagedRotation}
      onRotateStaged={rotateStaged}
      onCommitSlide={commitStagedSlide}
      onCancelSlide={cancelStagedSlide}
      turnPhase={turnPhase}
      showOneMoveTargets={showOneMoveTargets}
      onToggleOneMoveTargets={() => setShowOneMoveTargets((v) => !v)}
      oneMoveTargets={oneMoveTargets}
      isActivePawnHome={isActivePawnHome}
      compact={isMobile && mobilePanelStop === "peek"}
      onToggleStats={() => setShowStats((prev) => !prev)}
      gameMode={game.gameMode}
      remainingCoopTreasures={game.remainingCoopTreasures}
      grid={game.grid}
    />
  ) : (
    <SetupPanel
      looseTiles={game.looseTiles}
      activePlayers={game.activePlayers}
      setActivePlayers={game.setActivePlayers}
      activePawn={game.activePawn}
      setActivePawn={game.setActivePawn}
      isMuted={isMuted}
      playerHands={game.playerHands}
      onTileClick={game.handleTileClick}
      onRandomizeBoard={game.handleRandomizeBoard}
      onResetBoard={() => game.resetBoardToInitialPresets()}
      onAddCard={game.handleAddCard}
      onRemoveCard={game.handleRemoveCard}
      onAddAllCards={game.handleAddAllCards}
      onClearAllCards={game.handleClearAllCards}
      setupTab={game.setupTab}
      setSetupTab={game.setSetupTab}
      canStartGame={canStartGame}
      onStartGame={game.handleStartGame}
      showToast={showToast}
      onScanBoard={() => setIsScanModalOpen(true)}
      onOpenSettings={() => setIsSettingsOpen(true)}
      compact={isMobile && mobilePanelStop === "peek"}
      gameMode={game.gameMode}
      onSetGameMode={game.setGameMode}
      onResetAllDefaults={game.resetAllDefaults}
    />
  );

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-background text-foreground flex flex-col font-sans select-none relative overflow-hidden transition-colors duration-300">

      <AppHeader
        isGameStarted={game.isGameStarted}
        canUndo={game.canUndo}
        canRedo={game.canRedo}
        history={game.history}
        historyIndex={game.historyIndex}
        onJumpToHistory={game.handleJumpToHistory}
        onHoverHistory={handleHoverHistory}
        isMuted={isMuted}
        showStats={showStats}
        baseTheme={baseTheme}
        activePlayers={game.activePlayers}
        activePawn={game.activePawn}
        looseTiles={game.looseTiles}
        canStartGame={canStartGame}
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
        onOpenHistory={() => setIsHistoryOpen(true)}
        onRotateBoard={() => setBoardRotation((prev) => (prev + 90) % 360)}
        onStartGame={game.handleStartGame}
        onEndGame={game.handleEndGame}
        onToggleMute={handleToggleMute}
        onSetBaseTheme={setBaseTheme}
        showToast={showToast}
        onRandomizeBoard={game.handleRandomizeBoard}
        playerHands={game.playerHands}
        obtainedTreasures={game.obtainedTreasures}
        gameMode={game.gameMode}
        autoPlayPaused={autoPlayPaused}
        onToggleAutoPlayPause={() => setAutoPlayPaused((p) => !p)}
        autoPlaySpeed={autoPlaySpeed}
        onSetAutoPlaySpeed={(s) => setAutoPlaySpeed(s)}
        onStopAutoPlay={() => {
          game.setGameMode("standard");
          setAutoPlayPaused(false);
        }}
        coopObtainedTreasures={game.coopObtainedTreasures}
        onOpenWelcomeGuide={() => setShowWelcomeGuide(true)}
        elapsedTime={game.isGameStarted ? elapsedTime : undefined}
        isTimerPaused={isTimerPaused}
        onToggleTimer={toggleTimer}
        is3D={is3D}
        onToggle3D={toggle3D}
        solverDepth={solverDepth}
        onSetSolverDepth={(depth) => setSolverDepth(depth)}
        pawnAnimationSpeed={pawnAnimationSpeed}
        onSetPawnAnimationSpeed={(speed) => setPawnAnimationSpeed(speed)}
        pawnStats={game.pawnStats}
        totalShifts={game.totalShifts}
      />

      <main className="flex-1 flex flex-col md:flex-row relative z-10 w-full px-2 sm:px-3 md:px-4 lg:px-6 pt-2 sm:pt-3 pb-[72px] md:pb-3 gap-3 md:gap-4 lg:gap-8 justify-center overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 md:flex-[1.6] lg:flex-[1.8] w-full flex min-w-0 min-h-0 items-center justify-center relative z-20">
            <div
              className={cn(
                "relative aspect-square w-full h-auto flex-shrink-0 mx-auto",
                isMobile
                  ? mobilePanelStop === "peek"
                    ? "max-w-[min(100vw-1.5rem,calc(100svh-200px))]"
                    : "max-w-[min(100vw-1.5rem,calc(56svh-90px))]"
                  : "max-w-[min(100vw-2rem,calc(100svh-120px))]"
              )}
            >
              {(() => {
                const activeHoveredSolution = hoveredSolution || lockedScoreBreakdownSolution;
                const overlaySuggestedPath: { r: number; c: number; pawnColor?: string }[] | null = activeHoveredSolution 
                  ? activeHoveredSolution[0]?.pawnPath ? [...activeHoveredSolution[0].pawnPath] : []
                  : effectivePreview?.pawnPath ? [...effectivePreview.pawnPath] : null;
                if (overlaySuggestedPath && overlaySuggestedPath.length > 0) {
                  if (activeHoveredSolution) {
                    overlaySuggestedPath.forEach((pt) => { pt.pawnColor = activeHoveredSolution.pawnColor || game.activePawn; });
                  } else if (effectivePreview?.movedPawn) {
                    overlaySuggestedPath.forEach((pt) => { pt.pawnColor = effectivePreview.movedPawn; });
                  }
                }
                return (
                  <div
                    className="relative w-full h-full transition-opacity duration-150 ease-in-out"
                    style={{ opacity: boardOpacity }}
                  >
                  <InlineErrorBoundary label="Board">
                    <Board
                      grid={effectivePreview ? effectivePreview.grid : game.grid}
                      originalGrid={game.grid}
                      pawnPositions={
                        effectivePreview
                          ? effectivePreview.pawnPositions
                          : pawnPositionOverride
                          ? { ...game.pawnPositions, ...pawnPositionOverride }
                          : game.pawnPositions
                      }
                      onCellClick={handleManualCellClick}
                      onTileClick={game.handleTileClick}
                      isGameStarted={game.isGameStarted}
                      lastShiftArrowId={game.lastShiftArrowId}
                      onArrowClick={handleArrowClick}
                      hoveredPath={overlaySuggestedPath}
                      isStaticHoveredPath={!!effectivePreview && !activeHoveredSolution}
                      hoveredSolutionArrow={
                        activeHoveredSolution
                          ? activeHoveredSolution[0]?.arrowId || null
                          : stagedArrow || null
                      }
                      boardRotation={boardRotation}
                      scoreBreakdownSolution={lockedScoreBreakdownSolution}
                      customTargetCoords={game.customTargetCoords}
                      activeTargetCoords={activeTargetCoords}
                      reachableCells={reachableCells}
                      turnPhase={turnPhase}
                      stagedArrow={stagedArrow}
                      onTreasureClick={(treasureId, alreadyObtained) => {
                        if (turnPhase === "move") return;
                        game.handleSelectTargetTreasure(game.activePawn, treasureId);
                        if (alreadyObtained) {
                          showToast(
                            `⚠️ ${
                              TREASURES.find((t) => t.id === treasureId)?.name ?? treasureId
                            } already obtained — solving anyway`
                          );
                        }
                      }}
                      allObtainedTreasures={game.gameMode === "coop" || game.gameMode === "auto" ? game.coopObtainedTreasures : Object.values(game.obtainedTreasures).flat()}
                      activeTargetTreasureId={game.playerActiveTargets[game.activePawn]}
                      activePlayers={game.activePlayers}
                      is3D={is3D}
                      activePawn={game.activePawn}
                      travelingPawn={travelingPawn}
                    />
                  </InlineErrorBoundary>
                  </div>
                );
              })()}
          </div>
          </div>

          {/* Tablet & desktop side panel (md+) */}
          {!isMobile && (
            <div className="flex w-full md:w-[320px] lg:w-[400px] xl:w-[440px] flex-col flex-shrink-0 min-h-0 md:h-full gap-3 bg-card neo-brutalism-card rounded-3xl p-2 overflow-hidden">
              {sidePanelContent}
            </div>
          )}

          {/* Mobile split panel (phones only, < md) — persistent, non-modal, in-flow */}
          {isMobile && (
            <div
              className={cn(
                "flex flex-col shrink-0 w-full app-mobile-sheet rounded-t-2xl shadow-2xl transition-[height] duration-300 ease-out overflow-hidden bg-card border-t border-border",
                mobilePanelStop === "peek" ? "h-[104px]" : "h-[42svh]"
              )}
            >
              {/* Drag handle — tap to toggle between peek and expanded */}
              <button
                type="button"
                onClick={() =>
                  setMobilePanelStop((prev) => (prev === "peek" ? "expanded" : "peek"))
                }
                className="flex items-center justify-center gap-1.5 pt-2 pb-1.5 min-h-8 shrink-0 cursor-pointer"
                aria-label={mobilePanelStop === "peek" ? "Expand panel" : "Collapse panel"}
                aria-expanded={mobilePanelStop === "expanded"}
              >
                <div className="w-10 h-1 rounded-full bg-stone-600" />
                {mobilePanelStop === "peek" ? (
                  <ChevronUp className="w-3 h-3 text-stone-600" />
                ) : (
                  <ChevronDownIcon className="w-3 h-3 text-stone-600" />
                )}
              </button>
              <div
                className={cn(
                  "flex-1 min-h-0",
                  mobilePanelStop === "expanded" ? "overflow-y-auto overscroll-contain" : "overflow-hidden"
                )}
              >
                {sidePanelContent}
              </div>
            </div>
          )}
        </DndContext>
      </main>

      <BoardScanModal
        open={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApply={handleScanApply}
      />

      <MoveHistoryDialog
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={game.history}
        historyIndex={game.historyIndex}
        activePlayers={game.activePlayers}
        onJumpTo={game.handleJumpToHistory}
      />

      <WelcomeGuide
        open={showWelcomeGuide}
        onOpenChange={setShowWelcomeGuide}
        onDismiss={() => setShowWelcomeGuide(false)}
      />

      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-md app-dialog-panel neo-brutalism-card border-3 border-stone-950 p-6 rounded-2xl shadow-2xl">
          <StatsPanel
            activePlayers={game.activePlayers}
            pawnStats={game.pawnStats}
            totalShifts={game.totalShifts}
            obtainedTreasures={game.obtainedTreasures}
            gameMode={game.gameMode}
            coopObtainedTreasures={game.coopObtainedTreasures}
          />
        </DialogContent>
      </Dialog>

      {/* Toast */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {currentToast?.msg}
      </div>
      {currentToast && (
        <div
          key={currentToast.id}
          className="fixed bottom-[72px] md:bottom-6 left-1/2 -translate-x-1/2 px-4 sm:px-6 py-2.5 sm:py-3 app-dialog-panel neo-brutalism-card text-stone-100 font-semibold text-xs sm:text-sm rounded-lg z-50 animate-toast-in flex items-center gap-2 whitespace-nowrap"
          aria-hidden="true"
        >
          <Sparkles className="w-4 h-4 text-theme-primary shrink-0" />
          {currentToast.msg}
        </div>
      )}

      {/* Mobile Actions Bar (phones only, < md) */}
      <MobileActionsBar
        canUndo={game.canUndo}
        canRedo={game.canRedo}
        onUndo={game.handleUndo}
        onRedo={game.handleRedo}
        isGameStarted={game.isGameStarted}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onRotateBoard={() => setBoardRotation((prev) => (prev + 90) % 360)}
        mobilePanelStop={mobilePanelStop}
        onToggleMobilePanel={() => setMobilePanelStop((prev) => (prev === "peek" ? "expanded" : "peek"))}
        solutionsCount={solutions.length}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
      />

      <ResumeGameDialog
        isOpen={isResumeDialogOpen}
        lastSavedAt={pendingResumeState?.lastSavedAt}
        onResume={() => {
          setIsResumeDialogOpen(false);
          if (pendingResumeState) {
            game.hydrateFromSaved(pendingResumeState, game.spareTile);
            setPendingResumeState(null);
          }
        }}
        onNewGame={() => {
          setIsResumeDialogOpen(false);
          game.resetAllDefaults();
          showToast("Started new game session.");
        }}
      />
    </div>
  );
}
