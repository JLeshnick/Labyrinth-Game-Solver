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
import { FIXED_TILES_PRESETS, TREASURES, PAWNS, SHIFT_ARROWS, generateMovablePool } from "./constants";
import type { TileData, Rotation, Shape } from "./types";
import { Board } from "./components/Board";
import { SidePanel } from "./components/SidePanel";
import { Tile } from "./components/Tile";
import { Button } from "./components/ui/button";
import { useLabyrinthHistory } from "./hooks/useLabyrinthHistory";
import { useLabyrinthStorage, AUTOSAVE_KEY } from "./hooks/useLabyrinthStorage";
import {
  playClickSound,
  playSlideSound,
  playRotateSound,
  playSuccessSound,
  playPawnMoveSound,
} from "./utils/audio";
import {
  Compass,
  RefreshCcw,
  Undo2,
  Redo2,
  Lock,
  Unlock,
  Volume2,
  VolumeX,
  RotateCw,
  User,
  Layers,
  Sparkles,
  Settings,
  Trash2,
  Eye,
  Download,
  Upload,
  Save,
  Plus,
  FolderOpen,
  Home,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./components/ui/dialog";
import { executeSlideInGrid, isOppositeArrow, getReachableCells } from "./solver";

export default function App() {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

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
  const [playerHands, setPlayerHands] = useState<Record<string, string[]>>({
    red: [],
    blue: [],
    green: [],
    yellow: [],
  });
  const [playerActiveTargets, setPlayerActiveTargets] = useState<Record<string, string | null>>({
    red: null,
    blue: null,
    green: null,
    yellow: null,
  });

  // Pawn Positions
  const [pawnPositions, setPawnPositions] = useState<Record<string, { r: number; c: number }>>({
    red: { r: 6, c: 0 },
    blue: { r: 6, c: 6 },
    green: { r: 6, c: 0 }, // Swapped Green position
    yellow: { r: 0, c: 6 }, // Swapped Yellow position
  });

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
  const { slots, saveAutosave, loadAutosave, saveSlot, loadSlot, deleteSlot } = useLabyrinthStorage();

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

  // Active Project & Ribbon saving
  const [currentSlotName, setCurrentSlotName] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", activeTheme);
    localStorage.setItem("labyrinth_theme", activeTheme);
  }, [activeTheme]);

  const peekedState = useMemo(() => {
    if (!peekSlotKey) return null;
    return loadSlot(peekSlotKey);
  }, [peekSlotKey, loadSlot]);

  // Toast System
  const [toastText, setToastText] = useState<string | null>(null);
  const showToast = useCallback((msg: string) => {
    setToastText(msg);
    const audioMuted = localStorage.getItem("labyrinth_audio_muted") === "true";
    if (!audioMuted) playClickSound();
  }, []);

  useEffect(() => {
    if (toastText) {
      const t = setTimeout(() => setToastText(null), 3000);
      return () => clearTimeout(t);
    }
  }, [toastText]);


  // Quick save callback in header ribbon
  const handleSaveActiveProject = useCallback(() => {
    if (currentSlotName) {
      const currentAppState = {
        board: grid,
        spareTile,
        looseTiles,
        activePawn,
        playerHands,
        playerActiveTargets,
        lastShiftArrowId,
        isGameStarted,
        gameStartState,
        pawnPositions,
      };
      // Find the slot by name to save to its existing key
      const existingSlot = slots.find((s) => s.name === currentSlotName);
      if (existingSlot) {
        localStorage.setItem(existingSlot.key, JSON.stringify(currentAppState));
        const now = Date.now();
        setLastSavedTime(now);
        showToast(`Saved "${currentSlotName}" successfully!`);
      }
    } else {
      setIsSettingsOpen(true);
    }
  }, [currentSlotName, grid, spareTile, looseTiles, activePawn, playerHands, playerActiveTargets, lastShiftArrowId, isGameStarted, gameStartState, pawnPositions, slots, showToast]);

  // Translate Grid + Pawns Positions into Solver Format
  const getSolverFormattedBoard = useCallback((currentGrid: (TileData | null)[][], positions: Record<string, { r: number; c: number }>) => {
    const shapeMap: Record<Shape, string> = {
      straight: "I",
      corner: "L",
      "t-junction": "T",
    };
    const dirMap: Record<Rotation, number> = {
      0: 0,
      90: 1,
      180: 2,
      270: 3,
    };

    const boardRep = Array(7).fill(null).map((_, r) =>
      Array(7).fill(null).map((_, c) => {
        const tile = currentGrid[r][c];
        const pawnsAtCell: string[] = [];
        Object.entries(positions).forEach(([color, pos]) => {
          if (pos.r === r && pos.c === c) {
            pawnsAtCell.push(color);
          }
        });

        if (!tile) {
          return {
            r,
            c,
            shape: "I",
            dir: 0,
            treasure: null,
            isFixed: false,
            pawns: pawnsAtCell,
          };
        }

        return {
          r,
          c,
          shape: shapeMap[tile.shape],
          dir: dirMap[tile.rotation],
          treasure: tile.treasure ? tile.treasure.id : null,
          isFixed: tile.isFixed,
          pawns: pawnsAtCell,
        };
      })
    );

    return boardRep;
  }, []);

  // Translate a single Spare Tile to Solver Format
  const getSolverFormattedSpare = useCallback((tile: TileData) => {
    const shapeMap: Record<Shape, string> = {
      straight: "I",
      corner: "L",
      "t-junction": "T",
    };
    const dirMap: Record<Rotation, number> = {
      0: 0,
      90: 1,
      180: 2,
      270: 3,
    };
    return {
      shape: shapeMap[tile.shape],
      dir: dirMap[tile.rotation],
      treasure: tile.treasure ? tile.treasure.id : null,
      isFixed: false,
      pawns: [],
    };
  }, []);

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

    // Swap Red & Blue across, and Green & Yellow across
    const defaultPositions = {
      red: { r: 0, c: 0 },
      blue: { r: 6, c: 6 },
      green: { r: 6, c: 0 },
      yellow: { r: 0, c: 6 },
    };
    setPawnPositions(defaultPositions);

    const pool = generateMovablePool();
    setLooseTiles(pool);
    setIsGameStarted(false);
    setLastShiftArrowId(null);
    setPlayerHands({ red: [], blue: [], green: [], yellow: [] });
    setPlayerActiveTargets({ red: null, blue: null, green: null, yellow: null });

    const startState = {
      board: initialGrid,
      spareTile: { id: "spare_initial", shape: "straight" as Shape, rotation: 0 as Rotation, isFixed: false },
      activePawn: "red",
      playerHands: { red: [], blue: [], green: [], yellow: [] },
      playerActiveTargets: { red: null, blue: null, green: null, yellow: null },
      lastShiftArrowId: null,
      pawnPositions: defaultPositions,
    };

    resetHistory(startState);
  }, [resetHistory]);

  const handleNewProject = useCallback(() => {
    const audioMuted = localStorage.getItem("labyrinth_audio_muted") === "true";
    if (!audioMuted) playClickSound();
    resetBoardToInitialPresets();
    setCurrentSlotName(null);
    setLastSavedTime(null);
    setShowLandingPage(false);
  }, [resetBoardToInitialPresets]);

  const handleLoadSlot = useCallback((slotKey: string, name: string) => {
    const audioMuted = localStorage.getItem("labyrinth_audio_muted") === "true";
    if (!audioMuted) playClickSound();
    const savedState = loadSlot(slotKey);
    if (savedState) {
      setGrid(savedState.board);
      setSpareTile(savedState.spareTile);
      setLooseTiles(savedState.looseTiles || []);
      setActivePawn(savedState.activePawn || "red");
      setPlayerHands(savedState.playerHands || { red: [], blue: [], green: [], yellow: [] });
      setPlayerActiveTargets(savedState.playerActiveTargets || { red: null, blue: null, green: null, yellow: null });
      setLastShiftArrowId(savedState.lastShiftArrowId || null);
      setIsGameStarted(savedState.isGameStarted || false);
      setGameStartState(savedState.gameStartState || null);
      setPawnPositions(savedState.pawnPositions || {
        red: { r: 0, c: 0 },
        blue: { r: 6, c: 6 },
        green: { r: 6, c: 0 },
        yellow: { r: 0, c: 6 },
      });

      const record = {
        board: savedState.board,
        spareTile: savedState.spareTile,
        lastShiftArrowId: savedState.lastShiftArrowId || null,
        activePawn: savedState.activePawn || "red",
        playerHands: savedState.playerHands || { red: [], blue: [], green: [], yellow: [] },
        playerActiveTargets: savedState.playerActiveTargets || { red: null, blue: null, green: null, yellow: null },
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
  }, [loadSlot, allSlots, resetHistory, showToast]);

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
      setLooseTiles([]);
      setGrid(initialGrid);

      // Push state to history
      pushStateToHistory(
        initialGrid,
        finalSpare,
        null,
        activePawn,
        playerHands,
        playerActiveTargets,
        pawnPositions
      );
      showToast("Board Randomized Successfully!");
    }
  }, [isGameStarted, isMuted, activePawn, playerHands, playerActiveTargets, pawnPositions, pushStateToHistory, showToast]);

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
        }
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
      setSpareTile(saved.spareTile);
      setActivePawn(saved.activePawn || "red");
      setPlayerHands(saved.playerHands || { red: [], blue: [], green: [], yellow: [] });
      setPlayerActiveTargets(saved.playerActiveTargets || { red: null, blue: null, green: null, yellow: null });
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
        spareTile: saved.spareTile,
        lastShiftArrowId: saved.lastShiftArrowId || null,
        activePawn: saved.activePawn || "red",
        playerHands: saved.playerHands || { red: [], blue: [], green: [], yellow: [] },
        playerActiveTargets: saved.playerActiveTargets || { red: null, blue: null, green: null, yellow: null },
        pawnPositions: saved.pawnPositions,
      };
      resetHistory(record);
    } else {
      resetBoardToInitialPresets();
    }

    return () => {
      workerRef.current?.terminate();
    };
  }, [loadAutosave, resetHistory, resetBoardToInitialPresets]);

  // Compute solver suggestions asynchronously via Worker
  useEffect(() => {
    if (!isGameStarted || grid.length === 0 || !workerRef.current) return;

    const currentPawnCoord = pawnPositions[activePawn];
    const handCards = playerHands[activePawn] || [];

    if (!currentPawnCoord || handCards.length === 0) {
      setSolutions([]);
      return;
    }

    setIsLoadingSolutions(true);
    const solverBoard = getSolverFormattedBoard(grid, pawnPositions);
    const solverSpare = getSolverFormattedSpare(spareTile);

    workerRef.current.postMessage({
      board: solverBoard,
      spareTile: solverSpare,
      pawnPos: currentPawnCoord,
      handCards,
      lastShiftArrowId,
      maxTurns,
    });
  }, [grid, spareTile, activePawn, playerHands, lastShiftArrowId, maxTurns, isGameStarted, pawnPositions, getSolverFormattedBoard, getSolverFormattedSpare]);

  // Handle Mute
  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    localStorage.setItem("labyrinth_audio_muted", String(nextMute));
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
    if (isGameStarted) return;
    if (id === spareTile.id) {
      if (!isMuted) playRotateSound();
      setSpareTile((prev) => ({
        ...prev,
        rotation: ((prev.rotation + 90) % 360) as Rotation,
      }));
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
      setPawnPositions((prev) => ({
        ...prev,
        [activePawn]: { r, c },
      }));

      const activeTargetCard = playerActiveTargets[activePawn];
      const landedTreasure = grid[r][c]?.treasure;

      if (landedTreasure && landedTreasure.id === activeTargetCard) {
        if (!isMuted) playSuccessSound();
        const nextHand = playerHands[activePawn].filter((id) => id !== activeTargetCard);
        setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
        setPlayerActiveTargets((prev) => ({
          ...prev,
          [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
        }));
        showToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
      } else {
        showToast(`Moved ${activePawn.toUpperCase()} pawn to (${r}, ${c})`);
      }

      pushStateToHistory(
        grid,
        spareTile,
        lastShiftArrowId,
        activePawn,
        playerHands,
        playerActiveTargets
      );
    } else {
      showToast("Cannot move there! Paths do not connect.");
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

    // Re-construct grid from translated solver board
    const nextGrid = grid.map((row) => [...row]);
    const shapeMapRev: Record<string, Shape> = {
      I: "straight",
      L: "corner",
      T: "t-junction",
    };
    const dirMapRev: Record<number, Rotation> = {
      0: 0,
      1: 90,
      2: 180,
      3: 270,
    };

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (grid[r][c]?.isFixed) continue;
        const cell = solverBoard[r][c];
        const originalTile = grid[cell.r][cell.c] || {
          id: `movable_${Math.random()}`,
          isFixed: false,
        };
        nextGrid[r][c] = {
          ...originalTile,
          shape: shapeMapRev[cell.shape],
          rotation: dirMapRev[cell.dir],
          treasure: TREASURES.find((t) => t.id === cell.treasure),
        };
      }
    }

    // Set new spare tile
    setSpareTile({
      id: `spare_${Date.now()}`,
      shape: shapeMapRev[newSpare.shape],
      rotation: dirMapRev[newSpare.dir],
      treasure: TREASURES.find((t) => t.id === newSpare.treasure),
      isFixed: false,
    });

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
      spareTile,
      arrowId,
      activePawn,
      playerHands,
      playerActiveTargets
    );

    // Save Autosave
    saveAutosave({
      board: nextGrid,
      looseTiles: [],
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      lastShiftArrowId: arrowId,
      isGameStarted,
      gameStartState,
      pawnPositions: nextPositions,
    });
  };

  // Deal card logic
  const handleAddCard = (treasureId: string) => {
    if (playerHands[activePawn].includes(treasureId)) return;
    const nextHand = [...playerHands[activePawn], treasureId];
    setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
    if (!playerActiveTargets[activePawn]) {
      setPlayerActiveTargets((prev) => ({ ...prev, [activePawn]: treasureId }));
    }
  };

  const handleRemoveCard = (treasureId: string) => {
    const nextHand = playerHands[activePawn].filter((id) => id !== treasureId);
    setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
    setPlayerActiveTargets((prev) => ({
      ...prev,
      [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
    }));
  };

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
      activePawn,
      playerHands: { ...playerHands },
      playerActiveTargets: { ...playerActiveTargets },
      lastShiftArrowId: null,
      pawnPositions: { ...pawnPositions },
    };

    setSpareTile(looseTiles[0]);
    setLooseTiles([]);
    setIsGameStarted(true);
    setGameStartState(startState);

    pushStateToHistory(grid, looseTiles[0], null, activePawn, playerHands, playerActiveTargets);

    saveAutosave({
      board: grid,
      looseTiles: [],
      spareTile: looseTiles[0],
      activePawn,
      playerHands,
      playerActiveTargets,
      lastShiftArrowId: null,
      isGameStarted: true,
      gameStartState: startState,
      pawnPositions,
    });

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

    const nextGrid = grid.map((row) => [...row]);
    const shapeMapRev: Record<string, Shape> = {
      I: "straight",
      L: "corner",
      T: "t-junction",
    };
    const dirMapRev: Record<number, Rotation> = {
      0: 0,
      1: 90,
      2: 180,
      3: 270,
    };

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (grid[r][c]?.isFixed) continue;
        const cell = solverBoard[r][c];
        const originalTile = grid[cell.r][cell.c] || {
          id: `movable_${Math.random()}`,
          isFixed: false,
        };
        nextGrid[r][c] = {
          ...originalTile,
          shape: shapeMapRev[cell.shape],
          rotation: dirMapRev[cell.dir],
          treasure: TREASURES.find((t) => t.id === cell.treasure),
        };
      }
    }

    setGrid(nextGrid);
    setSpareTile({
      id: `spare_${Date.now()}`,
      shape: shapeMapRev[newSpare.shape],
      rotation: dirMapRev[newSpare.dir],
      treasure: TREASURES.find((t) => t.id === newSpare.treasure),
      isFixed: false,
    });

    // End coordinate
    const finalPos = turn1.endPos;
    setPawnPositions((prev) => ({
      ...prev,
      [activePawn]: { r: finalPos.r, c: finalPos.c },
    }));

    setLastShiftArrowId(turn1.arrowId);

    const activeTargetCard = playerActiveTargets[activePawn];
    const landedTreasure = nextGrid[finalPos.r][finalPos.c]?.treasure;

    if (landedTreasure && landedTreasure.id === activeTargetCard) {
      if (!isMuted) playSuccessSound();
      const nextHand = playerHands[activePawn].filter((id) => id !== activeTargetCard);
      setPlayerHands((prev) => ({ ...prev, [activePawn]: nextHand }));
      setPlayerActiveTargets((prev) => ({
        ...prev,
        [activePawn]: nextHand.length > 0 ? nextHand[0] : null,
      }));
      showToast(`Goal Achieved: Found ${landedTreasure.name}! 🏆`);
    }

    pushStateToHistory(
      nextGrid,
      spareTile,
      turn1.arrowId,
      activePawn,
      playerHands,
      playerActiveTargets
    );
  };

  // Derive active paths for overlay suggestions
  const overlaySuggestedPath = useMemo(() => {
    if (!hoveredSolution || hoveredSolution.length === 0) return null;
    return hoveredSolution[0].pawnPath as { r: number; c: number }[];
  }, [hoveredSolution]);

  const activeTargetTreasure = TREASURES.find(
    (t) => t.id === playerActiveTargets[activePawn]
  );

  return (
    <div className="h-screen bg-stone-950 text-stone-100 flex flex-col font-sans select-none relative overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />

      {showLandingPage ? (
        <div className="flex-1 flex items-center justify-center bg-[#0c0a09] p-6 relative min-h-0 overflow-y-auto z-20">
          {/* Background patterns */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute inset-0 opacity-[0.03]" style={{
              backgroundImage: 'radial-gradient(circle at 50% 50%, white 1px, transparent 1px)',
              backgroundSize: '32px 32px'
            }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
          </div>

          <div className="max-w-4xl w-full z-10 flex flex-col items-center">
            <div className="flex flex-col items-center gap-4 mb-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/30 mb-2 shadow-lg shadow-amber-500/10">
                <Compass className="w-8 h-8 text-amber-400 animate-pulse" />
              </div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight bg-gradient-to-r from-stone-200 to-theme-primary bg-clip-text text-transparent">Labyrinth Game Solver</h1>
              <p className="text-stone-400 max-w-md text-lg">Create, edit, simulate, and solve Labyrinth board game configurations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl min-h-0">
              {/* New Project */}
              <button 
                onClick={handleNewProject}
                className="group relative flex flex-col items-center text-center gap-4 p-8 rounded-2xl bg-stone-900/50 border border-stone-850 hover:border-amber-500/50 hover:bg-stone-900 transition-all cursor-pointer shadow-xl"
              >
                <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center group-hover:scale-110 group-hover:bg-amber-500/30 transition-all">
                  <Plus className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white mb-1">New Game Project</h2>
                  <p className="text-sm text-stone-400">Initialize a new board with fixed tile presets and customize it.</p>
                </div>
              </button>

              {/* Load Project */}
              <div 
                className="flex flex-col gap-4 p-6 rounded-2xl bg-stone-900/50 border border-stone-850 shadow-xl min-h-[300px] overflow-hidden"
              >
                <div className="flex items-center gap-2.5 text-left border-b border-stone-850 pb-3">
                  <div className="w-10 h-10 rounded-full bg-theme-primary-10 flex items-center justify-center">
                    <FolderOpen className="w-5 h-5 text-theme-primary" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Load Game Layout</h2>
                    <p className="text-xs text-stone-500">Pick a previously saved profile</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                  {allSlots.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center py-10">
                      <span className="text-xs text-stone-600">No saved layouts found.</span>
                      <button onClick={handleNewProject} className="text-xs text-amber-500 hover:text-amber-400 underline mt-2">
                        Start a new one now
                      </button>
                    </div>
                  ) : (
                    allSlots.map((slot) => (
                      <div
                        key={slot.key}
                        className="p-3 bg-stone-950/60 border border-stone-850/80 rounded-xl hover:border-amber-500/30 transition-all flex items-center justify-between group"
                      >
                        <div className="flex-1 min-w-0 pr-2 text-left">
                          <div className="text-xs font-bold text-stone-200 truncate">{slot.name}</div>
                          <div className="text-[10px] text-stone-500">
                            {new Date(slot.timestamp).toLocaleDateString()} at{" "}
                            {new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleLoadSlot(slot.key, slot.name)}
                          className="h-7 px-2.5 border-stone-800 hover:bg-stone-900 text-xs text-stone-200 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Upload className="w-3 h-3 text-amber-500" />
                          Load
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between border-b border-stone-800 bg-stone-950/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-theme-primary-10 border border-theme-primary-20 rounded-xl text-theme-primary">
            <Compass className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-stone-200 to-theme-primary bg-clip-text text-transparent flex items-center">
              Labyrinth Game Solver
              {currentSlotName && (
                <span className="ml-3 px-2 py-0.5 rounded-full bg-white/10 text-xs font-semibold text-stone-300 border border-stone-850">
                  {currentSlotName}
                </span>
              )}
            </h1>
            <p className="text-xs text-stone-400">
              Desktop Edition {lastSavedTime ? `• Last Saved: ${new Date(lastSavedTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
            </p>
          </div>
        </div>

        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          {/* New Project */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleNewProject}
            className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 h-8"
            title="Start New Game Layout"
          >
            <Plus className="w-3.5 h-3.5 text-theme-primary" />
            <span className="text-xs hidden sm:inline">New Project</span>
          </Button>

          {/* Load Project */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (!isMuted) playClickSound();
              setIsSettingsOpen(true);
            }}
            className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 h-8"
            title="Load Saved Configuration"
          >
            <FolderOpen className="w-3.5 h-3.5 text-theme-primary" />
            <span className="text-xs hidden sm:inline">Load Project</span>
          </Button>

          {/* Exit to Menu */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (!isMuted) playClickSound();
              setShowLandingPage(true);
            }}
            className="text-stone-400 hover:text-stone-200 gap-1.5 h-8 px-2"
            title="Exit to Main Menu"
          >
            <Home className="w-3.5 h-3.5" />
            <span className="text-xs hidden sm:inline">Menu</span>
          </Button>

          <div className="w-px h-4 bg-stone-800 mx-1" />

          {/* Quick Save button */}
          {currentSlotName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSaveActiveProject}
              className="border-stone-800 hover:bg-stone-900 text-stone-300 gap-1.5 h-8 animate-fade-in"
              title="Quick Save Project"
            >
              <Save className="w-3.5 h-3.5 text-theme-primary" />
              <span className="text-xs">Save</span>
            </Button>
          )}
          {/* Board Rotation */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              if (!isMuted) playClickSound();
              setBoardRotation((prev) => (prev + 90) % 360);
            }}
            className="border-stone-800 hover:bg-stone-900 text-stone-300 animate-fade-in"
            title="Rotate Board Perspective (90° Clockwise)"
          >
            <RotateCw className="w-4 h-4" />
          </Button>

          {/* Settings button trigger */}
          <Dialog open={isSettingsOpen} onOpenChange={(open) => {
            setIsSettingsOpen(open);
            if (!open) {
              setSaveName("");
              setPeekSlotKey(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (!isMuted) playClickSound();
                }}
                className="border-stone-800 hover:bg-stone-900 text-stone-300"
                title="Settings & Saves"
              >
                <Settings className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[90vw] max-w-[90vw] h-[90vh] max-h-[90vh] bg-stone-900 border-stone-800 text-stone-100 shadow-2xl p-6 rounded-2xl flex flex-col overflow-hidden">
              <DialogHeader className="shrink-0 border-b border-stone-800 pb-3">
                <DialogTitle className="text-xl font-bold tracking-tight text-theme-primary flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <Settings className="w-5 h-5 text-theme-primary" />
                    Settings & Save Slots
                  </span>
                  <span className="text-[10px] text-stone-400 font-normal mr-6">
                    Labyrinth Game Solver v1.0.1
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                {/* Left Side: General Preferences & Preview */}
                <div className="flex flex-col gap-4 overflow-y-auto pr-1">
                  <div className="p-4 bg-stone-950/40 border border-stone-850 rounded-xl flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-stone-200">System Preferences</h3>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-stone-300">Retro Audio Oscillators</span>
                      <Button
                        variant={isMuted ? "outline" : "default"}
                        onClick={handleToggleMute}
                        className={isMuted ? "border-stone-800" : "bg-theme-primary text-stone-950 font-bold hover:bg-theme-primary-hover"}
                      >
                        {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                        {isMuted ? "Muted" : "Active"}
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-stone-950/40 border border-stone-850 rounded-xl flex flex-col gap-3">
                    <h3 className="text-sm font-semibold text-stone-200">App Theme Colors</h3>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: "amber", name: "Amber", class: "bg-amber-500" },
                        { id: "neon", name: "Neon", class: "bg-lime-500" },
                        { id: "ice", name: "Ice", class: "bg-sky-500" },
                        { id: "dracula", name: "Dracula", class: "bg-purple-500" },
                        { id: "rose", name: "Rose", class: "bg-pink-500" },
                        { id: "emerald", name: "Emerald", class: "bg-emerald-500" },
                        { id: "sapphire", name: "Sapphire", class: "bg-blue-500" },
                        { id: "sunset", name: "Sunset", class: "bg-orange-500" },
                        { id: "gold", name: "Gold", class: "bg-yellow-500" },
                        { id: "nord", name: "Nord", class: "bg-cyan-500" },
                      ].map((t) => (
                        <button
                          key={t.id}
                          onClick={() => {
                            if (!isMuted) playClickSound();
                            setActiveTheme(t.id);
                          }}
                          className={`flex items-center gap-1.5 p-2 rounded-lg border text-xs font-semibold justify-start transition-all cursor-pointer ${
                            activeTheme === t.id
                              ? "border-theme-primary bg-theme-primary-10 text-theme-primary"
                              : "border-stone-800 bg-stone-950/40 hover:bg-stone-900 text-stone-300"
                          }`}
                        >
                          <span className={`w-3 h-3 rounded-full ${t.class}`} />
                          {t.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 bg-stone-950/40 border border-stone-850 rounded-xl flex flex-col gap-2.5 text-xs text-stone-400">
                    <h3 className="text-sm font-semibold text-stone-200">File Storage Information</h3>
                    <div>
                      <div className="font-semibold text-stone-300">Local Cache Directory:</div>
                      <div className="font-mono bg-stone-950 p-2 rounded-lg border border-stone-850 select-text break-all mt-1">
                        {navigator.userAgent.toLowerCase().includes('win') 
                          ? '%APPDATA%\\Labyrinth-Game-Solver\\Local Storage\\' 
                          : '~/Library/Application Support/Labyrinth-Game-Solver/Local Storage/'}
                      </div>
                    </div>
                    <div className="mt-1 leading-normal">
                      Layout presets and custom slots are persisted securely locally within your sandboxed app configurations folder.
                    </div>
                  </div>

                  {/* Peek view preview block */}
                  {peekedState ? (
                    <div className="p-4 bg-stone-950 border border-stone-850 rounded-xl flex flex-col gap-3 items-center shadow-inner mt-auto">
                      <div className="text-xs text-stone-400 font-bold self-start flex items-center gap-1.5">
                        <Eye className="w-3.5 h-3.5 text-theme-primary" />
                        Previewing Saved Board:
                      </div>
                      <div className="grid grid-cols-7 grid-rows-7 gap-[3px] p-2 bg-stone-900 border border-stone-800 rounded-xl">
                        {peekedState.board.map((row: any[], rIdx: number) =>
                          row.map((cell: any, cIdx: number) => {
                            let hasPawn = null;
                            if (peekedState.pawnPositions) {
                              const found = Object.entries(peekedState.pawnPositions).find(
                                ([_, pos]: any) => pos.r === rIdx && pos.c === cIdx
                              );
                              if (found) hasPawn = found[0];
                            }
                            return (
                              <div
                                key={`${rIdx}-${cIdx}`}
                                className="w-8 h-8 rounded-sm overflow-hidden flex items-center justify-center relative bg-stone-950 border border-stone-850/40"
                              >
                                {cell ? (
                                  <Tile
                                    tile={cell}
                                    disabled={true}
                                    boardRotation={0}
                                    className="w-full h-full pointer-events-none shadow-none rounded-none border-0 text-[3px]"
                                  />
                                ) : (
                                  <div className="w-full h-full border border-dashed border-stone-800 bg-stone-950/20" />
                                )}
                                {hasPawn && (
                                  <div
                                    className={`absolute w-2 h-2 rounded-full ring-[1.5px] ring-white shadow z-20 ${
                                      hasPawn === "red"
                                        ? "bg-red-500"
                                        : hasPawn === "blue"
                                        ? "bg-blue-500"
                                        : hasPawn === "green"
                                        ? "bg-green-500"
                                        : "bg-yellow-400"
                                    }`}
                                  />
                                )}
                              </div>
                            );
                          })
                        )}
                      </div>
                      <div className="text-[10px] text-stone-500 text-center font-medium">
                        Renders the actual tile corridor shapes, start spawns, and targets in miniature.
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-stone-950/20 border border-stone-850 border-dashed rounded-xl h-36 flex flex-col items-center justify-center text-center text-xs text-stone-500 mt-auto">
                      Click the eye icon on a save slot to peek at its layout
                    </div>
                  )}
                </div>

                {/* Right Side: Save & Load Profile Slots */}
                <div className="flex flex-col gap-4 overflow-hidden h-full">
                  <div className="flex flex-col gap-2 shrink-0">
                    <h3 className="text-sm font-semibold text-stone-200">Save Current Layout</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Slot Name (e.g. Map Trial 1)..."
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        className="flex-1 bg-stone-950 border border-stone-800 hover:border-stone-750 text-stone-100 rounded-xl px-3 py-2 text-sm outline-none focus:border-theme-primary transition-colors"
                      />
                      <Button
                        onClick={() => {
                          if (!saveName.trim()) return;
                          const currentAppState = {
                            board: grid,
                            spareTile,
                            looseTiles,
                            activePawn,
                            playerHands,
                            playerActiveTargets,
                            lastShiftArrowId,
                            isGameStarted,
                            gameStartState,
                            pawnPositions,
                          };
                          const success = saveSlot(saveName, currentAppState);
                          if (success) {
                            showToast("Game Saved Successfully!");
                            setCurrentSlotName(saveName);
                            setLastSavedTime(Date.now());
                            setSaveName("");
                          }
                        }}
                        disabled={!saveName.trim()}
                        className="bg-theme-primary text-stone-950 font-bold hover:bg-theme-primary-hover rounded-xl cursor-pointer"
                      >
                        <Download className="w-4 h-4 mr-1.5" />
                        Save
                      </Button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-hidden flex flex-col gap-2 min-h-0">
                    <h3 className="text-sm font-semibold text-stone-200">Saved Game Profiles</h3>
                    <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 min-h-0">
                      {allSlots.length === 0 ? (
                        <div className="text-xs text-stone-500 py-6 text-center">
                          No saved board layouts found.
                        </div>
                      ) : (
                        allSlots.map((slot) => (
                          <div
                            key={slot.key}
                            className={`p-3 bg-stone-950/50 border rounded-xl flex items-center justify-between transition-all group ${
                              peekSlotKey === slot.key ? "border-theme-primary bg-theme-primary-10" : "border-stone-800"
                            }`}
                          >
                            <div className="flex-1 min-w-0 pr-2">
                              <div className="text-xs font-bold text-stone-200 truncate">{slot.name}</div>
                              <div className="text-[10px] text-stone-500">
                                {new Date(slot.timestamp).toLocaleDateString()} at{" "}
                                {new Date(slot.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {/* Peek Eye button */}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (!isMuted) playClickSound();
                                  setPeekSlotKey(peekSlotKey === slot.key ? null : slot.key);
                                }}
                                className={`w-7 h-7 hover:bg-stone-900 ${peekSlotKey === slot.key ? "text-theme-primary" : "text-stone-400"}`}
                                title="Peek Layout"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>

                              {/* Load button */}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleLoadSlot(slot.key, slot.name)}
                                className="h-7 px-2 border-stone-850 hover:bg-stone-900 text-xs text-stone-200 rounded-lg cursor-pointer flex items-center gap-1"
                              >
                                <Upload className="w-3 h-3 text-amber-500" />
                                Load
                              </Button>

                              {/* Delete button */}
                              {slot.key !== AUTOSAVE_KEY && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => {
                                    if (!isMuted) playClickSound();
                                    deleteSlot(slot.key);
                                    if (peekSlotKey === slot.key) setPeekSlotKey(null);
                                    showToast("Save Slot Deleted");
                                  }}
                                  className="w-7 h-7 text-stone-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer"
                                  title="Delete Save"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Audio toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={handleToggleMute}
            className="border-stone-800 hover:bg-stone-900"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-stone-400" /> : <Volume2 className="w-4 h-4 text-theme-primary" />}
          </Button>

          {/* Undo/Redo */}
          <Button
            variant="outline"
            size="icon"
            disabled={!canUndo}
            onClick={() => {
              if (!isMuted) playClickSound();
              undo((state: any) => {
                setGrid(state.board);
                setSpareTile(state.spareTile);
                setLastShiftArrowId(state.lastShiftArrowId);
                setActivePawn(state.activePawn);
                setPlayerHands(state.playerHands);
                setPlayerActiveTargets(state.playerActiveTargets);
                if (state.pawnPositions) {
                  setPawnPositions(state.pawnPositions);
                }
              });
            }}
            className="border-stone-800 hover:bg-stone-900 disabled:opacity-30"
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            disabled={!canRedo}
            onClick={() => {
              if (!isMuted) playClickSound();
              redo((state: any) => {
                setGrid(state.board);
                setSpareTile(state.spareTile);
                setLastShiftArrowId(state.lastShiftArrowId);
                setActivePawn(state.activePawn);
                setPlayerHands(state.playerHands);
                setPlayerActiveTargets(state.playerActiveTargets);
                if (state.pawnPositions) {
                  setPawnPositions(state.pawnPositions);
                }
              });
            }}
            className="border-stone-800 hover:bg-stone-900 disabled:opacity-30"
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>

          {/* Reset presets */}
          {!isGameStarted && (
            <Button
              variant="outline"
              onClick={resetBoardToInitialPresets}
              className="border-stone-800 hover:bg-stone-900 gap-2"
            >
              <RefreshCcw className="w-4 h-4" />
              Reset Board
            </Button>
          )}

          {/* Start/End game */}
          {isGameStarted ? (
            <Button variant="destructive" onClick={handleEndGame} className="gap-2">
              <Unlock className="w-4 h-4" />
              Edit Board
            </Button>
          ) : (
            <Button
              onClick={handleStartGame}
              disabled={looseTiles.length !== 1}
              className="bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-semibold gap-2 disabled:bg-stone-800 disabled:text-stone-500 shadow-lg shadow-theme-glow"
            >
              <Lock className="w-4 h-4" />
              Start Game
            </Button>
          )}
        </div>
      </header>

      {/* Main Panel layout */}
      <main className="flex-1 flex flex-col lg:flex-row relative z-10 w-full max-w-[1600px] mx-auto p-4 md:p-6 gap-6 lg:gap-8 justify-center overflow-y-auto lg:overflow-hidden min-h-0">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* Game Board Section */}
          <div className="flex-1 lg:flex-[1.5] w-full flex min-w-0 min-h-0 items-center justify-center relative">
            <div className="relative aspect-square w-full lg:w-auto lg:h-full max-w-full max-h-full flex-shrink-0">
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
                grid={grid}
                pawnPositions={pawnPositions}
                onCellClick={handleCellClick}
                onTileClick={handleTileClick}
                isGameStarted={isGameStarted}
                activePawn={activePawn}
                lastShiftArrowId={lastShiftArrowId}
                onArrowClick={handleSlide}
                hoveredPath={overlaySuggestedPath}
                hoveredSolutionArrow={hoveredSolution ? hoveredSolution[0].arrowId : null}
                boardRotation={boardRotation}
              />
            </div>
          </div>

          {/* Sidebar Editor / Play Control panel */}
          <div className="w-full lg:w-[400px] xl:w-[440px] flex flex-col flex-shrink-0 min-h-0 lg:h-full">
            {isGameStarted ? (
              /* Gameplay & Solver Controls */
              <div className="flex-1 flex flex-col min-h-0 gap-4 bg-stone-900/50 border border-stone-800 rounded-2xl p-5 backdrop-blur-xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-theme-primary flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-theme-primary" />
                    Solver Suggestions
                  </h2>
                  <div className="text-xs px-2 py-1 bg-stone-800 rounded text-stone-400">
                    Turns:
                    <select
                      value={maxTurns}
                      onChange={(e) => setMaxTurns(parseInt(e.target.value))}
                      className="ml-1 bg-stone-900 border border-stone-700 text-stone-200 rounded text-xs focus:outline-none"
                    >
                      <option value={1}>1</option>
                      <option value={2}>2</option>
                      <option value={3}>3</option>
                    </select>
                  </div>
                </div>

                {/* Active target details */}
                <div className="p-4 bg-stone-950/60 border border-stone-800/80 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-stone-950 ${
                        PAWNS.find((p) => p.id === activePawn)?.colorClass || "bg-red-500"
                      }`}
                    >
                      {activePawn[0].toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs text-stone-400">Active Pawn's Turn</div>
                      <div className="font-semibold text-stone-100 flex items-center gap-1">
                        Target:{" "}
                        <span className="text-amber-500">
                          {activeTargetTreasure ? activeTargetTreasure.name : "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* Spare Tile display in Panel */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="text-[10px] text-stone-500">Spare (Click to rotate)</div>
                    <Tile
                      tile={spareTile}
                      onClick={() => handleTileClick(spareTile.id)}
                      className="w-12 h-12 border-amber-500/40"
                    />
                  </div>
                </div>

                {/* List solutions */}
                <div className="flex-1 overflow-y-auto min-h-0 pr-2 flex flex-col gap-2">
                  {isLoadingSolutions ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-stone-500 gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-amber-500" />
                      Computing paths...
                    </div>
                  ) : solutions.length > 0 ? (
                    solutions.map((sol, index) => {
                      const firstStep = sol[0];
                      const isFallback = sol.isFallback;
                      return (
                        <div
                          key={index}
                          onMouseEnter={() => setHoveredSolution(sol)}
                          onMouseLeave={() => setHoveredSolution(null)}
                          className={`p-3 bg-stone-950/40 border border-stone-800/60 hover:border-amber-500/40 rounded-xl transition-all flex items-center justify-between cursor-pointer group ${
                            isFallback ? "opacity-60 hover:opacity-100" : ""
                          }`}
                        >
                          <div>
                            <div className="text-xs font-semibold text-stone-300">
                              {isFallback ? (
                                <span className="text-stone-400">Fallback Target Prox</span>
                              ) : (
                                <span className="text-green-500">Goal Connection Found</span>
                              )}
                            </div>
                            <div className="text-xs text-stone-400 mt-1">
                              Action: Slide {firstStep.arrowId.replace("-", " ")} ({firstStep.rotation}° Rot)
                            </div>
                            <div className="text-[10px] text-stone-500">
                              Turns needed: {sol.length} • Safety: {sol.safetyScore}%
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleExecuteSolution(sol);
                            }}
                            className="bg-amber-500/10 group-hover:bg-amber-500 text-amber-500 group-hover:text-stone-950 border border-amber-500/20 group-hover:border-transparent font-medium text-xs px-2.5 py-1 rounded"
                          >
                            Execute
                          </Button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-stone-600 text-sm">
                      No paths found. Check targets or max turns.
                    </div>
                  )}
                </div>

                {/* Player turns toggler */}
                <div className="border-t border-stone-800 pt-4">
                  <div className="text-xs text-stone-400 mb-2 font-medium">Select Player:</div>
                  <div className="grid grid-cols-4 gap-2">
                    {PAWNS.map((p) => (
                      <Button
                        key={p.id}
                        variant={activePawn === p.id ? "default" : "outline"}
                        onClick={() => {
                          if (!isMuted) playClickSound();
                          setActivePawn(p.id);
                        }}
                        className={`border-stone-800 ${
                          activePawn === p.id
                            ? p.colorClass + " text-stone-950 font-bold"
                            : "hover:bg-stone-900 text-stone-200"
                        }`}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Setup Config Sidepanel */
              <div className="flex-1 flex flex-col min-h-0 gap-4 bg-stone-900/50 border border-stone-800 rounded-2xl p-5 backdrop-blur-xl">
                {/* Tabs */}
                <div className="flex border-b border-stone-800 pb-2 gap-2">
                  <Button
                    variant={setupTab === "tiles" ? "default" : "ghost"}
                    onClick={() => setSetupTab("tiles")}
                    className={`flex-1 rounded-lg ${
                      setupTab === "tiles" ? "bg-amber-500 text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-100"
                    }`}
                  >
                    <Layers className="w-4 h-4 mr-2" />
                    Tiles
                  </Button>
                  <Button
                    variant={setupTab === "pawns" ? "default" : "ghost"}
                    onClick={() => setSetupTab("pawns")}
                    className={`flex-1 rounded-lg ${
                      setupTab === "pawns" ? "bg-amber-500 text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-100"
                    }`}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Pawns
                  </Button>
                  <Button
                    variant={setupTab === "cards" ? "default" : "ghost"}
                    onClick={() => setSetupTab("cards")}
                    className={`flex-1 rounded-lg ${
                      setupTab === "cards" ? "bg-amber-500 text-stone-950 font-semibold" : "text-stone-400 hover:text-stone-100"
                    }`}
                  >
                    <Compass className="w-4 h-4 mr-2" />
                    Cards
                  </Button>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-hidden min-h-0">
                  {setupTab === "tiles" && (
                    <div className="flex flex-col gap-3 h-full overflow-hidden min-h-0">
                      <Button
                        onClick={handleRandomizeBoard}
                        className="w-full bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-theme-glow cursor-pointer transition-colors"
                      >
                        <Sparkles className="w-4 h-4" />
                        Randomize Board
                      </Button>
                      <div className="flex-1 overflow-hidden">
                        <SidePanel tiles={looseTiles} onTileClick={handleTileClick} />
                      </div>
                    </div>
                  )}

                  {setupTab === "pawns" && (
                    <div className="flex flex-col gap-4 h-full overflow-y-auto min-h-0">
                      <div className="text-sm text-stone-400">
                        Choose a pawn and click a cell on the board grid to jump and place that pawn.
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {PAWNS.map((p) => (
                          <Button
                            key={p.id}
                            variant={activePawnPlacementColor === p.id ? "default" : "outline"}
                            onClick={() => setActivePawnPlacementColor(p.id)}
                            className={`border-stone-800 ${
                              activePawnPlacementColor === p.id
                                ? p.colorClass + " text-stone-950 font-bold"
                                : "hover:bg-stone-900 text-stone-200"
                            }`}
                          >
                            {p.name}
                          </Button>
                        ))}
                      </div>
                      <div className="mt-4 p-4 border border-stone-800/80 bg-stone-950/40 rounded-xl text-xs text-stone-400 flex flex-col gap-2">
                        <div className="font-semibold text-stone-200">Current Positions:</div>
                        {Object.entries(pawnPositions).map(([color, pos]) => (
                          <div key={color} className="flex justify-between">
                            <span className="capitalize">{color}:</span>
                            <span>
                              Row {pos.r}, Col {pos.c}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {setupTab === "cards" && (
                    <div className="flex flex-col gap-4 h-full overflow-hidden min-h-0">
                      <div className="flex items-center gap-2">
                        <div className="text-sm text-stone-400">Select player active hand:</div>
                        <div className="flex gap-1 ml-auto">
                          {["red", "blue", "green", "yellow"].map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                if (!isMuted) playClickSound();
                                setActivePawn(p);
                              }}
                              className={`w-6 h-6 rounded-full font-bold text-[10px] flex items-center justify-center ${
                                PAWNS.find((pw) => pw.id === p)?.colorClass || "bg-red-500"
                              } ${activePawn === p ? "ring-2 ring-white" : "opacity-50"}`}
                            >
                              {p[0].toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="p-3 bg-stone-950/60 border border-stone-800/80 rounded-xl">
                        <div className="text-xs text-stone-400">
                          Player <span className="capitalize text-amber-500 font-bold">{activePawn}</span>'s hand list (
                          {playerHands[activePawn].length} cards):
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {playerHands[activePawn].map((cardId) => {
                            const name = TREASURES.find((t) => t.id === cardId)?.name || cardId;
                            return (
                              <div
                                key={cardId}
                                className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 font-semibold px-2 py-0.5 rounded flex items-center gap-1"
                              >
                                {name}
                                <button
                                  onClick={() => handleRemoveCard(cardId)}
                                  className="text-stone-400 hover:text-stone-200"
                                >
                                  ×
                                </button>
                              </div>
                            );
                          })}
                          {playerHands[activePawn].length === 0 && (
                            <span className="text-[10px] text-stone-600">No cards in hand. Click below to add.</span>
                          )}
                        </div>
                      </div>

                      {/* Add cards list */}
                      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
                        <div className="text-xs text-stone-400 mb-2 font-medium">Add Treasure Cards:</div>
                        <div className="grid grid-cols-2 gap-1.5 pb-8">
                          {TREASURES.map((t) => {
                            const alreadyInHand = playerHands[activePawn].includes(t.id);
                            return (
                              <Button
                                key={t.id}
                                size="sm"
                                variant={alreadyInHand ? "secondary" : "outline"}
                                onClick={() => (alreadyInHand ? handleRemoveCard(t.id) : handleAddCard(t.id))}
                                className={`text-[10px] py-1 border-stone-800 justify-start h-8 px-2 truncate ${
                                  alreadyInHand
                                    ? "bg-amber-500/20 border-amber-500/40 text-amber-500"
                                    : "hover:bg-stone-900 text-stone-300"
                                }`}
                              >
                                {t.name}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
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
                className="shadow-2xl shadow-black ring-4 ring-amber-500/50"
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </main>
    </>
  )}

      {/* Floating Notification Toast */}
      {toastText && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 bg-stone-900 border border-amber-500/40 text-amber-300 font-semibold text-sm rounded-full shadow-2xl shadow-black z-50 animate-bounce flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {toastText}
        </div>
      )}
    </div>
  );
}
