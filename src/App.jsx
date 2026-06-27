import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import './App.css';
import { Compass, RotateCw, Save, FolderOpen, RefreshCcw, Undo2, Redo2, Wrench, Edit3, Lock, Unlock, Volume2, VolumeX } from 'lucide-react';
import Board from './components/Board';
import ControlPanel from './components/ControlPanel';
import Tile from './components/Tile';
import TileEditorModal from './components/TileEditorModal';
import { TREASURES, FIXED_TILES } from './constants';
import { 
  cloneBoard, 
  parseArrowId, 
  executeSlideInGrid, 
  isOppositeArrow,
  getReachableCells
} from './solver';
import { 
  playClickSound, 
  playSlideSound, 
  playRotateSound, 
  playSuccessSound,
  playPawnMoveSound
} from './utils/audio';
import { useLabyrinthHistory } from './hooks/useLabyrinthHistory';
import { useLabyrinthStorage } from './hooks/useLabyrinthStorage';

import clsx from 'clsx';

export default function App() {
  // Game States
  const [board, setBoard] = useState([]);
  const [spareTile, setSpareTile] = useState({ shape: 'L', dir: 0, treasure: '', isFixed: false, pawns: [] });
  const [activePawn, setActivePawn] = useState('red');
  const [lastShiftArrowId, setLastShiftArrowId] = useState(null);
  const [maxTurns, setMaxTurns] = useState(2);

  // Game Setup vs Play Mode States
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameStartState, setGameStartState] = useState(null);
  const [reachableCells, setReachableCells] = useState([]);
  const [setupStep, setSetupStep] = useState(1);

  // Multi-player Hands & Active Targets
  const [playerHands, setPlayerHands] = useState({ red: [], blue: [], green: [], yellow: [] });
  const [playerActiveTargets, setPlayerActiveTargets] = useState({ red: null, blue: null, green: null, yellow: null });

  // Convenient derived states
  const handCards = useMemo(() => playerHands[activePawn] || [], [playerHands, activePawn]);
  const activeTarget = playerActiveTargets[activePawn] || null;

  // Interaction Tools
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'rotate', 'paint-I', 'paint-L', 'paint-T'
  const [selectedTileCoord, setSelectedTileCoord] = useState(null); // Coordinate of tile currently open in the modal
  const [showModal, setShowModal] = useState(false);

  // Audio Muted State
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem('labyrinth_audio_muted') === 'true');

  // Toggle Audio Mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('labyrinth_audio_muted', String(nextMuted));
    showToast(nextMuted ? 'Sound effects muted 🔇' : 'Sound effects unmuted 🔊');
  };

  // Solver Solutions & Visual Highlights
  const [solutions, setSolutions] = useState([]);
  const [hoveredSolution, setHoveredSolution] = useState(null);
  const [dragOverArrowId, setDragOverArrowId] = useState(null);
  const [isLoadingSolutions, setIsLoadingSolutions] = useState(false);

  // Web Worker for Solver
  const workerRef = useRef(null);

  // Instantiate Hooks
  const { pushStateToHistory, resetHistory, undo, redo, canUndo, canRedo } = useLabyrinthHistory(null);
  const { slots, saveSlot, loadSlot, deleteSlot, saveAutosave, loadAutosave } = useLabyrinthStorage();

  // Toast System
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
  }, []);

  // Load layout state from LocalStorage
  const loadStateFromLocalStorage = useCallback((quiet = false) => {
    try {
      const state = loadAutosave();
      if (!state || !state.board || !state.spareTile) return false;

      setBoard(state.board);
      setSpareTile(state.spareTile);
      setActivePawn(state.activePawn || 'red');
      setPlayerHands(state.playerHands || { red: [], blue: [], green: [], yellow: [] });
      setPlayerActiveTargets(state.playerActiveTargets || { red: null, blue: null, green: null, yellow: null });
      setLastShiftArrowId(state.lastShiftArrowId || null);
      setIsGameStarted(state.isGameStarted || false);
      setGameStartState(state.gameStartState || null);
      
      // Record initial history
      const record = {
        board: state.board,
        spareTile: state.spareTile,
        lastShiftArrowId: state.lastShiftArrowId || null,
        activePawn: state.activePawn || 'red',
        playerHands: state.playerHands || { red: [], blue: [], green: [], yellow: [] },
        playerActiveTargets: state.playerActiveTargets || { red: null, blue: null, green: null, yellow: null }
      };
      resetHistory(record);

      if (!quiet) {
        playSuccessSound();
        showToast('Layout state loaded successfully! 📂');
      }
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  }, [loadAutosave, resetHistory, showToast]);

  useEffect(() => {
    if (toast.visible) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, visible: false }));
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast.visible]);

  // Generate board and spare state
  const generateInitialPreset = (shouldShuffle = true) => {
    const tempBoard = Array(7).fill(null).map((_, r) => 
      Array(7).fill(null).map((_, c) => ({
        r,
        c,
        shape: 'I',
        dir: 0,
        treasure: null,
        isFixed: false,
        pawns: []
      }))
    );

    // Apply fixed configurations
    FIXED_TILES.forEach(ft => {
      tempBoard[ft.r][ft.c].shape = ft.shape;
      tempBoard[ft.r][ft.c].dir = ft.dir;
      tempBoard[ft.r][ft.c].treasure = ft.treasure;
      tempBoard[ft.r][ft.c].isFixed = true;
      tempBoard[ft.r][ft.c].pawns = ft.pawns ? [...ft.pawns] : [];
    });

    // 34 Movable Board Tiles
    const movablePool = [
      ...Array(12).fill(null).map(() => ({ shape: 'I', treasure: null })),
      ...Array(10).fill(null).map(() => ({ shape: 'L', treasure: null })),
      { shape: 'L', treasure: 'spider' },
      { shape: 'L', treasure: 'bat' },
      { shape: 'L', treasure: 'owl' },
      { shape: 'L', treasure: 'mouse' },
      { shape: 'L', treasure: 'lizard' },
      { shape: 'L', treasure: 'butterfly' },
      { shape: 'T', treasure: 'dragon' },
      { shape: 'T', treasure: 'ghost' },
      { shape: 'T', treasure: 'backpack' },
      { shape: 'T', treasure: 'compass' },
      { shape: 'T', treasure: 'horn' },
      { shape: 'T', treasure: 'oldkey' }
    ];

    if (shouldShuffle) {
      // Fisher-Yates Shuffle
      for (let i = movablePool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [movablePool[i], movablePool[j]] = [movablePool[j], movablePool[i]];
      }
    }

    let poolIdx = 0;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (!tempBoard[r][c].isFixed) {
          const item = movablePool[poolIdx++];
          tempBoard[r][c].shape = item.shape;
          tempBoard[r][c].treasure = item.treasure;
          tempBoard[r][c].dir = shouldShuffle ? Math.floor(Math.random() * 4) : 0;
        }
      }
    }

    const spare = {
      shape: movablePool[poolIdx].shape,
      dir: shouldShuffle ? Math.floor(Math.random() * 4) : 0,
      treasure: movablePool[poolIdx].treasure || '',
      isFixed: false,
      pawns: []
    };

    return { initialBoard: tempBoard, initialSpare: spare };
  };

  // Setup Initial Game Board & Initialize Web Worker
  useEffect(() => {
    try {
      // Spawn solver web worker
      workerRef.current = new Worker(
        new URL('./solver.worker.js', import.meta.url),
        { type: 'module' }
      );

      workerRef.current.onmessage = (e) => {
        const { success, solutions: computed, error } = e.data;
        if (success) {
          setSolutions(computed || []);
        } else {
          console.error('Solver worker failed:', error);
        }
        setIsLoadingSolutions(false);
      };
    } catch (workerError) {
      console.warn("Could not start Web Worker. Pathfinder solver will not run on background thread.", workerError);
    }

    // Hydrate state from localStorage or generate defaults
    const success = loadStateFromLocalStorage(true);
    if (!success) {
      const { initialBoard, initialSpare } = generateInitialPreset(true);
      setBoard(initialBoard);
      setSpareTile(initialSpare);
      setLastShiftArrowId(null);
      setPlayerHands({ red: [], blue: [], green: [], yellow: [] });
      setPlayerActiveTargets({ red: null, blue: null, green: null, yellow: null });
      
      const startState = {
        board: initialBoard,
        spareTile: initialSpare,
        activePawn: 'red',
        playerHands: { red: [], blue: [], green: [], yellow: [] },
        playerActiveTargets: { red: null, blue: null, green: null, yellow: null },
        lastShiftArrowId: null
      };
      resetHistory(startState);
    }

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, [loadStateFromLocalStorage, resetHistory]);

  // Compute solver solutions dynamically using Web Worker (prevents main thread freeze!)
  useEffect(() => {
    if (board.length === 0 || !workerRef.current) return;

    // Locate active pawn
    let pawnPos = null;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c].pawns && board[r][c].pawns.includes(activePawn)) {
          pawnPos = { r, c };
          break;
        }
      }
    }

    if (!pawnPos || handCards.length === 0) {
      setSolutions([]);
      return;
    }

    setIsLoadingSolutions(true);
    workerRef.current.postMessage({
      board,
      spareTile,
      pawnPos,
      handCards,
      lastShiftArrowId,
      maxTurns
    });
  }, [board, spareTile, activePawn, handCards, lastShiftArrowId, maxTurns]);

  // Compute reachable cells for active player in play mode
  useEffect(() => {
    if (!isGameStarted || board.length === 0) {
      setReachableCells([]);
      return;
    }
    let pawnPos = null;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (board[r][c].pawns && board[r][c].pawns.includes(activePawn)) {
          pawnPos = { r, c };
          break;
        }
      }
    }
    if (pawnPos) {
      const { cells } = getReachableCells(board, pawnPos.r, pawnPos.c);
      setReachableCells(cells);
    } else {
      setReachableCells([]);
    }
  }, [board, activePawn, isGameStarted]);

  const handleNextStep = () => {
    playClickSound();
    if (setupStep < 6) {
      setSetupStep(prev => prev + 1);
    } else if (setupStep === 6) {
      handleStartGame();
    }
  };

  const handlePrevStep = () => {
    playClickSound();
    if (setupStep > 1) {
      setSetupStep(prev => prev - 1);
    }
  };

  const handleStartGame = () => {
    playSuccessSound();
    const currentSetup = {
      board: cloneBoard(board),
      spareTile: { ...spareTile },
      activePawn,
      playerHands: JSON.parse(JSON.stringify(playerHands)),
      playerActiveTargets: { ...playerActiveTargets },
      lastShiftArrowId
    };
    setGameStartState(currentSetup);
    setIsGameStarted(true);
    
    // Save to autosave slot
    saveAutosave({
      board,
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      lastShiftArrowId,
      isGameStarted: true,
      gameStartState: currentSetup
    });
    
    showToast('Game Started! Board locked. Click to move pawn legally along corridors. 🎮');
  };

  const handleEndGame = () => {
    playClickSound();
    setIsGameStarted(false);
    setSetupStep(6);
    showToast('Game ended. Board editing unlocked! 🔧');
  };

  const handleRestartGame = () => {
    if (!gameStartState) {
      showToast('No game start state saved.');
      return;
    }
    playSuccessSound();
    const setup = gameStartState;
    setBoard(cloneBoard(setup.board));
    setSpareTile({ ...setup.spareTile });
    setActivePawn(setup.activePawn);
    setPlayerHands(setup.playerHands);
    setPlayerActiveTargets(setup.playerActiveTargets);
    setLastShiftArrowId(setup.lastShiftArrowId);

    const record = {
      board: cloneBoard(setup.board),
      spareTile: { ...setup.spareTile },
      lastShiftArrowId: setup.lastShiftArrowId,
      activePawn: setup.activePawn,
      playerHands: JSON.parse(JSON.stringify(setup.playerHands)),
      playerActiveTargets: { ...setup.playerActiveTargets }
    };
    resetHistory(record);
    showToast('Game restarted back to setup starting configuration! 🔄');
  };

  const handleClearBoard = () => {
    playClickSound();
    const tempBoard = Array(7).fill(null).map((_, r) => 
      Array(7).fill(null).map((_, c) => ({
        r,
        c,
        shape: 'I',
        dir: 0,
        treasure: null,
        isFixed: false,
        pawns: []
      }))
    );

    FIXED_TILES.forEach(ft => {
      tempBoard[ft.r][ft.c].shape = ft.shape;
      tempBoard[ft.r][ft.c].dir = ft.dir;
      tempBoard[ft.r][ft.c].treasure = ft.treasure;
      tempBoard[ft.r][ft.c].isFixed = true;
      tempBoard[ft.r][ft.c].pawns = ft.pawns ? [...ft.pawns] : [];
    });

    const spare = {
      shape: 'I',
      dir: 0,
      treasure: '',
      isFixed: false,
      pawns: []
    };

    const emptyHands = { red: [], blue: [], green: [], yellow: [] };
    const emptyTargets = { red: null, blue: null, green: null, yellow: null };

    setBoard(tempBoard);
    setSpareTile(spare);
    setLastShiftArrowId(null);
    setPlayerHands(emptyHands);
    setPlayerActiveTargets(emptyTargets);

    const startState = {
      board: tempBoard,
      spareTile: spare,
      activePawn: 'red',
      playerHands: emptyHands,
      playerActiveTargets: emptyTargets,
      lastShiftArrowId: null
    };
    resetHistory(startState);
    showToast('Cleared board to a blank layout from scratch! 🧹');
  };

  // Reset preset action
  const handleResetBoard = () => {
    playClickSound();
    const { initialBoard, initialSpare } = generateInitialPreset(false);
    
    const emptyHands = { red: [], blue: [], green: [], yellow: [] };
    const emptyTargets = { red: null, blue: null, green: null, yellow: null };

    setBoard(initialBoard);
    setSpareTile(initialSpare);
    setLastShiftArrowId(null);
    setPlayerHands(emptyHands);
    setPlayerActiveTargets(emptyTargets);
    
    pushStateToHistory(initialBoard, initialSpare, null, activePawn, emptyHands, emptyTargets);
    showToast('Reset board layout to standard aligned coordinates!');
  };

  // Shuffle movable tiles preset action
  const handleShuffleBoard = () => {
    playClickSound();
    const { initialBoard, initialSpare } = generateInitialPreset(true);
    setBoard(initialBoard);
    setSpareTile(initialSpare);
    setLastShiftArrowId(null);
    pushStateToHistory(initialBoard, initialSpare, null, activePawn, playerHands, playerActiveTargets);
    showToast('Shuffled all movable tiles randomly!');
  };

  // Brush click actions or legal pawn movement
  const handleTileClick = (r, c) => {
    if (isGameStarted) {
      // PLAY MODE: Handle legal pawn movement
      let pawnPos = null;
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          if (board[row][col].pawns && board[row][col].pawns.includes(activePawn)) {
            pawnPos = { r: row, c: col };
            break;
          }
        }
      }

      if (!pawnPos) {
        showToast(`Active pawn ${activePawn.toUpperCase()} is not placed on the board! Switch to Edit mode to place it.`);
        return;
      }

      // Check if clicked cell is the same as current position
      if (pawnPos.r === r && pawnPos.c === c) {
        return;
      }

      // Find reachable cells using BFS
      const { cells } = getReachableCells(board, pawnPos.r, pawnPos.c);
      const isReachable = cells.some(cell => cell.r === r && cell.c === c);

      if (isReachable) {
        playPawnMoveSound();
        const nextBoard = cloneBoard(board);
        
        nextBoard[pawnPos.r][pawnPos.c].pawns = (nextBoard[pawnPos.r][pawnPos.c].pawns || []).filter(p => p !== activePawn);
        if (!nextBoard[r][c].pawns) nextBoard[r][c].pawns = [];
        nextBoard[r][c].pawns.push(activePawn);

        const nextHands = JSON.parse(JSON.stringify(playerHands));
        const nextActiveTargets = { ...playerActiveTargets };

        if (nextBoard[r][c].treasure === activeTarget) {
          playSuccessSound();
          showToast(`Goal Target Achieved: ${activeTarget.toUpperCase()}! 🏆`);
          
          nextHands[activePawn] = nextHands[activePawn].filter(c => c !== activeTarget);
          nextActiveTargets[activePawn] = nextHands[activePawn].length > 0 ? nextHands[activePawn][0] : null;
          
          setPlayerHands(nextHands);
          setPlayerActiveTargets(nextActiveTargets);
        } else {
          showToast(`Moved pawn to (${r}, ${c})`);
        }

        setBoard(nextBoard);
        pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activePawn, nextHands, nextActiveTargets);
      } else {
        showToast(`Tile (${r}, ${c}) is not reachable from your current position!`);
      }
      return;
    }

    if (setupStep !== 2 && setupStep !== 4 && setupStep !== 6) {
      showToast(`Please advance to Step 2 (Corridors) or Step 4 (Pawns) to configure board tiles!`);
      return;
    }

    const tile = board[r][c];

    // MOBILE FRIENDLY: Tap pawn color first in Panel, then single tap tile in step 4 to jump
    if (setupStep === 4) {
      playClickSound();
      const nextBoard = cloneBoard(board);
      
      // Wipe pawn color from old grid position
      for (let row = 0; row < 7; row++) {
        for (let col = 0; col < 7; col++) {
          nextBoard[row][col].pawns = (nextBoard[row][col].pawns || []).filter(p => p !== activePawn);
        }
      }

      // Add to new position
      if (!nextBoard[r][c].pawns) nextBoard[r][c].pawns = [];
      nextBoard[r][c].pawns.push(activePawn);

      setBoard(nextBoard);
      pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
      showToast(`Jumped active player pawn ${activePawn.toUpperCase()} to (${r}, ${c})`);
      return;
    }

    if (setupStep === 2) {
      // In Corridors Step: click rotates tile directly for streamlined layout setup
      if (tile.isFixed) {
        showToast('Fixed anchor tiles cannot be configured!');
        return;
      }
      playRotateSound();
      const nextBoard = cloneBoard(board);
      nextBoard[r][c].dir = (nextBoard[r][c].dir + 1) % 4;
      setBoard(nextBoard);
      pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
    } else if (setupStep === 6 && activeTool === 'select') {
      playClickSound();
      setSelectedTileCoord({ r, c });
      setShowModal(true);
    }
  };

  // Double click opens detailed tile editor modal
  const handleTileDoubleClick = (r, c) => {
    if (isGameStarted) return;
    if (setupStep !== 2 && setupStep !== 4 && setupStep !== 6) {
      showToast('Tile configurations can only be edited during corridor setup!');
      return;
    }
    playClickSound();
    setSelectedTileCoord({ r, c });
    setShowModal(true);
  };

  // Right click cycles shapes on board tiles in setup step 2
  const handleTileRightClick = (r, c) => {
    if (isGameStarted) return;
    if (setupStep === 2) {
      const tile = board[r][c];
      if (tile.isFixed) return;
      
      playClickSound();
      const nextBoard = cloneBoard(board);
      const shapes = ['I', 'L', 'T'];
      const nextIdx = (shapes.indexOf(tile.shape) + 1) % 3;
      nextBoard[r][c].shape = shapes[nextIdx];
      
      setBoard(nextBoard);
      pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
      showToast(`Cycled shape to ${shapes[nextIdx]}!`);
    }
  };

  // Shifting grid slider
  const handleSlide = (arrowId) => {
    if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
      showToast('Cannot reverse the previous column/row shift immediately!');
      return;
    }

    playSlideSound();
    const { type, index, dir } = parseArrowId(arrowId);
    
    const nextBoard = cloneBoard(board);
    const result = executeSlideInGrid(nextBoard, spareTile, type, index, dir);

    setBoard(nextBoard);
    setSpareTile(result.newSpare);
    setLastShiftArrowId(arrowId);

    pushStateToHistory(nextBoard, result.newSpare, arrowId, activePawn, playerHands, playerActiveTargets);
    
    const arrowParts = parseArrowId(arrowId);
    showToast(`Shifted ${arrowParts.type.toUpperCase()} ${arrowParts.index} ${arrowParts.dir.toUpperCase()}!`);
  };

  // Drop Handler for Drag and Drop Spare Tile
  const handleDropSpareTile = (arrowId) => {
    setDragOverArrowId(null);
    handleSlide(arrowId);
  };

  // Rotate Extra Spare Tile
  const handleRotateSpare = () => {
    playRotateSound();
    const nextSpare = {
      ...spareTile,
      dir: (spareTile.dir + 1) % 4
    };
    setSpareTile(nextSpare);
    pushStateToHistory(board, nextSpare, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
  };

  // Quick select configuration changes
  const handleUpdateSpareConfig = (field, value) => {
    playClickSound();
    const nextSpare = {
      ...spareTile,
      [field]: value
    };
    setSpareTile(nextSpare);
    pushStateToHistory(board, nextSpare, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
  };

  // Open spare editor modal
  const handleOpenSpareEditor = () => {
    if (isGameStarted) {
      showToast('Spare tile configuration is locked during the game. You can only rotate and place it.');
      return;
    }
    playClickSound();
    setSelectedTileCoord(null);
    setShowModal(true);
  };

  // Save details from TileEditorModal
  const handleSaveModal = (modalState) => {
    playClickSound();
    const nextBoard = cloneBoard(board);
    
    if (selectedTileCoord) {
      const { r, c } = selectedTileCoord;
      const tile = nextBoard[r][c];
      
      if (tile.isFixed) {
        tile.pawns = modalState.pawns;
      } else {
        tile.shape = modalState.shape;
        tile.dir = modalState.dir;
        tile.treasure = modalState.treasure || null;
        tile.pawns = modalState.pawns;
      }

      // Sync coordinate rules: ensure pawn color only exists in 1 coordinate
      modalState.pawns.forEach(color => {
        for (let row = 0; row < 7; row++) {
          for (let col = 0; col < 7; col++) {
            if (row !== r || col !== c) {
              nextBoard[row][col].pawns = (nextBoard[row][col].pawns || []).filter(p => p !== color);
            }
          }
        }
      });

      setBoard(nextBoard);
      pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
      showToast(`Saved layout edits for cell (${r}, ${c})`);
    } else {
      // Spare tile update
      const nextSpare = {
        ...spareTile,
        shape: modalState.shape,
        dir: modalState.dir,
        treasure: modalState.treasure || ''
      };
      setSpareTile(nextSpare);
      pushStateToHistory(board, nextSpare, lastShiftArrowId, activePawn, playerHands, playerActiveTargets);
      showToast('Saved extra spare tile configuration');
    }

    setShowModal(false);
  };

  const handleSetActiveTarget = (targetId) => {
    playClickSound();
    const nextActiveTargets = {
      ...playerActiveTargets,
      [activePawn]: targetId
    };
    setPlayerActiveTargets(nextActiveTargets);
    pushStateToHistory(board, spareTile, lastShiftArrowId, activePawn, playerHands, nextActiveTargets);
  };

  // Hand card triggers for active player
  const handleAddCard = (cardId) => {
    if (handCards.includes(cardId)) {
      showToast('Card treasure is already in your hand!');
      return;
    }
    playClickSound();
    const nextHands = JSON.parse(JSON.stringify(playerHands));
    const nextActiveTargets = { ...playerActiveTargets };

    nextHands[activePawn] = [...(nextHands[activePawn] || []), cardId];
    if (!nextActiveTargets[activePawn]) {
      nextActiveTargets[activePawn] = cardId;
    }

    setPlayerHands(nextHands);
    setPlayerActiveTargets(nextActiveTargets);
    
    pushStateToHistory(board, spareTile, lastShiftArrowId, activePawn, nextHands, nextActiveTargets);
    showToast(`Added card to ${activePawn.toUpperCase()}'s hand list!`);
  };

  const handleRemoveCard = (cardId) => {
    playClickSound();
    const nextHands = JSON.parse(JSON.stringify(playerHands));
    const nextActiveTargets = { ...playerActiveTargets };

    nextHands[activePawn] = (nextHands[activePawn] || []).filter(c => c !== cardId);
    
    if (nextActiveTargets[activePawn] === cardId) {
      nextActiveTargets[activePawn] = nextHands[activePawn].length > 0 ? nextHands[activePawn][0] : null;
    }

    setPlayerHands(nextHands);
    setPlayerActiveTargets(nextActiveTargets);
    
    pushStateToHistory(board, spareTile, lastShiftArrowId, activePawn, nextHands, nextActiveTargets);
    showToast(`Removed card from ${activePawn.toUpperCase()}'s hand.`);
  };

  // Execute recommendation path for active player
  const handleExecuteSolution = (path) => {
    if (!path || path.length === 0) return;

    playSlideSound();
    const turn1 = path[0];
    const { type, index, dir } = parseArrowId(turn1.arrowId);

    // Apply rotation and execute slide
    const rotatedSpare = { ...spareTile, dir: turn1.rotation };
    const nextBoard = cloneBoard(board);
    const result = executeSlideInGrid(nextBoard, rotatedSpare, type, index, dir);

    // Update pawn to final coordinates
    const finalPos = turn1.endPos;
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        nextBoard[r][c].pawns = (nextBoard[r][c].pawns || []).filter(p => p !== activePawn);
      }
    }

    if (!nextBoard[finalPos.r][finalPos.c].pawns) {
      nextBoard[finalPos.r][finalPos.c].pawns = [];
    }
    nextBoard[finalPos.r][finalPos.c].pawns.push(activePawn);

    const nextHands = JSON.parse(JSON.stringify(playerHands));
    const nextActiveTargets = { ...playerActiveTargets };

    // Check target achievement
    if (nextBoard[finalPos.r][finalPos.c].treasure === path.cardId) {
      playSuccessSound();
      showToast(`Goal Target Achieved: ${path.cardId.toUpperCase()}! 🏆`);
      
      nextHands[activePawn] = nextHands[activePawn].filter(c => c !== path.cardId);
      nextActiveTargets[activePawn] = nextHands[activePawn].length > 0 ? nextHands[activePawn][0] : null;
      
      setPlayerHands(nextHands);
      setPlayerActiveTargets(nextActiveTargets);
    } else {
      showToast(`Step 1 executed. Pawn moved to (${finalPos.r}, ${finalPos.c})`);
    }

    setBoard(nextBoard);
    setSpareTile(result.newSpare);
    setLastShiftArrowId(turn1.arrowId);
    setHoveredSolution(null);

    pushStateToHistory(nextBoard, result.newSpare, turn1.arrowId, activePawn, nextHands, nextActiveTargets);
  };

  // Undo Action
  const handleUndo = () => {
    playClickSound();
    const success = undo((state) => {
      setBoard(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActivePawn(state.activePawn);
      setPlayerHands(state.playerHands);
      setPlayerActiveTargets(state.playerActiveTargets);
    });
    if (success) {
      showToast('Undo executed ↩️');
    }
  };

  // Redo Action
  const handleRedo = () => {
    playClickSound();
    const success = redo((state) => {
      setBoard(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActivePawn(state.activePawn);
      setPlayerHands(state.playerHands);
      setPlayerActiveTargets(state.playerActiveTargets);
    });
    if (success) {
      showToast('Redo executed ↪️');
    }
  };

  // Save layout state to LocalStorage
  const handleSaveState = () => {
    const state = {
      board,
      spareTile,
      activePawn,
      playerHands,
      playerActiveTargets,
      lastShiftArrowId,
      isGameStarted,
      gameStartState
    };
    const success = saveSlot('Manual Save / Checkpoint', state);
    if (success) {
      playSuccessSound();
      showToast('State checkpoint saved successfully! 💾');
    } else {
      showToast('Failed to save state profile.');
    }
  };




  const handleLoadState = () => {
    const success = loadStateFromLocalStorage(false);
    if (!success) {
      showToast('No saved state found in browser memory.');
    }
  };

  const handleLoadSlot = (key) => {
    const state = loadSlot(key);
    if (state) {
      setBoard(state.board);
      setSpareTile(state.spareTile);
      setActivePawn(state.activePawn || 'red');
      setPlayerHands(state.playerHands || { red: [], blue: [], green: [], yellow: [] });
      setPlayerActiveTargets(state.playerActiveTargets || { red: null, blue: null, green: null, yellow: null });
      setLastShiftArrowId(state.lastShiftArrowId || null);
      setIsGameStarted(state.isGameStarted || false);
      setGameStartState(state.gameStartState || null);
      
      const record = {
        board: state.board,
        spareTile: state.spareTile,
        lastShiftArrowId: state.lastShiftArrowId || null,
        activePawn: state.activePawn || 'red',
        playerHands: state.playerHands || { red: [], blue: [], green: [], yellow: [] },
        playerActiveTargets: state.playerActiveTargets || { red: null, blue: null, green: null, yellow: null }
      };
      resetHistory(record);
      showToast('Profile loaded successfully! 📂');
    } else {
      showToast('Failed to load profile.');
    }
  };

  // Solver Highlights Coordinates mapping
  const highlightedPath = hoveredSolution ? hoveredSolution[0]?.pawnPath || [] : [];
  const highlightedStart = highlightedPath.length > 0 ? highlightedPath[0] : null;
  const highlightedEnd = highlightedPath.length > 0 ? highlightedPath[highlightedPath.length - 1] : null;
  const previewArrowId = hoveredSolution ? hoveredSolution[0]?.arrowId : dragOverArrowId;

  // Extract human readable last shift display text
  const getLastShiftText = () => {
    if (!lastShiftArrowId) return 'None';
    const parts = lastShiftArrowId.split('-');
    return `${parts[0].toUpperCase()} ${parts[1]} ${parts[2].toUpperCase()}`;
  };

  return (
    <div className="app-container">
      {/* Dynamic Toast Alert */}
      <div 
        className={clsx(
          "toast-alert",
          toast.visible && "visible"
        )}
      >
        <span className="toast-ping" />
        {toast.message}
      </div>

      {/* Header */}
      <header className="app-header">
        <div className="header-brand">
          <div className="header-icon-wrap">
            <Compass size={24} />
          </div>
          <div>
            <h1 className="header-title">
              Labyrinth Strategist
            </h1>
            <p className="header-subtitle">Amaze-ing Labyrinth Board Helper</p>
          </div>
        </div>
        
        {/* Header toolbar control actions */}
        <div className="header-toolbar">
          {/* Undo/Redo */}
          <button 
            onClick={handleUndo} 
            disabled={!canUndo}
            className="btn-icon" 
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={!canRedo}
            className="btn-icon" 
            title="Redo"
          >
            <Redo2 size={16} />
          </button>
          
          <div className="toolbar-divider" />

          <button 
            onClick={handleSaveState}
            className="btn-text"
          >
            <Save size={14} /> Save State
          </button>
          <button 
            onClick={handleLoadState}
            className="btn-text"
          >
            <FolderOpen size={14} /> Load State
          </button>

          <button 
            onClick={handleToggleMute}
            className="btn-icon"
            title={isMuted ? "Unmute Sounds" : "Mute Sounds"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          
          <div className="toolbar-divider" />

          {!isGameStarted ? (
            <div className="mode-badge setup-header-badge" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', padding: '6px 12px', background: 'rgba(255, 190, 26, 0.05)', borderRadius: '8px', border: '1px solid rgba(255, 190, 26, 0.2)', color: 'var(--color-accent-gold)', fontWeight: 600 }}>
              <Unlock size={12} /> Setup Wizard Mode
            </div>
          ) : (
            <>
              <button 
                onClick={handleRestartGame}
                className="btn-text"
                style={{
                  background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                  color: 'black',
                  border: 'none',
                  fontWeight: 700
                }}
              >
                <RefreshCcw size={14} /> Restart Game
              </button>
              <button 
                onClick={handleEndGame}
                className="btn-text"
                style={{
                  background: 'linear-gradient(135deg, var(--color-accent-cyan), #0284c7)',
                  color: 'black',
                  border: 'none',
                  fontWeight: 700
                }}
              >
                <Wrench size={14} /> Edit Board
              </button>
            </>
          )}
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="main-content">
        {/* Left Side: Board and Spare Tile */}
        <section className="glass-panel board-section">
          {/* Painting Toolbar */}
          <div className="board-toolbar">
            {isGameStarted ? (
              <div className="mode-badge play-mode-active" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(0, 240, 255, 0.1)', borderRadius: '8px', border: '1px solid rgba(0, 240, 255, 0.3)' }}>
                <Lock size={14} style={{ color: 'var(--color-accent-cyan)' }} />
                <span style={{ color: 'var(--color-accent-cyan)', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.05em' }}>GAME MODE: BOARD LOCKED</span>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div className="mode-badge setup-step-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px', background: 'rgba(255, 190, 26, 0.1)', borderRadius: '8px', border: '1px solid rgba(255, 190, 26, 0.3)' }}>
                  <Unlock size={14} style={{ color: 'var(--color-accent-gold)' }} />
                  <span style={{ color: 'var(--color-accent-gold)', fontWeight: 'bold', fontSize: '11px', letterSpacing: '0.05em' }}>
                    STEP {setupStep}/6: {
                      setupStep === 1 ? 'BASE LAYOUT' :
                      setupStep === 2 ? 'PAINT TILE CORRIDORS' :
                      setupStep === 3 ? 'EXTRA SPARE TILE' :
                      setupStep === 4 ? 'PLACE PLAYER PAWNS' :
                      setupStep === 5 ? 'SET PLAYER HAND' :
                      'READY TO PLAY!'
                    }
                  </span>
                </div>
                {setupStep === 2 && (
                  <div className="tool-group">
                    <button 
                      onClick={() => setActiveTool('select')}
                      className={clsx("btn-tool", activeTool === 'select' && "active")}
                    >
                      <Wrench size={13} /> Inspect Mode
                    </button>
                    <button 
                      onClick={() => setActiveTool('rotate')}
                      className={clsx("btn-tool", activeTool === 'rotate' && "active")}
                    >
                      <RefreshCcw size={13} /> Quick Rotate
                    </button>
                    <button 
                      onClick={() => setActiveTool('paint-I')}
                      className={clsx("btn-tool", activeTool === 'paint-I' && "active")}
                    >
                      <Edit3 size={13} /> Paint Straight (I)
                    </button>
                    <button 
                      onClick={() => setActiveTool('paint-L')}
                      className={clsx("btn-tool", activeTool === 'paint-L' && "active")}
                    >
                      <Edit3 size={13} /> Paint Corner (L)
                    </button>
                    <button 
                      onClick={() => setActiveTool('paint-T')}
                      className={clsx("btn-tool", activeTool === 'paint-T' && "active")}
                    >
                      <Edit3 size={13} /> Paint Junction (T)
                    </button>
                  </div>
                )}
                {setupStep === 4 && (
                  <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 500 }}>
                    💡 Tap/Click cells on grid to position pawns
                  </span>
                )}
              </div>
            )}
            
            <div className="status-badge">
              Last shift: <span className="status-badge-val">{getLastShiftText()}</span>
            </div>
          </div>

          {/* Interactive Board Grid */}
          <Board
            board={board}
            lastShiftArrowId={lastShiftArrowId}
            selectedTileCoord={selectedTileCoord}
            highlightedPath={highlightedPath}
            highlightedStart={highlightedStart}
            highlightedEnd={highlightedEnd}
            activeTool={activeTool}
            onTileClick={handleTileClick}
            onTileDoubleClick={handleTileDoubleClick}
            onTileRightClick={handleTileRightClick}
            onSlide={handleSlide}
            onDragOver={setDragOverArrowId}
            onDropSpareTile={handleDropSpareTile}
            previewArrowId={previewArrowId}
            isGameStarted={isGameStarted}
            reachableCells={reachableCells}
          />

          {/* Extra Spare Tile Section */}
          <div className={clsx("spare-section", !isGameStarted && setupStep === 3 && "wizard-highlight-pulse")}>
            <div className="spare-info">
              <h3>
                Extra Spare Tile 🧩
              </h3>
              <p>
                {isGameStarted 
                  ? "Drag this spare tile and drop it on an arrow to slide, or rotate it."
                  : "Drag this spare tile and drop it on any board arrow, or select configuration options."}
              </p>
            </div>
            
            <div className="spare-controls">
              {/* Draggable Spare Tile Wrapper */}
              <div 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'spare-tile');
                  e.dataTransfer.effectAllowed = 'move';
                  playClickSound();
                }}
                className="spare-tile-wrapper"
                onClick={handleOpenSpareEditor}
                title={isGameStarted ? "Drag this tile onto grid arrows, or click rotate" : "Drag this tile onto grid arrows, or click to edit in modal"}
              >
                <Tile
                  shape={spareTile.shape}
                  dir={spareTile.dir}
                  treasure={spareTile.treasure}
                  isFixed={false}
                  pawns={[]}
                />
              </div>

              <div className="spare-actions">
                <button
                  onClick={handleRotateSpare}
                  className="btn-rotate"
                  title="Rotate Spare 90° Clockwise"
                >
                  <RotateCw size={14} />
                </button>
                <select
                  value={spareTile.shape}
                  onChange={(e) => handleUpdateSpareConfig('shape', e.target.value)}
                  className="select-control"
                  disabled={isGameStarted}
                  style={isGameStarted ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <option value="I">Straight (I)</option>
                  <option value="L">Corner (L)</option>
                  <option value="T">Junction (T)</option>
                </select>
                <select
                  value={spareTile.treasure}
                  onChange={(e) => handleUpdateSpareConfig('treasure', e.target.value)}
                  className="select-control"
                  disabled={isGameStarted}
                  style={isGameStarted ? { opacity: 0.6, cursor: 'not-allowed' } : {}}
                >
                  <option value="">No Treasure</option>
                  {TREASURES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.symbol} {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </section>

        {/* Right Side: Setup Controls & Solver Output */}
        <ControlPanel
          activePawn={activePawn}
          setActivePawn={setActivePawn}
          handCards={handCards}
          activeTarget={activeTarget}
          setActiveTarget={handleSetActiveTarget}
          onAddCard={handleAddCard}
          onRemoveCard={handleRemoveCard}
          maxTurns={maxTurns}
          setMaxTurns={setMaxTurns}
          solutions={solutions}
          isLoadingSolutions={isLoadingSolutions}
          onHoverSolution={setHoveredSolution}
          onExecuteSolution={handleExecuteSolution}
          isGameStarted={isGameStarted}
          setupStep={setupStep}
          setSetupStep={setSetupStep}
          onNextStep={handleNextStep}
          onPrevStep={handlePrevStep}
          onClearBoard={handleClearBoard}
          onResetBoard={handleResetBoard}
          onShuffleBoard={handleShuffleBoard}
          onStartGame={handleStartGame}
          onEndGame={handleEndGame}
          onRestartGame={handleRestartGame}
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          slots={slots}
          onSaveSlot={saveSlot}
          onLoadSlot={handleLoadSlot}
          onDeleteSlot={deleteSlot}
        />
      </main>

      {/* Floating Detailed Tile Editor Context Modal */}
      <TileEditorModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSaveModal}
        selectedTileCoord={selectedTileCoord}
        initialTileData={selectedTileCoord ? board[selectedTileCoord.r][selectedTileCoord.c] : spareTile}
      />
    </div>
  );
}
