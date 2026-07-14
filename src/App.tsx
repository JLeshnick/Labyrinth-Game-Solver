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
} from "@dnd-kit/core";
import { FIXED_TILES_PRESETS, SHIFT_ARROWS, generateMovablePool, DEFAULT_PAWN_POSITIONS, EMPTY_PLAYER_HANDS, EMPTY_PLAYER_TARGETS, EMPTY_OBTAINED_TREASURES } from "./constants";
import type { TileData, Rotation, Shape, PlayerMap, PawnPositions } from "./types";
import { toSolverBoard, toSolverSpare, fromSolverGrid, fromSolverSpare } from "./lib/solverAdapter";
import { Board } from "./components/Board";
import { Tile } from "./components/Tile";
import { Button } from "./components/ui/button";
import { LandingPage } from "./components/LandingPage";
import { SolverPanel } from "./components/SolverPanel";
import { SetupPanel } from "./components/SetupPanel";
import { TrophyPanel } from "./components/TrophyPanel";
import { StatsPanel } from "./components/StatsPanel";
import { useLabyrinthHistory } from "./hooks/useLabyrinthHistory";
import { useLabyrinthStorage, AUTOSAVE_KEY } from "./hooks/useLabyrinthStorage";
import {
  playClickSound,
  playSlideSound,
  playRotateSound,
  playSuccessSound,
  playPawnMoveSound,
} from "./utils/audio";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./components/ui/dialog";
import { AppHeader } from "./components/AppHeader";
import { Sparkles, Plus } from "lucide-react";
import { executeSlideInGrid, isOppositeArrow, getReachableCells } from "./solver";

export default function App() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const tileCounter = useRef(0);
  const nextTileId = () => `movable_${++tileCounter.current}`;

  // Grid: 7x7
  const [grid, setGrid] = useState<(TileData | null)[][]>(() =>
    Array(7).fill(null).map(() => Array(7).fill(null))
  );

  // Board rotation perspective (0 | 90 | 180 | 270)
  const [boardRotation, setBoardRotation] = useState<number>(0);

  // Side Panel / Loose Movable Pool
  const [looseTiles, setLooseTiles] = useState<TileData[]>([]);
  const [spareTile, setSpareTile] = useState<TileData>({
    id: "spare_initial",
    shape: "straight",
    rotation: 0,
    isFixed: false,
  });

  // Gameplay Mode States
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameStartState, setGameStartState] = useState<any>(null);
  const [activePawn, setActivePawn] = useState<string>("red");
  const [lastShiftArrowId, setLastShiftArrowId] = useState<string | null>(null);
  const [maxTurns, setMaxTurns] = useState<number>(2);

  // Player Hands (deal cards) & Active Target Goals
  const [playerHands, setPlayerHands] = useState<PlayerMap<string[]>>(EMPTY_PLAYER_HANDS);
  const [playerActiveTargets, setPlayerActiveTargets] = useState<PlayerMap<string | null>>(EMPTY_PLAYER_TARGETS);
  const [obtainedTreasures, setObtainedTreasures] = useState<PlayerMap<string[]>>(EMPTY_OBTAINED_TREASURES);

  // Pawn Positions
  const [pawnPositions, setPawnPositions] = useState<PawnPositions>(DEFAULT_PAWN_POSITIONS);

  // Move Tracking / Stats
  const [pawnStats, setPawnStats] = useState<Record<string, { tilesMoved: number; shiftsUsed: number; treasuresFound: number; totalTargets: number }>>({});
  const [showStats, setShowStats] = useState(false);
  const totalShiftsRef = useRef(0);

  // Active Drag
  const [activeId, setActiveId] = useState<string | null>(null);

  // Audio configuration
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem("labyrinth_audio_muted") === "true");

  // Interaction Setup Tabs: 'tiles' | 'pawns' | 'cards'
  const [setupTab, setSetupTab] = useState<"tiles" | "pawns" | "cards">("tiles");
  const [activePawnPlacementColor, setActivePawnPlacementColor] = useState<string>("red");

  // Solver Suggestions & Visual Overlays
  const [solutions, setSolutions] = useState<any[]>([]);
  const [hoveredSolution, setHoveredSolution] = useState<any | null>(null);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);

  // Solver Worker
  const workerRef = useRef<Worker | null>(null);

  // Custom persistent slots hooks
  const { pushStateToHistory, resetHistory, undo, redo, canUndo, canRedo } = useLabyrinthHistory(null);
  const { slots, saveAutosave, loadAutosave, saveSlot, loadSlot, deleteSlot, refreshSlots } = useLabyrinthStorage();

  const [showLandingPage, setShowLandingPage] = useState(true);

  const allSlots = useMemo(() => {
    const list = [...slots];
    const hasAutosave = localStorage.getItem(AUTOSAVE_KEY);
    if (hasAutosave && !list.some(s => s.key === AUTOSAVE_KEY)) {
      list.unshift({
        name: "Auto-Save (Default Slot)",
        key: AUTOSAVE_KEY,
        timestamp: Date.now(),
      });
    }
    return list;
  }, [slots]);

  // Settings & Theme states
  const [activeTheme, setActiveTheme] = useState(() => localStorage.getItem("labyrinth_theme") || "amber");
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [peekSlotKey, setPeekSlotKey] = useState<string | null>(null);
  const [settingsTab, setSettingsTab] = useState<"profiles" | "preferences" | "themes" | "storage">("profiles");
  const [desktopSettings, setDesktopSettings] = useState<{ gamesDir: string } | null>(null);
  const [isNewGameDialogOpen, setIsNewGameDialogOpen] = useState(false);
  const [newGameName, setNewGameName] = useState("");

  const fetchDesktopSettings = useCallback(async () => {
    if ((window as any).electronAPI?.getSettings) {
      const settings = await (window as any).electronAPI.getSettings();
      setDesktopSettings(settings);
    }
  }, []);

  const handleSetDesktopSettings = useCallback(async (settings: { gamesDir: string }) => {
    if ((window as any).electronAPI?.setSettings) {
      const updated = await (window as any).electronAPI.setSettings(settings);
      setDesktopSettings(updated);
      if (refreshSlots) {
        await refreshSlots();
      }
    }
  }, [refreshSlots]);

  useEffect(() => {
    fetchDesktopSettings();
  }, [fetchDesktopSettings]);
  const [customTargetCoords, setCustomTargetCoords] = useState<{ r: number; c: number } | null>(null);
  const [activePlayers, setActivePlayers] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("labyrinth_active_players");
      return saved ? JSON.parse(saved) : ["red", "blue", "green", "yellow"];
    } catch {
      return ["red", "blue", "green", "yellow"];
    }
  });

  useEffect(() => {
    try { localStorage.setItem("labyrinth_active_players", JSON.stringify(activePlayers)); } catch { /* storage full/blocked */ }
    if (!activePlayers.includes(activePawn)) {
      setActivePawn(activePlayers[0] || "red");
    }
  }, [activePlayers, activePawn]);

  // Active Game & Ribbon saving
  const [currentSlotName, setCurrentSlotName] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    try { localStorage.setItem("labyrinth_theme", activeTheme); } catch { /* storage full/blocked */ }
  }, [activeTheme]);

  const [peekedState, setPeekedState] = useState<any | null>(null);
 
  useEffect(() => {
    let active = true;
    if (!peekSlotKey) {
      setPeekedState(null);
      return;
    }
    loadSlot(peekSlotKey).then((state) => {
      if (active) {
        setPeekedState(state);
      }
    });
    return () => {
      active = false;
    };
  }, [peekSlotKey, loadSlot]);

  // Toast System
  const [toastText, setToastText] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    if (!isMuted) playClickSound();
  }, [isMuted]);

  useEffect(() => {
    if (toastText) {
      const t = setTimeout(() => setToastText(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastText]);


  // Quick save callback in header ribbon
  const handleSaveActiveGame = useCallback(async () => {
    if (!isMuted) playClickSound();
    if (currentSlotName) {
      const currentAppState = {
        board: grid,
        spareTile,
        looseTiles,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        lastShiftArrowId,
        isGameStarted,
        gameStartState,
        pawnPositions,
      };
      const isElectron = !!(window as any).electronAPI;
      if (isElectron) {
        const success = await saveSlot(currentSlotName, currentAppState);
        if (success) {
          setLastSavedTime(Date.now());
          showToast(`Saved "${currentSlotName}" successfully!`);
        } else {
          showToast("Save failed — storage may be full.");
        }
      } else {
        // Find the slot by name to save to its existing key
        const existingSlot = slots.find((s) => s.name === currentSlotName);
        if (existingSlot) {
          try {
            localStorage.setItem(existingSlot.key, JSON.stringify(currentAppState));
            setLastSavedTime(Date.now());
            showToast(`Saved "${currentSlotName}" successfully!`);
          } catch {
            showToast("Save failed — storage may be full.");
          }
        } else {
          // Fallback: save as a new slot if not found
          const success = await saveSlot(currentSlotName, currentAppState);
          if (success) {
            setLastSavedTime(Date.now());
            showToast(`Saved "${currentSlotName}" successfully!`);
          } else {
            showToast("Save failed — storage may be full.");
          }
        }
      }
    } else {
      setSettingsTab("profiles");
      setIsSettingsOpen(true);
    }
  }, [currentSlotName, grid, spareTile, looseTiles, activePawn, playerHands, playerActiveTargets, obtainedTreasures, lastShiftArrowId, isGameStarted, gameStartState, pawnPositions, slots, showToast, isMuted, saveSlot]);

  // Board/spare → solver format (thin wrappers so callbacks can reference them)
  const getSolverFormattedBoard = useCallback(
    (currentGrid: (TileData | null)[][], positions: Record<string, { r: number; c: number }>) =>
      toSolverBoard(currentGrid, positions),
    []
  );

  const getSolverFormattedSpare = useCallback(
    (tile: TileData) => toSolverSpare(tile),
    []
  );

  // Hydrate layout presets
  const resetBoardToInitialPresets = useCallback(() => {
    const initialGrid = Array(7)
      .fill(null)
      .map(() => Array(7).fill(null));

    // Place locked presets
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

    setGrid(initialGrid);
    setPawnPositions(DEFAULT_PAWN_POSITIONS);

    const pool = generateMovablePool();
    setLooseTiles(pool);
    setIsGameStarted(false);
    setLastShiftArrowId(null);
    setPlayerHands(EMPTY_PLAYER_HANDS);
    setPlayerActiveTargets(EMPTY_PLAYER_TARGETS);
    setObtainedTreasures(EMPTY_OBTAINED_TREASURES);

    const startState = {
      board: initialGrid,
      spareTile: { id: "spare_initial", shape: "straight" as Shape, rotation: 0 as Rotation, isFixed: false },
      activePawn: "red",
      playerHands: EMPTY_PLAYER_HANDS,
      playerActiveTargets: EMPTY_PLAYER_TARGETS,
      obtainedTreasures: EMPTY_OBTAINED_TREASURES,
      lastShiftArrowId: null,
      pawnPositions: DEFAULT_PAWN_POSITIONS,
    };

    resetHistory(startState);
  }, [resetHistory]);

  const handleNewGame = useCallback(async (name?: string) => {
    if (!isMuted) playClickSound();
    
    let finalName = typeof name === "string" ? name.trim() : "";
    if (!finalName) {
      finalName = `Game — ${new Date().toLocaleString()}`;
    }
 
    const initialGrid = Array(7)
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
 
    setGrid(initialGrid);
    setLooseTiles(pool);
    setPawnPositions(DEFAULT_PAWN_POSITIONS);
    setIsGameStarted(false);
    setLastShiftArrowId(null);
    setPlayerHands(EMPTY_PLAYER_HANDS);
    setPlayerActiveTargets(EMPTY_PLAYER_TARGETS);
 
    const startState = {
      board: initialGrid,
      spareTile: { id: "spare_initial", shape: "straight" as Shape, rotation: 0 as Rotation, isFixed: false },
      activePawn: "red",
      playerHands: EMPTY_PLAYER_HANDS,
      playerActiveTargets: EMPTY_PLAYER_TARGETS,
      obtainedTreasures: EMPTY_OBTAINED_TREASURES,
      lastShiftArrowId: null,
      pawnPositions: DEFAULT_PAWN_POSITIONS,
    };

    resetHistory(startState);
    setCurrentSlotName(finalName);
    setLastSavedTime(Date.now());
 
    // Save the new slot immediately
    const success = await saveSlot(finalName, {
      board: initialGrid,
      spareTile: startState.spareTile,
      looseTiles: pool,
      activePawn: "red",
      playerHands: EMPTY_PLAYER_HANDS,
      playerActiveTargets: EMPTY_PLAYER_TARGETS,
      lastShiftArrowId: null,
      isGameStarted: false,
      gameStartState: null,
      pawnPositions: DEFAULT_PAWN_POSITIONS,
    });
 
    if (success) {
      showToast(`Created and saved "${finalName}"`);
    } else {
      showToast(`Created "${finalName}" (autosaved)`);
    }
 
    setShowLandingPage(false);
  }, [isMuted, saveSlot, resetHistory, showToast]);

  const handleLoadSlot = useCallback(async (slotKey: string, name: string) => {
    if (!isMuted) playClickSound();
    const savedState = await loadSlot(slotKey);
    if (savedState) {
      setGrid(savedState.board ?? grid);
      setSpareTile(savedState.spareTile ?? spareTile);
      setLooseTiles(savedState.looseTiles || []);
      setActivePawn(savedState.activePawn || "red");
      setPlayerHands(savedState.playerHands || EMPTY_PLAYER_HANDS);
      setPlayerActiveTargets(savedState.playerActiveTargets || EMPTY_PLAYER_TARGETS);
      setLastShiftArrowId(savedState.lastShiftArrowId || null);
      setIsGameStarted(savedState.isGameStarted || false);
      setGameStartState(savedState.gameStartState || null);
      setPawnPositions(savedState.pawnPositions || DEFAULT_PAWN_POSITIONS);

      const record = {
        board: savedState.board ?? grid,
        spareTile: savedState.spareTile ?? spareTile,
        lastShiftArrowId: savedState.lastShiftArrowId || null,
        activePawn: savedState.activePawn || "red",
        playerHands: savedState.playerHands || EMPTY_PLAYER_HANDS,
        playerActiveTargets: savedState.playerActiveTargets || EMPTY_PLAYER_TARGETS,
        obtainedTreasures: savedState.obtainedTreasures || EMPTY_OBTAINED_TREASURES,
        pawnPositions: savedState.pawnPositions,
      };
      resetHistory(record);
      setCurrentSlotName(name);
      
      const slot = allSlots.find((s) => s.key === slotKey);
      if (slot && slot.timestamp) {
        setLastSavedTime(slot.timestamp);
      } else {
        setLastSavedTime(Date.now());
      }
      setShowLandingPage(false);
      setIsSettingsOpen(false);
      showToast(`Loaded save slot: ${name}`);
    }
  }, [isMuted, loadSlot, allSlots, resetHistory, showToast, grid, spareTile]);

  // Randomize all movable tiles on the board game
  const handleRandomizeBoard = useCallback(() => {
    if (isGameStarted) return;
    if (!isMuted) playClickSound();

    // 1. Rebuild the base grid with only fixed tiles
    const initialGrid = Array(7)
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

    // 2. Generate and shuffle the movable pool
    const pool = generateMovablePool();
    // Fisher-Yates shuffle
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = pool[i];
      pool[i] = pool[j];
      pool[j] = temp;
    }

    const rotations: Rotation[] = [0, 90, 180, 270];

    // 3. Fill the movable spots on the grid
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 7; x++) {
        // Skip fixed tiles
        if (x % 2 === 0 && y % 2 === 0) continue;

        const tile = pool.pop();
        if (tile) {
          const randomRot = rotations[Math.floor(Math.random() * 4)];
          initialGrid[y][x] = {
            ...tile,
            rotation: randomRot,
          };
        }
      }
    }

    // 4. The remaining single tile is the spare tile
    const remainingSpare = pool.pop();
    if (remainingSpare) {
      const randomRot = rotations[Math.floor(Math.random() * 4)];
      const finalSpare = { ...remainingSpare, rotation: randomRot };
      setSpareTile(finalSpare);
      setLooseTiles([finalSpare]);
      setGrid(initialGrid);

      // Push state to history
      pushStateToHistory(
        initialGrid,
        finalSpare,
        null,
        activePawn,
        playerHands,
        playerActiveTargets,
        obtainedTreasures,
        pawnPositions
      );
      showToast("Board Randomized Successfully!");
    }
  }, [isGameStarted, isMuted, activePawn, playerHands, playerActiveTargets, obtainedTreasures, pawnPositions, pushStateToHistory, showToast]);

  // Load layout from localStorage or initialize defaults
  useEffect(() => {
    try {
      workerRef.current = new Worker(
        new URL("./solver.worker.js", import.meta.url),
        { type: "module" }
      );

      workerRef.current.onmessage = (e) => {
        const { success, solutions: computed, error } = e.data;
        if (success) {
          setSolutions(computed || []);
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
      console.warn("Failed to instantiate Web Worker solver in background thread.", err);
    }

    // Attempt Load autosave
    const saved = loadAutosave();
    if (saved && saved.board) {
      setGrid(saved.board);
      setLooseTiles(saved.looseTiles || []);
      setSpareTile(saved.spareTile ?? spareTile);
      setActivePawn(saved.activePawn || "red");
      setPlayerHands(saved.playerHands || EMPTY_PLAYER_HANDS);
      setPlayerActiveTargets(saved.playerActiveTargets || EMPTY_PLAYER_TARGETS);
      setObtainedTreasures(saved.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
      setLastShiftArrowId(saved.lastShiftArrowId || null);
      setIsGameStarted(saved.isGameStarted || false);
      setGameStartState(saved.gameStartState || null);
      setPawnPositions(saved.pawnPositions || {
        red: { r: 0, c: 0 },
        blue: { r: 6, c: 6 },
        green: { r: 6, c: 0 },
        yellow: { r: 0, c: 6 },
      });

      const record = {
        board: saved.board,
        spareTile: saved.spareTile ?? spareTile,
        lastShiftArrowId: saved.lastShiftArrowId || null,
        activePawn: saved.activePawn || "red",
        playerHands: saved.playerHands || EMPTY_PLAYER_HANDS,
        playerActiveTargets: saved.playerActiveTargets || EMPTY_PLAYER_TARGETS,
        obtainedTreasures: saved.obtainedTreasures || EMPTY_OBTAINED_TREASURES,
        pawnPositions: saved.pawnPositions,
      };
      resetHistory(record);
    } else {
      resetBoardToInitialPresets();
    }

    return () => {
      workerRef.current?.terminate();
    };
    // Mount-only: instantiates the solver worker and hydrates from autosave once.
    // `spareTile`/`showToast` are intentionally omitted — including them would tear
    // down and recreate the worker (and re-hydrate over live state) on every change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadAutosave, resetHistory, resetBoardToInitialPresets]);

  // Compute solver suggestions asynchronously via Worker
  useEffect(() => {
    if (!isGameStarted || grid.length === 0 || !workerRef.current) return;

    const currentPawnCoord = pawnPositions[activePawn];
    const handCards = customTargetCoords ? ["custom_target"] : (playerHands[activePawn] || []);

    if (!currentPawnCoord || handCards.length === 0) {
      setSolutions([]);
      return;
    }

    setIsLoadingSolutions(true);
    let solverBoard = getSolverFormattedBoard(grid, pawnPositions);
    const solverSpare = getSolverFormattedSpare(spareTile);

    if (customTargetCoords) {
      solverBoard = solverBoard.map((row, r) =>
        row.map((cell, c) => {
          if (r === customTargetCoords.r && c === customTargetCoords.c) {
            return { ...cell, treasure: "custom_target" };
          }
          return cell;
        })
      );
    }

    workerRef.current.postMessage({
      board: solverBoard,
      spareTile: solverSpare,
      pawnPos: currentPawnCoord,
      handCards,
      lastShiftArrowId,
      maxTurns,
    });
  }, [grid, spareTile, activePawn, playerHands, lastShiftArrowId, maxTurns, isGameStarted, pawnPositions, getSolverFormattedBoard, getSolverFormattedSpare, customTargetCoords]);

  // Handle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    try { localStorage.setItem("labyrinth_audio_muted", String(nextMute)); } catch { /* storage full/blocked */ }
    showToast(nextMute ? "Muted retro sound effects 🔇" : "Sound effects enabled 🔊");
  };

  // Drag and Drop handlers
  const handleDragStart = (e: DragStartEvent) => {
    setActiveId(e.active.id as string);
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;

    if (!over) return;

    const tileId = active.id as string;
    const tileData = active.data.current as TileData;
    if (tileData.isFixed) return;

    const overId = over.id as string;

    const removeTile = (id: string) => {
      setLooseTiles((prev) => prev.filter((t) => t.id !== id));
      setGrid((prev) => {
        const nextGrid = prev.map((row) =>
          row.map((tile) => (tile?.id === id ? null : tile))
        );
        return nextGrid;
      });
    };

    const findTile = (id: string): TileData | undefined => {
      const inLoose = looseTiles.find((t) => t.id === id);
      if (inLoose) return inLoose;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (grid[r][c]?.id === id) return grid[r][c]!;
        }
      }
      return undefined;
    };

    const tileToMove = findTile(tileId);
    if (!tileToMove) return;

    if (overId === "side_panel") {
      removeTile(tileId);
      setLooseTiles((prev) => [...prev, tileToMove]);
    } else if (overId.startsWith("board_")) {
      const [, sx, sy] = overId.split("_");
      const tx = parseInt(sx);
      const ty = parseInt(sy);

      // Verify that drop spot is empty
      if (grid[ty][tx] === null) {
        removeTile(tileId);
        setGrid((prev) => {
          const nextGrid = prev.map((row) => [...row]);
          nextGrid[ty][tx] = tileToMove;
          return nextGrid;
        });
      }
    }
  };

  // Rotate tile
  const handleTileClick = (id: string) => {
    if (id === spareTile.id) {
      if (!isMuted) playRotateSound();
      setSpareTile((prev) => ({
        ...prev,
        rotation: ((prev.rotation + 90) % 360) as Rotation,
      }));
      return;
    }

    if (isGameStarted) return;

    if (setupTab === "pawns") {
      // Find the coordinates of this tile on the board to place the pawn
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (grid[r][c]?.id === id) {
            if (!isMuted) playClickSound();
            setPawnPositions((prev) => ({
              ...prev,
              [activePawnPlacementColor]: { r, c },
            }));
            return;
          }
        }
      }
      return;
    }

    if (!isMuted) playRotateSound();

    setLooseTiles((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, rotation: ((t.rotation + 90) % 360) as Rotation } : t
      )
    );

    setGrid((prev) => {
      const nextGrid = prev.map((row) =>
        row.map((tile) =>
          tile && tile.id === id && !tile.isFixed
            ? { ...tile, rotation: ((tile.rotation + 90) % 360) as Rotation }
            : tile
        )
      );
      return nextGrid;
    });
  };

  // Board cell click handlers for pawn movements or placements
  const handleCellClick = (r: number, c: number) => {
    if (!isGameStarted) {
      if (setupTab === "pawns") {
        if (!isMuted) playClickSound();
        setPawnPositions((prev) => ({
          ...prev,
          [activePawnPlacementColor]: { r, c },
        }));
        showToast(`Placed ${activePawnPlacementColor.toUpperCase()} pawn at (${r}, ${c})`);
      }
      return;
    }

    // Play Mode: Check reachable cell
    const startCoord = pawnPositions[activePawn];
    if (!startCoord) return;

    if (startCoord.r === r && startCoord.c === c) return;

    const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
    const { cells } = getReachableCells(solverBoard, startCoord.r, startCoord.c);
    const reachable = cells.some((cell: { r: number; c: number }) => cell.r === r && cell.c === c);

    if (reachable) {
      if (!isMuted) playPawnMoveSound();
      const nextPositions = {
        ...pawnPositions,
        [activePawn]: { r, c },
      };
      setPawnPositions(nextPositions);
      trackPawnMove(activePawn, 1);

      const activeTargetCard = playerActiveTargets[activePawn];
      const landedTreasure = grid[r][c]?.treasure;

      let nextPlayerHands = playerHands;
      let nextPlayerActiveTargets = playerActiveTargets;
      let nextObtainedTreasures = obtainedTreasures;

      if (landedTreasure && landedTreasure.id === activeTargetCard) {
        if (!isMuted) playSuccessSound();
        const nextHand = playerHands[activePawn].filter((id) => id !== activeTargetCard);
        nextPlayerHands = { ...playerHands, [activePawn]: nextHand };
        nextPlayerActiveTargets = {
          ...playerActiveTargets,
          [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
        };
        nextObtainedTreasures = {
          ...obtainedTreasures,
          [activePawn]: [...(obtainedTreasures[activePawn] || []), activeTargetCard]
        };
        setPlayerHands(nextPlayerHands);
        setPlayerActiveTargets(nextPlayerActiveTargets);
        setObtainedTreasures(nextObtainedTreasures);
        trackPawnTreasure(activePawn);
        showToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
      } else {
        showToast(`Moved ${activePawn.toUpperCase()} pawn to (${r}, ${c})`);
      }

      pushStateToHistory(
        grid,
        spareTile,
        lastShiftArrowId,
        activePawn,
        nextPlayerHands,
        nextPlayerActiveTargets,
        nextObtainedTreasures,
        nextPositions
      );

      // Auto-save after manual pawn moves
      saveAutosave({
        board: grid,
        looseTiles: [],
        spareTile,
        activePawn,
        playerHands: nextPlayerHands,
        playerActiveTargets: nextPlayerActiveTargets,
        obtainedTreasures: nextObtainedTreasures,
        lastShiftArrowId,
        isGameStarted,
        gameStartState,
        pawnPositions: nextPositions,
      });
      setLastSavedTime(Date.now());

      // Auto-switch to next pawn after manual move
      if (!landedTreasure || landedTreasure.id !== activeTargetCard) {
        switchToNextPawn();
      }
    } else {
      if (customTargetCoords && customTargetCoords.r === r && customTargetCoords.c === c) {
        setCustomTargetCoords(null);
        showToast("Cleared custom target");
      } else {
        setCustomTargetCoords({ r, c });
        showToast(`Custom target set at (${r}, ${c}). Solving path...`);
      }
    }
  };

  // Slide Spare Tile in Gameplay
  const handleSlide = (arrowId: string) => {
    if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
      showToast("Can't reverse the shift action immediately!");
      return;
    }

    if (!isMuted) playSlideSound();

    const arrow = SHIFT_ARROWS.find((a) => a.id === arrowId);
    if (!arrow) return;

    const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
    const solverSpare = getSolverFormattedSpare(spareTile);

    const { newSpare } = executeSlideInGrid(
      solverBoard,
      solverSpare,
      arrow.type,
      arrow.index,
      arrow.dir
    );

    const nextGrid = fromSolverGrid(grid, solverBoard, nextTileId);
    const nextSpare = fromSolverSpare(newSpare, String(Date.now()));
    setSpareTile(nextSpare);

    // Update pawn positions due to slide push
    const nextPositions = { ...pawnPositions };
    Object.entries(pawnPositions).forEach(([color, pos]) => {
      let nr = pos.r;
      let nc = pos.c;
      if (arrow.type === "row" && arrow.index === pos.r) {
        if (arrow.dir === "left") {
          nc = pos.c === 6 ? 0 : pos.c + 1;
        } else {
          nc = pos.c === 0 ? 6 : pos.c - 1;
        }
      } else if (arrow.type === "col" && arrow.index === pos.c) {
        if (arrow.dir === "top") {
          nr = pos.r === 6 ? 0 : pos.r + 1;
        } else {
          nr = pos.r === 0 ? 6 : pos.r - 1;
        }
      }
      nextPositions[color] = { r: nr, c: nc };
    });

    setPawnPositions(nextPositions);
    setGrid(nextGrid);
    setLastShiftArrowId(arrowId);

    pushStateToHistory(
      nextGrid,
      nextSpare,
      arrowId,
      activePawn,
      playerHands,
      playerActiveTargets,
      obtainedTreasures,
      nextPositions
    );

    // Save Autosave
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
    });
    setLastSavedTime(Date.now());
  };

  // Deal card logic
  const handleAddCard = (treasureId: string) => {
    if (playerHands[activePawn].includes(treasureId)) return;
    const nextHand = [...playerHands[activePawn], treasureId];
    setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
    if (!playerActiveTargets[activePawn]) {
      setPlayerActiveTargets((prev) => ({ ...prev, [activePawn]: treasureId }));
    }
    setPawnStats((prev) => {
      const current = prev[activePawn] || { tilesMoved: 0, shiftsUsed: 0, treasuresFound: 0, totalTargets: 0 };
      return { ...prev, [activePawn]: { ...current, totalTargets: current.totalTargets + 1 } };
    });
  };

  const handleRemoveCard = (treasureId: string) => {
    const nextHand = playerHands[activePawn].filter((id) => id !== treasureId);
    setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
    setPlayerActiveTargets((prev) => ({
      ...prev,
      [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
    }));
  };
 
  const handleSelectTargetTreasure = useCallback((pawnColor: string, treasureId: string | null) => {
    setPlayerActiveTargets((prev) => ({
      ...prev,
      [pawnColor]: treasureId,
    }));
    setPlayerHands((prev) => ({
      ...prev,
      [pawnColor]: treasureId ? [treasureId] : [],
    }));
    setCustomTargetCoords(null);
  }, []);

  // Track pawn moves
  const trackPawnMove = useCallback((pawnColor: string, tilesMoved: number = 1) => {
    setPawnStats((prev) => {
      const current = prev[pawnColor] || { tilesMoved: 0, shiftsUsed: 0, treasuresFound: 0, totalTargets: 0 };
      return {
        ...prev,
        [pawnColor]: {
          ...current,
          tilesMoved: current.tilesMoved + tilesMoved,
        },
      };
    });
  }, []);

  const trackPawnTreasure = useCallback((pawnColor: string) => {
    setPawnStats((prev) => {
      const current = prev[pawnColor] || { tilesMoved: 0, shiftsUsed: 0, treasuresFound: 0, totalTargets: 0 };
      return {
        ...prev,
        [pawnColor]: {
          ...current,
          treasuresFound: current.treasuresFound + 1,
        },
      };
    });
  }, []);

  // Auto-switch to next pawn
  const switchToNextPawn = useCallback(() => {
    const currentIndex = activePlayers.indexOf(activePawn);
    const nextIndex = (currentIndex + 1) % activePlayers.length;
    const nextPawn = activePlayers[nextIndex];
    if (nextPawn) {
      setActivePawn(nextPawn);
    }
  }, [activePawn, activePlayers, setActivePawn]);

  // Auto-save on board setup changes (only when game is not started)
  useEffect(() => {
    if (isGameStarted) return;
    saveAutosave({
      board: grid,
      looseTiles,
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      lastShiftArrowId,
      isGameStarted,
      gameStartState,
      pawnPositions,
    });
    setLastSavedTime(Date.now());
  }, [grid, looseTiles, spareTile, activePawn, playerHands, playerActiveTargets, lastShiftArrowId, isGameStarted, gameStartState, pawnPositions, saveAutosave]);

  // Start gameplay
  const handleStartGame = () => {
    if (looseTiles.length !== 1) {
      showToast("Cannot start! Make sure exactly 33 tiles are placed on the board.");
      return;
    }

    if (!isMuted) playSuccessSound();

    const startState = {
      board: grid.map((r) => [...r]),
      spareTile: { ...looseTiles[0] },
      looseTiles: [] as typeof looseTiles,
      activePawn,
      playerHands: { ...playerHands },
      playerActiveTargets: { ...playerActiveTargets },
      obtainedTreasures: { ...obtainedTreasures },
      lastShiftArrowId: null as string | null,
      isGameStarted: false,
      gameStartState: null,
      pawnPositions: { ...pawnPositions },
    };

    setSpareTile(looseTiles[0]);
    setLooseTiles([]);
    setIsGameStarted(true);
    setGameStartState(startState);

    pushStateToHistory(grid, looseTiles[0], null, activePawn, playerHands, playerActiveTargets, obtainedTreasures);

    saveAutosave({
      board: grid,
      looseTiles: [],
      spareTile: looseTiles[0] ?? spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      lastShiftArrowId: null,
      isGameStarted: true,
      gameStartState: startState,
      pawnPositions,
    });
    setLastSavedTime(Date.now());

    showToast("Game started! Slide the spare tile and move your pawn to targets.");
  };

  const handleEndGame = () => {
    if (!gameStartState) return;
    if (!isMuted) playClickSound();

    setGrid(gameStartState.board);
    setLooseTiles([gameStartState.spareTile]);
    setIsGameStarted(false);
    setLastShiftArrowId(null);
  };

  // Execute solver suggestion
  const handleExecuteSolution = (path: any[]) => {
    if (path.length === 0) return;
    const turn1 = path[0];
    const arrow = SHIFT_ARROWS.find((a) => a.id === turn1.arrowId);
    if (!arrow) return;

    if (!isMuted) playSlideSound();

    // Rotate spare to solver suggested rotation
    const rotDegrees = [0, 90, 180, 270][turn1.rotation] as Rotation;
    const solverSpare = getSolverFormattedSpare({ ...spareTile, rotation: rotDegrees });
    const solverBoard = getSolverFormattedBoard(grid, pawnPositions);

    const { newSpare } = executeSlideInGrid(
      solverBoard,
      solverSpare,
      arrow.type,
      arrow.index,
      arrow.dir
    );

    const nextGrid = fromSolverGrid(grid, solverBoard, nextTileId);
    setGrid(nextGrid);
    const nextSpare = fromSolverSpare(newSpare, String(Date.now()));
    setSpareTile(nextSpare);

    // End coordinate
    const finalPos = turn1.endPos;
    const nextPositions = {
      ...pawnPositions,
      [activePawn]: { r: finalPos.r, c: finalPos.c },
    };
    setPawnPositions(nextPositions);

    setLastShiftArrowId(turn1.arrowId);
    totalShiftsRef.current += 1;
    trackPawnMove(activePawn, 1);

    const activeTargetCard = playerActiveTargets[activePawn];
    const landedTreasure = nextGrid[finalPos.r][finalPos.c]?.treasure;

    let nextPlayerHands = playerHands;
    let nextPlayerActiveTargets = playerActiveTargets;
    let nextObtainedTreasures = obtainedTreasures;

    if (landedTreasure && landedTreasure.id === activeTargetCard) {
      if (!isMuted) playSuccessSound();
      const nextHand = playerHands[activePawn].filter((id) => id !== activeTargetCard);
      nextPlayerHands = { ...playerHands, [activePawn]: nextHand };
      nextPlayerActiveTargets = {
        ...playerActiveTargets,
        [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
      };
      nextObtainedTreasures = {
        ...obtainedTreasures,
        [activePawn]: [...(obtainedTreasures[activePawn] || []), activeTargetCard]
      };
      setPlayerHands(nextPlayerHands);
      setPlayerActiveTargets(nextPlayerActiveTargets);
      setObtainedTreasures(nextObtainedTreasures);
      trackPawnTreasure(activePawn);
      showToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
    }

    pushStateToHistory(
      nextGrid,
      nextSpare,
      turn1.arrowId,
      activePawn,
      nextPlayerHands,
      nextPlayerActiveTargets,
      nextObtainedTreasures,
      nextPositions
    );

    // Auto-save after executing solver solutions
    saveAutosave({
      board: nextGrid,
      looseTiles: [],
      spareTile: nextSpare,
      activePawn,
      playerHands: nextPlayerHands,
      playerActiveTargets: nextPlayerActiveTargets,
      obtainedTreasures: nextObtainedTreasures,
      lastShiftArrowId: turn1.arrowId,
      isGameStarted,
      gameStartState,
      pawnPositions: nextPositions,
    });
    setLastSavedTime(Date.now());

    // Auto-switch to next pawn after execution
    switchToNextPawn();
  };

  // Derive active paths for overlay suggestions
  const overlaySuggestedPath = useMemo(() => {
    if (!hoveredSolution || hoveredSolution.length === 0) return null;
    return hoveredSolution[0].pawnPath as { r: number; c: number }[];
  }, [hoveredSolution]);

  // Find active target coordinates on board for highlighting
  const activeTargetCoords = useMemo(() => {
    const targetId = playerActiveTargets[activePawn];
    if (!targetId || !grid.length) return null;
    
    // Find the treasure on the board
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        const cell = grid[r]?.[c];
        if (cell?.treasure && cell.treasure.id === targetId) {
          return { r, c };
        }
      }
    }
    return null;
  }, [playerActiveTargets, activePawn, grid]);
 
  const previewState = useMemo(() => {
    if (!hoveredSolution || hoveredSolution.length === 0) return null;
    const turn1 = hoveredSolution[0];
    const arrow = SHIFT_ARROWS.find((a) => a.id === turn1.arrowId);
    if (!arrow) return null;
 
    try {
      const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
      const rotDegrees = [0, 90, 180, 270][turn1.rotation] as Rotation;
      const solverSpare = getSolverFormattedSpare({ ...spareTile, rotation: rotDegrees });
      executeSlideInGrid(solverBoard, solverSpare, arrow.type, arrow.index, arrow.dir);
      
      const previewGrid = fromSolverGrid(grid, solverBoard, () => "preview_temp_inserted");
      
      const previewPawnPositions = { ...pawnPositions };
      Object.entries(pawnPositions).forEach(([color, pos]) => {
        let nr = pos.r;
        let nc = pos.c;
        if (arrow.type === "row" && arrow.index === pos.r) {
          if (arrow.dir === "left") {
            nc = pos.c === 6 ? 0 : pos.c + 1;
          } else {
            nc = pos.c === 0 ? 6 : pos.c - 1;
          }
        } else if (arrow.type === "col" && arrow.index === pos.c) {
          if (arrow.dir === "top") {
            nr = pos.r === 6 ? 0 : pos.r + 1;
          } else {
            nr = pos.r === 0 ? 6 : pos.r - 1;
          }
        }
        previewPawnPositions[color] = { r: nr, c: nc };
      });
 
      return {
        grid: previewGrid,
        pawnPositions: previewPawnPositions,
        spareTile: { ...spareTile, rotation: rotDegrees },
      };
    } catch (e) {
      console.error("Preview computation failed:", e);
      return null;
    }
  }, [hoveredSolution, grid, pawnPositions, spareTile, getSolverFormattedBoard, getSolverFormattedSpare]);
 

  return (
    <div className="h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-theme-primary-10 blur-[120px] rounded-full pointer-events-none" />

      {showLandingPage ? (
        <LandingPage
          allSlots={allSlots}
          onNewGame={handleNewGame}
          onLoadSlot={handleLoadSlot}
        />
      ) : (
        <>
          {/* Header */}
          <AppHeader
            currentSlotName={currentSlotName}
            lastSavedTime={lastSavedTime}
            isGameStarted={isGameStarted}
            canUndo={canUndo}
            canRedo={canRedo}
            isMuted={isMuted}
            showStats={showStats}
            activeTheme={activeTheme}
            activePlayers={activePlayers}
            activePawn={activePawn}
            looseTiles={looseTiles}
            saveName={saveName}
            setSaveName={setSaveName}
            allSlots={allSlots}
            peekSlotKey={peekSlotKey}
            setPeekSlotKey={setPeekSlotKey}
            peekedState={peekedState}
            settingsTab={settingsTab}
            setSettingsTab={setSettingsTab}
            isSettingsOpen={isSettingsOpen}
            desktopSettings={desktopSettings}
            grid={grid}
            spareTile={spareTile}
            playerHands={playerHands}
            playerActiveTargets={playerActiveTargets}
            obtainedTreasures={obtainedTreasures}
            lastShiftArrowId={lastShiftArrowId}
            gameStartState={gameStartState}
            pawnPositions={pawnPositions}
            onGoToMenu={() => {
              if (!isMuted) playClickSound();
              setShowLandingPage(true);
            }}
            onOpenNewGameDialog={() => {
              if (!isMuted) playClickSound();
              setIsNewGameDialogOpen(true);
            }}
            onOpenSettings={() => {
              if (!isMuted) playClickSound();
              setIsSettingsOpen(true);
            }}
            onCloseSettings={() => {
              setIsSettingsOpen(false);
              setSaveName("");
              setPeekSlotKey(null);
            }}
            onSave={handleSaveActiveGame}
            onUndo={() => {
              if (!isMuted) playClickSound();
              undo((state) => {
                setGrid(state.board);
                setSpareTile(state.spareTile);
                setLastShiftArrowId(state.lastShiftArrowId);
                setActivePawn(state.activePawn);
                setPlayerHands(state.playerHands);
                setPlayerActiveTargets(state.playerActiveTargets);
                setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
                if (state.pawnPositions) setPawnPositions(state.pawnPositions);
              });
            }}
            onRedo={() => {
              if (!isMuted) playClickSound();
              redo((state) => {
                setGrid(state.board);
                setSpareTile(state.spareTile);
                setLastShiftArrowId(state.lastShiftArrowId);
                setActivePawn(state.activePawn);
                setPlayerHands(state.playerHands);
                setPlayerActiveTargets(state.playerActiveTargets);
                setObtainedTreasures(state.obtainedTreasures || EMPTY_OBTAINED_TREASURES);
                if (state.pawnPositions) setPawnPositions(state.pawnPositions);
              });
            }}
            onResetBoard={resetBoardToInitialPresets}
            onRotateBoard={() => {
              if (!isMuted) playClickSound();
              setBoardRotation((prev) => (prev + 90) % 360);
            }}
            onToggleStats={() => {
              if (!isMuted) playClickSound();
              setShowStats((prev) => !prev);
            }}
            onStartGame={handleStartGame}
            onEndGame={handleEndGame}
            onToggleMute={handleToggleMute}
            onSaveSlot={async (name) => {
              const currentAppState = { board: grid, spareTile, looseTiles, activePawn, playerHands, playerActiveTargets, obtainedTreasures, lastShiftArrowId, isGameStarted, gameStartState, pawnPositions };
              const success = await saveSlot(name, currentAppState);
              if (success) { showToast("Game Saved Successfully!"); setCurrentSlotName(name); setLastSavedTime(Date.now()); setSaveName(""); }
            }}
            onLoadSlot={handleLoadSlot}
            onDeleteSlot={deleteSlot}
            onSetActiveTheme={setActiveTheme}
            onSetActivePlayers={setActivePlayers}
            onSetDesktopSettings={handleSetDesktopSettings}
            showToast={showToast}
          />

      {/* Main Panel layout */}
      <main className="flex-1 flex flex-col lg:flex-row relative z-10 w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6 lg:gap-8 justify-center overflow-y-auto lg:overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex-1 lg:flex-[1.5] w-full flex min-w-0 min-h-0 items-center justify-center relative">
            <div className="relative aspect-square w-full max-w-[min(100vw-2rem,100vh-280px)] lg:max-w-none lg:w-auto lg:h-full flex-shrink-0 mx-auto">
              {/* Highlight Overlay Arrow suggested indicator */}
              {hoveredSolution && hoveredSolution.length > 0 && (
                <div
                  className="absolute animate-ping bg-theme-primary-20 border border-theme-primary-40 rounded-full pointer-events-none"
                  style={{
                    // Position ping near the arrow insertion point
                    ...(() => {
                      const arrow = SHIFT_ARROWS.find((a) => a.id === hoveredSolution[0].arrowId);
                      if (!arrow) return { display: "none" };
                      // Approximate coordinates
                      return {
                        left: `${arrow.gridColumn * 11.1}%`,
                        top: `${arrow.gridRow * 11.1}%`,
                        width: "30px",
                        height: "30px",
                        transform: "translate(-50%, -50%)",
                      };
                    })(),
                  }}
                />
              )}

              <Board
                grid={previewState ? previewState.grid : grid}
                originalGrid={grid}
                pawnPositions={previewState ? previewState.pawnPositions : pawnPositions}
                onCellClick={handleCellClick}
                onTileClick={handleTileClick}
                isGameStarted={isGameStarted}
                lastShiftArrowId={lastShiftArrowId}
                onArrowClick={handleSlide}
                hoveredPath={overlaySuggestedPath}
                hoveredSolutionArrow={hoveredSolution ? hoveredSolution[0].arrowId : null}
                boardRotation={boardRotation}
                customTargetCoords={customTargetCoords}
                activeTargetCoords={activeTargetCoords}
              />
            </div>
          </div>

          {/* Sidebar Editor / Play Control panel */}
          <div className="w-full lg:w-[400px] xl:w-[440px] flex flex-col flex-shrink-0 min-h-0 lg:h-full gap-3">
            {isGameStarted && (
              <>
                <TrophyPanel
                  activePlayers={activePlayers}
                  playerHands={playerHands}
                  obtainedTreasures={obtainedTreasures}
                />
                <SolverPanel
                  solutions={solutions}
                  isLoadingSolutions={isLoadingSolutions}
                  hoveredSolution={hoveredSolution}
                  setHoveredSolution={setHoveredSolution}
                  maxTurns={maxTurns}
                  setMaxTurns={setMaxTurns}
                  activePawn={activePawn}
                  setActivePawn={setActivePawn}
                  activePlayers={activePlayers}
                  isMuted={isMuted}
                  spareTile={previewState ? previewState.spareTile : spareTile}
                  customTargetCoords={customTargetCoords}
                  setCustomTargetCoords={setCustomTargetCoords}
                  onExecuteSolution={handleExecuteSolution}
                  playerActiveTargets={playerActiveTargets}
                  onSelectTargetTreasure={handleSelectTargetTreasure}
                  obtainedTreasures={obtainedTreasures}
                  grid={grid}
                  pawnPositions={pawnPositions}
                  lastShiftArrowId={lastShiftArrowId}
                />
              </>
            )}
            {!isGameStarted && (
              <SetupPanel
                looseTiles={looseTiles}
                activePlayers={activePlayers}
                activePawn={activePawn}
                setActivePawn={setActivePawn}
                isMuted={isMuted}
                activePawnPlacementColor={activePawnPlacementColor}
                setActivePawnPlacementColor={setActivePawnPlacementColor}
                pawnPositions={pawnPositions}
                playerHands={playerHands}
                onTileClick={handleTileClick}
                onRandomizeBoard={handleRandomizeBoard}
                onAddCard={handleAddCard}
                onRemoveCard={handleRemoveCard}
                setupTab={setupTab}
                setSetupTab={setSetupTab}
              />
            )}
          </div>


          {/* Active Overlay Dragging representation */}
          <DragOverlay dropAnimation={null}>
            {activeId ? (
              <Tile
                tile={
                  looseTiles.find((t) => t.id === activeId) ||
                  grid.flat().find((t: any) => t?.id === activeId)!
                }
                className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 shadow-2xl shadow-black ring-4 ring-theme-primary/50"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </>
  )}
 
      <Dialog open={isNewGameDialogOpen} onOpenChange={(open) => {
        setIsNewGameDialogOpen(open);
        if (!open) setNewGameName("");
      }}>
        <DialogContent className="sm:max-w-[425px] bg-stone-900 border border-stone-800 text-stone-100 shadow-2xl p-6 rounded-2xl" onKeyDown={(e) => {
          if (e.key === " ") {
            e.stopPropagation();
          }
        }}>
          <DialogHeader>
            <DialogTitle className="text-lg font-bold tracking-tight text-theme-primary flex items-center gap-2">
              <Plus className="w-5 h-5 text-theme-primary" />
              Create New Game
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-4">
            <div className="text-sm text-stone-400">
              Enter a name for your new game. If left blank, it will automatically be named with the current timestamp and saved.
            </div>
            <div className="flex flex-col gap-1.5 text-left font-sans">
              <label htmlFor="ribbonGameName" className="text-xs font-semibold text-stone-300">
                Game Name
              </label>
              <input
                id="ribbonGameName"
                type="text"
                placeholder="e.g. My Game Layout"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleNewGame(newGameName);
                    setIsNewGameDialogOpen(false);
                    setNewGameName("");
                  }
                  if (e.key === " ") {
                    e.stopPropagation();
                  }
                }}
                className="bg-stone-950 border border-stone-800 hover:border-stone-700 text-stone-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-theme-primary transition-colors"
                autoFocus
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                if (!isMuted) playClickSound();
                setIsNewGameDialogOpen(false);
                setNewGameName("");
              }}
              className="border-stone-800 hover:bg-stone-900 text-stone-300 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                handleNewGame(newGameName);
                setIsNewGameDialogOpen(false);
                setNewGameName("");
              }}
              className="bg-theme-primary text-stone-950 font-bold hover:bg-theme-primary-hover rounded-xl cursor-pointer"
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>
 
      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="sm:max-w-[500px] bg-stone-900 border border-stone-800 text-stone-100 shadow-2xl p-0 rounded-2xl overflow-hidden" onKeyDown={(e) => {
          if (e.key === " ") {
            e.stopPropagation();
          }
        }}>
          <StatsPanel
            activePlayers={activePlayers}
            pawnStats={pawnStats}
            totalShifts={totalShiftsRef.current}
            obtainedTreasures={obtainedTreasures}
          />
        </DialogContent>
      </Dialog>

      {/* Floating Notification Toast */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">{toastText}</div>
      {toastText && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-6 py-3 bg-stone-900 border border-theme-primary-20 text-stone-100 font-semibold text-sm rounded-full shadow-2xl shadow-black z-50 animate-toast-in flex items-center gap-2" aria-hidden="true">
          <Sparkles className="w-4 h-4 text-theme-primary" />
          {toastText}
        </div>
      )}
    </div>
  );
}