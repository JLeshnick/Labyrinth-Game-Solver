import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
  closestCenter,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";
import { SHIFT_ARROWS, TREASURES, DEFAULT_PAWN_POSITIONS, ROTATIONS } from "./constants";
import type { TileData, SolverSolution } from "./types";
import { Board } from "./components/board/Board";
import { Tile } from "./components/board/Tile";
import { Button } from "./components/ui/button";
import { SolverPanel } from "./components/panels/SolverPanel";
import { SetupPanel } from "./components/panels/SetupPanel";
import { BoardScanModal } from "./components/modals/BoardScanModal";
import { MoveHistoryDialog } from "./components/modals/MoveHistoryDialog";
import { StatsPanel } from "./components/panels/StatsPanel";
import { AppHeader } from "./components/AppHeader";
import { WelcomeGuide } from "./components/modals/WelcomeGuide";
import { InlineErrorBoundary } from "./components/ErrorBoundary";
import { Dialog, DialogContent } from "./components/ui/dialog";
import { useLabyrinthGame } from "./hooks/useLabyrinthGame";
import { useStopwatch } from "./hooks/useStopwatch";
import { playClickSound, setAudioMuted } from "./utils/audio";
import { fromSolverGrid } from "./lib/solverAdapter";
import { executeSlideInGrid, getReachableCells, quickSolveMinTurns, solveAllHand } from "./solver";
import type { Rotation, PawnPositions } from "./types";
import {
  Sparkles,
  Undo2,
  Redo2,
  RotateCw,
  Volume2,
  VolumeX,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Clock,
} from "lucide-react";
import { ResumeGameDialog } from "./components/modals/ResumeGameDialog";
import { AUTOSAVE_KEY } from "./hooks/useLabyrinthStorage";
import { cn } from "./lib/utils";

// Default solver depth. Can be overridden via the Advanced settings panel.
const DEFAULT_SOLVER_DEPTH = 3;

function computePreviewPawnPositions(
  arrow: { type: "row" | "col" | string; index: number; dir: string },
  pawnPositions: PawnPositions
): PawnPositions {
  const previewPawnPositions = { ...pawnPositions };
  Object.entries(pawnPositions).forEach(([color, pos]) => {
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
  return previewPawnPositions;
}

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
  const [activeId, setActiveId] = useState<string | null>(null);
  const [turnPhase, setTurnPhase] = useState<"slide" | "move">("slide");
  const [stagedArrow, setStagedArrow] = useState<string | null>(null);
  const [stagedRotation, setStagedRotation] = useState<0 | 90 | 180 | 270>(0);
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
  const [pendingResumeState, setPendingResumeState] = useState<any>(null);

  // Check for saved game state on boot
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTOSAVE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && (parsed.isGameStarted || (parsed.board && parsed.board.some((r: any) => r.some((c: any) => c !== null))))) {
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

  // ── Solver worker ─────────────────────────────────────────────────────────────
  const [solutions, setSolutions] = useState<SolverSolution[]>([]);
  const [hoveredSolutionIndex, setHoveredSolutionIndex] = useState<number | null>(null);
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
  const [lockedScoreBreakdownSolution, setLockedScoreBreakdownSolution] = useState<SolverSolution | null>(null);
  const hoveredSolution = (hoveredSolutionIndex !== null && solutions && hoveredSolutionIndex < solutions.length) ? solutions[hoveredSolutionIndex] : null;

  const handleSetHoveredSolution = useCallback((sol: SolverSolution | null) => {
    if (sol === null) {
      setHoveredSolutionIndex(0);
    } else {
      const idx = solutions.indexOf(sol);
      if (idx !== -1) {
        setHoveredSolutionIndex(idx);
      }
    }
  }, [solutions]);

  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);
  const workerRef = useRef<Worker | null>(null);

  // ── Pawn travel animation state ───────────────────────────────────────────────
  const [travelingPawn, setTravelingPawn] = useState<{
    color: string;
    path: { r: number; c: number }[];
    durationMs: number;
    key: number;
  } | null>(null);
  // While animating, hold pawn at from-position so it doesn't snap before the dot lands
  const [pawnPositionOverride, setPawnPositionOverride] = useState<Record<string, {r: number; c: number}> | null>(null);
  const travelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
  }, [currentToast?.id]);

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

  // ── Pawn travel animation wrapper (needs game to be declared first) ────────────
  const handleExecuteSolutionWithAnimation = useCallback((path: any, onComplete?: () => void) => {
    if (!path || path.length === 0) {
      onComplete?.();
      return;
    }
    const turn1 = path[0];
    const pawnColor = path.pawnColor ?? game.activePawn;
    const fromPos = game.pawnPositions[pawnColor];
    const fullPath: { r: number; c: number }[] = turn1?.pawnPath || (fromPos ? [fromPos, turn1.endPos] : []);

    if (fullPath.length > 1 && fromPos) {
      if (travelTimerRef.current) clearTimeout(travelTimerRef.current);
      // Lock the pawn display at FROM so it doesn't instantly jump
      setPawnPositionOverride(prev => ({ ...game.pawnPositions, ...prev, [pawnColor]: fromPos }));

      // Duration scales based on path length and user speed setting (300ms, 600ms, 1000ms base)
      const numSteps = fullPath.length - 1;
      const animDuration = Math.max(250, Math.round(pawnAnimationSpeed * Math.min(2, Math.max(0.7, numSteps * 0.4))));

      setTravelingPawn({
        color: pawnColor,
        path: fullPath,
        durationMs: animDuration,
        key: Date.now(),
      });

      // Execute the real move after the animation dot has completed the path
      travelTimerRef.current = setTimeout(() => {
        setSolutions([]);
        setHoveredSolutionIndex(null);
        setLockedScoreBreakdownSolution(null);
        game.handleExecuteSolution(path);
        setTravelingPawn(null);
        setPawnPositionOverride(null);
        onComplete?.();
      }, animDuration + 40);
    } else {
      // No animation path possible — execute immediately
      setSolutions([]);
      setHoveredSolutionIndex(null);
      setLockedScoreBreakdownSolution(null);
      game.handleExecuteSolution(path);
      onComplete?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game.activePawn, game.pawnPositions, game.handleExecuteSolution, pawnAnimationSpeed]);

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
  }, [game.isGameStarted]);

  useEffect(() => {
    if (!game.isGameStarted && game.looseTiles.length !== 1 && !hasShownSetupHint) {
      setMobilePanelStop("expanded");
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
            (ROTATIONS as unknown as (0 | 90 | 180 | 270)[])[
              (ROTATIONS.indexOf(prev as 0 | 90 | 180 | 270) + 1) % 4
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
        (ROTATIONS.indexOf(stagedRotation as 0 | 90 | 180 | 270) -
          ROTATIONS.indexOf(game.spareTile.rotation as 0 | 90 | 180 | 270) +
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
        if (success) {
          setSolutions(computed || []);
          setHoveredSolutionIndex(0);
        } else {
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

    return () => workerRef.current?.terminate();
  }, []);

  // ── Solver re-run on board/pawn/hand changes ──────────────────────────────────
  useEffect(() => {
    if (!game.isGameStarted || game.grid.length === 0 || !workerRef.current) return;
    const isCoop = game.gameMode === "coop" || game.gameMode === "auto";
    // In Phase 2 (all treasures collected in Co-op / Auto mode):
    // If the currently active pawn is already at its home corner, but other pawns are not yet home,
    // automatically pass the turn to the next player who needs to get home.
    if (isCoop && game.remainingCoopTreasures.length === 0) {
      const activeHome = DEFAULT_PAWN_POSITIONS[game.activePawn];
      const activePos = game.pawnPositions[game.activePawn];
      const isAlreadyHome = activeHome && activePos && activePos.r === activeHome.r && activePos.c === activeHome.c;
      const anyPawnNotHome = game.activePlayers.some((p) => {
        const h = DEFAULT_PAWN_POSITIONS[p];
        const pos = game.pawnPositions[p];
        return pos && h && (pos.r !== h.r || pos.c !== h.c);
      });

      if (isAlreadyHome && anyPawnNotHome) {
        game.switchToNextPawn();
        return;
      }
    }

    const currentPawnCoord = game.pawnPositions[game.activePawn];
    const handCards = game.customTargetCoords
      ? [`${game.customTargetCoords.type || "coord"}:${game.customTargetCoords.r},${game.customTargetCoords.c}`]
      : game.playerHands[game.activePawn] || [];

    if (!isCoop && (!currentPawnCoord || handCards.length === 0)) {
      setSolutions([]);
      return;
    }
    if (isCoop && !currentPawnCoord) {
      setSolutions([]);
      return;
    }

    setIsLoadingSolutions(true);
    setSolutions([]);
    setHoveredSolutionIndex(null);
    let solverBoard = game.getSolverFormattedBoard(game.grid, game.pawnPositions);
    const solverSpare = game.getSolverFormattedSpare(game.spareTile);

    let isCoopSolve = isCoop;
    let coopTarget = null;
    if (isCoop && game.customTargetCoords) {
      isCoopSolve = false; // Solve as a standard single target using solveLabyrinth
      const activeHome = DEFAULT_PAWN_POSITIONS[game.activePawn];
      const isHomeSelected = activeHome && game.customTargetCoords.r === activeHome.r && game.customTargetCoords.c === activeHome.c;
      coopTarget = isHomeSelected ? `home_${game.activePawn}` : `${game.customTargetCoords.type || "coord"}:${game.customTargetCoords.r},${game.customTargetCoords.c}`;
    }

    // In coop mode, if a specific target card is selected, solve only for that card. In auto mode or unselected coop, solve globally for all remaining treasures.
    const selectedTarget = game.gameMode === "auto" ? null : game.playerActiveTargets[game.activePawn];
    const coopTreasures = isCoop && selectedTarget ? [selectedTarget] : game.remainingCoopTreasures;

    // Strict round-robin turn order: always solve for the active pawn whose turn it is
    const coopActivePawns = [game.activePawn];

    workerRef.current.postMessage({
      board: solverBoard,
      spareTile: solverSpare,
      pawnPos: currentPawnCoord,
      pawnPositions: game.pawnPositions,
      handCards: coopTarget ? [coopTarget] : handCards,
      lastShiftArrowId: game.lastShiftArrowId,
      maxTurns: solverDepth,
      isCoop: isCoopSolve,
      activePawns: coopActivePawns,
      remainingTreasures: coopTreasures,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    game.grid,
    game.spareTile,
    game.activePawn,
    game.playerHands,
    game.playerActiveTargets,
    game.lastShiftArrowId,
    game.isGameStarted,
    game.pawnPositions,
    game.getSolverFormattedBoard,
    game.getSolverFormattedSpare,
    game.customTargetCoords,
    solverDepth,
    game.gameMode,
    game.activePlayers,
    game.remainingCoopTreasures,
    game.showEmptyTiles,
    game.switchToNextPawn,
  ]);

  // ── Autoplay: when in auto mode, auto-execute the top solver suggestion ────────
  const AUTOPLAY_BASE_DELAY_MS = 1000; // base pause between moves at 1× speed
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
        handleExecuteSolutionWithAnimation(top as any, () => {
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
      const rotDegrees = (ROTATIONS as unknown as Rotation[])[turn1.rotation];
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
      const previewPawnPositions = computePreviewPawnPositions(arrow, game.pawnPositions);
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
      const previewPawnPositions = computePreviewPawnPositions(arrow, game.pawnPositions);
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

  const effectivePreview = hoveredHistoryIndex !== null && game.history && game.history[hoveredHistoryIndex]
    ? {
        grid: game.history[hoveredHistoryIndex].board,
        pawnPositions: game.history[hoveredHistoryIndex].pawnPositions || game.pawnPositions,
        spareTile: game.history[hoveredHistoryIndex].spareTile || game.spareTile,
        pawnPath: game.history[hoveredHistoryIndex].pawnPath,
        movedPawn: game.history[hoveredHistoryIndex].movedPawn,
      }
    : previewState || stagedPreviewState;

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

        const uniqueEmptyCoords = new Set();
        for (const sol of emptySols) {
          if (sol[0] && sol[0].targetCoord) {
            // Check if the target tile's original location matches the pawn's current location
            if (sol[0].targetCoord.r === pawnPos.r && sol[0].targetCoord.c === pawnPos.c) continue;
            uniqueEmptyCoords.add(`${sol[0].targetCoord.r},${sol[0].targetCoord.c}`);
          }
        }

        for (const coord of uniqueEmptyCoords) {
          const [r, c] = (coord as string).split(",");
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
                const overlaySuggestedPath = activeHoveredSolution 
                  ? activeHoveredSolution[0]?.pawnPath || []
                  : (effectivePreview as any)?.pawnPath || null;
                if (overlaySuggestedPath && overlaySuggestedPath.length > 0) {
                  if (activeHoveredSolution) {
                    (overlaySuggestedPath as any).pawnColor = (activeHoveredSolution as any).pawnColor || game.activePawn;
                  } else if ((effectivePreview as any)?.movedPawn) {
                    (overlaySuggestedPath as any).pawnColor = (effectivePreview as any).movedPawn;
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
                          ? (activeHoveredSolution as { arrowId: string }[])[0].arrowId
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
              {game.isGameStarted ? (
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
                  onRotateStaged={() =>
                    setStagedRotation(
                      (prev) =>
                        (ROTATIONS as unknown as (0 | 90 | 180 | 270)[])[
                          (ROTATIONS.indexOf(prev as 0 | 90 | 180 | 270) + 1) % 4
                        ]
                    )
                  }
                  onCommitSlide={commitStagedSlide}
                  onCancelSlide={cancelStagedSlide}
                  turnPhase={turnPhase}
                  showOneMoveTargets={showOneMoveTargets}
                  onToggleOneMoveTargets={() => setShowOneMoveTargets((v) => !v)}
                  oneMoveTargets={oneMoveTargets}
                  isActivePawnHome={isActivePawnHome}
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
                  gameMode={game.gameMode}
                  onSetGameMode={game.setGameMode}
                  onResetAllDefaults={game.resetAllDefaults}
                />
              )}
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
                {game.isGameStarted ? (
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
                    onRotateStaged={() =>
                      setStagedRotation(
                        (prev) =>
                          (ROTATIONS as unknown as (0 | 90 | 180 | 270)[])[
                            (ROTATIONS.indexOf(prev as 0 | 90 | 180 | 270) + 1) % 4
                          ]
                      )
                    }
                    onCommitSlide={commitStagedSlide}
                    onCancelSlide={cancelStagedSlide}
                    turnPhase={turnPhase}
                    showOneMoveTargets={showOneMoveTargets}
                    onToggleOneMoveTargets={() => setShowOneMoveTargets((v) => !v)}
                    oneMoveTargets={oneMoveTargets}
                    isActivePawnHome={isActivePawnHome}
                    compact={mobilePanelStop === "peek"}
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
                    compact={mobilePanelStop === "peek"}
                    gameMode={game.gameMode}
                    onSetGameMode={game.setGameMode}
                    onResetAllDefaults={game.resetAllDefaults}
                  />
                )}
              </div>
            </div>
          )}

          {createPortal(
            <DragOverlay dropAnimation={null}>
              {activeId ? (
                <Tile
                  tile={
                    game.looseTiles.find((t) => t.id === activeId) ||
                    game.grid.flat().find((t) => t?.id === activeId)!
                  }
                  className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 shadow-[6px_6px_0_0_#000000] rotate-3"
                />
              ) : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </main>

      {/* Move history dialog */}
      <MoveHistoryDialog
        open={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={game.history}
        historyIndex={game.historyIndex}
        activePlayers={game.activePlayers}
        onJumpTo={game.handleJumpToHistory}
      />

      {/* Board scan modal */}
      <BoardScanModal
        open={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        onApply={handleScanApply}
      />

      {/* Welcome guide */}
      <WelcomeGuide
        open={showWelcomeGuide}
        onOpenChange={setShowWelcomeGuide}
        onDismiss={() => {
          try {
            localStorage.setItem("labyrinth_welcome_dismissed", "true");
          } catch {
            /* storage full */
          }
        }}
      />

      {/* Stats dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent
          className="sm:max-w-[500px] text-stone-100 p-0 rounded-xl overflow-hidden"
          onKeyDown={(e) => {
            if (e.key === " ") e.stopPropagation();
          }}
        >
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

        {game.isGameStarted && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!isMuted) playClickSound();
              setIsHistoryOpen(true);
            }}
            className="flex flex-col items-center gap-0.5 text-stone-400 hover:text-stone-200 h-auto py-1 px-3 cursor-pointer"
          >
            <Clock className="w-4 h-4" />
            <span className="text-[9px] font-medium">History</span>
          </Button>
        )}

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

        {/* Panel toggle button — expands/collapses the persistent split panel */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setMobilePanelStop((prev) => (prev === "peek" ? "expanded" : "peek"))
          }
          className={cn(
            "flex flex-col items-center gap-0.5 h-auto py-1 px-3 cursor-pointer relative",
            mobilePanelStop === "expanded" ? "text-theme-primary" : "text-stone-400 hover:text-stone-200"
          )}
        >
          {mobilePanelStop === "expanded" ? (
            <ChevronDownIcon className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
          <span className="text-[9px] font-medium">
            {game.isGameStarted ? "Solver" : "Setup"}
          </span>
          {/* Badge for solver solutions */}
          {game.isGameStarted && solutions.length > 0 && mobilePanelStop === "peek" && (
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
