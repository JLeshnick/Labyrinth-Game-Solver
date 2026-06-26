import React, { useState, useEffect } from 'react';
import './App.css';
import { Compass, RotateCw, Save, FolderOpen, RefreshCcw, Shuffle, Undo2, Redo2, Wrench, Edit3, Trash2, Play, Square, Lock, Unlock } from 'lucide-react';
import Board from './components/Board';
import ControlPanel from './components/ControlPanel';
import Tile from './components/Tile';
import { TREASURES, PAWNS, FIXED_TILES, SHIFT_ARROWS } from './constants';
import { 
  cloneBoard, 
  parseArrowId, 
  executeSlideInGrid, 
  solveAllHand,
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

import clsx from 'clsx';

export default function App() {
  // Game States
  const [board, setBoard] = useState([]);
  const [spareTile, setSpareTile] = useState({ shape: 'L', dir: 0, treasure: '', isFixed: false, pawns: [] });
  const [activePawn, setActivePawn] = useState('red');
  const [handCards, setHandCards] = useState([]);
  const [activeTarget, setActiveTarget] = useState(null);
  const [lastShiftArrowId, setLastShiftArrowId] = useState(null);
  const [maxTurns, setMaxTurns] = useState(2);

  // Game Setup vs Play Mode States
  const [isGameStarted, setIsGameStarted] = useState(false);
  const [gameStartState, setGameStartState] = useState(null);
  const [reachableCells, setReachableCells] = useState([]);


  // Interaction Tools
  const [activeTool, setActiveTool] = useState('select'); // 'select', 'rotate', 'paint-I', 'paint-L', 'paint-T'
  const [selectedTileCoord, setSelectedTileCoord] = useState(null); // Coordinate of tile currently open in the modal
  const [modalState, setModalState] = useState({ shape: 'I', dir: 0, treasure: '', pawns: [] });
  const [showModal, setShowModal] = useState(false);

  // Solver Solutions & Visual Highlights
  const [solutions, setSolutions] = useState([]);
  const [hoveredSolution, setHoveredSolution] = useState(null);
  const [dragOverArrowId, setDragOverArrowId] = useState(null);

  // Undo / Redo History Stack
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Toast System
  const [toast, setToast] = useState({ message: '', visible: false });

  const showToast = (message) => {
    setToast({ message, visible: true });
  };

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

  // Setup Initial Game Board
  useEffect(() => {
    const success = loadStateFromLocalStorage(true);
    if (!success) {
      const { initialBoard, initialSpare } = generateInitialPreset(true);
      setBoard(initialBoard);
      setSpareTile(initialSpare);
      setLastShiftArrowId(null);
      
      const startState = {
        board: initialBoard,
        spareTile: initialSpare,
        activePawn: 'red',
        handCards: [],
        activeTarget: null,
        lastShiftArrowId: null
      };
      setHistory([startState]);
      setHistoryIndex(0);
    }
  }, []);

  // Compute solver solutions dynamically
  useEffect(() => {
    if (board.length === 0) return;

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

    // Solve paths
    const computed = solveAllHand(board, spareTile, pawnPos, handCards, lastShiftArrowId, maxTurns);
    setSolutions(computed);
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

  // History Recording Helper
  const pushStateToHistory = (nextBoard, nextSpare, nextLastShift, nextTarget, nextPawn, nextHand) => {
    const record = {
      board: cloneBoard(nextBoard),
      spareTile: { ...nextSpare },
      lastShiftArrowId: nextLastShift,
      activeTarget: nextTarget,
      activePawn: nextPawn,
      handCards: [...nextHand]
    };

    const newHistory = history.slice(0, historyIndex + 1);
    setHistory([...newHistory, record]);
    setHistoryIndex(newHistory.length);
  };

  const handleStartGame = () => {
    playSuccessSound();
    const currentSetup = {
      board: cloneBoard(board),
      spareTile: { ...spareTile },
      activePawn,
      handCards: [...handCards],
      activeTarget,
      lastShiftArrowId
    };
    setGameStartState(currentSetup);
    setIsGameStarted(true);
    try {
      const state = {
        board,
        spareTile,
        activePawn,
        handCards,
        activeTarget,
        lastShiftArrowId,
        isGameStarted: true,
        gameStartState: currentSetup
      };
      localStorage.setItem('labyrinth_strategist_state', JSON.stringify(state));
    } catch (e) {
      console.warn("Could not auto-save game start state:", e);
    }
    showToast('Game Started! Board locked. Click to move pawn legally along corridors. 🎮');
  };

  const handleEndGame = () => {
    playClickSound();
    setIsGameStarted(false);
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
    setHandCards([...setup.handCards]);
    setActiveTarget(setup.activeTarget);
    setLastShiftArrowId(setup.lastShiftArrowId);

    const record = {
      board: cloneBoard(setup.board),
      spareTile: { ...setup.spareTile },
      lastShiftArrowId: setup.lastShiftArrowId,
      activeTarget: setup.activeTarget,
      activePawn: setup.activePawn,
      handCards: [...setup.handCards]
    };
    setHistory([record]);
    setHistoryIndex(0);
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

    setBoard(tempBoard);
    setSpareTile(spare);
    setLastShiftArrowId(null);
    setHandCards([]);
    setActiveTarget(null);

    const startState = {
      board: tempBoard,
      spareTile: spare,
      activePawn: 'red',
      handCards: [],
      activeTarget: null,
      lastShiftArrowId: null
    };
    setHistory([startState]);
    setHistoryIndex(0);
    showToast('Cleared board to a blank layout from scratch! 🧹');
  };

  // Reset preset action
  const handleResetBoard = () => {
    playClickSound();
    const { initialBoard, initialSpare } = generateInitialPreset(false);
    setBoard(initialBoard);
    setSpareTile(initialSpare);
    setLastShiftArrowId(null);
    setHandCards([]);
    setActiveTarget(null);
    pushStateToHistory(initialBoard, initialSpare, null, null, activePawn, []);
    showToast('Reset board layout to standard aligned coordinates!');
  };

  // Shuffle movable tiles preset action
  const handleShuffleBoard = () => {
    playClickSound();
    const { initialBoard, initialSpare } = generateInitialPreset(true);
    setBoard(initialBoard);
    setSpareTile(initialSpare);
    setLastShiftArrowId(null);
    pushStateToHistory(initialBoard, initialSpare, null, activeTarget, activePawn, handCards);
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

        let nextHand = [...handCards];
        let nextTarget = activeTarget;

        if (nextBoard[r][c].treasure === activeTarget) {
          playSuccessSound();
          showToast(`Goal Target Achieved: ${activeTarget.toUpperCase()}! 🏆`);
          
          nextHand = nextHand.filter(c => c !== activeTarget);
          nextTarget = nextHand.length > 0 ? nextHand[0] : null;
          
          setHandCards(nextHand);
          setActiveTarget(nextTarget);
        } else {
          showToast(`Moved pawn to (${r}, ${c})`);
        }

        setBoard(nextBoard);
        pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, nextTarget, activePawn, nextHand);
      } else {
        showToast(`Tile (${r}, ${c}) is not reachable from your current position!`);
      }
      return;
    }

    const tile = board[r][c];

    if (activeTool === 'select') {
      playClickSound();
      setSelectedTileCoord({ r, c });
      setModalState({
        shape: tile.shape,
        dir: tile.dir,
        treasure: tile.treasure || '',
        pawns: [...(tile.pawns || [])]
      });
      setShowModal(true);
    } else {
      if (tile.isFixed) {
        showToast('Fixed anchor tiles cannot be configured!');
        return;
      }

      const nextBoard = cloneBoard(board);
      const targetTile = nextBoard[r][c];

      if (activeTool === 'rotate') {
        playRotateSound();
        targetTile.dir = (targetTile.dir + 1) % 4;
      } else if (activeTool === 'paint-I') {
        playClickSound();
        targetTile.shape = 'I';
      } else if (activeTool === 'paint-L') {
        playClickSound();
        targetTile.shape = 'L';
      } else if (activeTool === 'paint-T') {
        playClickSound();
        targetTile.shape = 'T';
      }

      setBoard(nextBoard);
      pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activeTarget, activePawn, handCards);
    }
  };

  // Double click moves active pawn directly to coordinate (Setup Mode Only)
  const handleTileDoubleClick = (r, c) => {
    if (isGameStarted) return;
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
    pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activeTarget, activePawn, handCards);
    showToast(`Jumped active player pawn ${activePawn.toUpperCase()} to (${r}, ${c})`);
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

    pushStateToHistory(nextBoard, result.newSpare, arrowId, activeTarget, activePawn, handCards);
    
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
    pushStateToHistory(board, nextSpare, lastShiftArrowId, activeTarget, activePawn, handCards);
  };

  // Quick select configuration changes
  const handleUpdateSpareConfig = (field, value) => {
    playClickSound();
    const nextSpare = {
      ...spareTile,
      [field]: value
    };
    setSpareTile(nextSpare);
    pushStateToHistory(board, nextSpare, lastShiftArrowId, activeTarget, activePawn, handCards);
  };

  // Open spare editor modal
  const handleOpenSpareEditor = () => {
    if (isGameStarted) {
      showToast('Spare tile configuration is locked during the game. You can only rotate and place it.');
      return;
    }
    playClickSound();
    setSelectedTileCoord(null);
    setModalState({
      shape: spareTile.shape,
      dir: spareTile.dir,
      treasure: spareTile.treasure || '',
      pawns: []
    });
    setShowModal(true);
  };

  // Modal actions
  const handleSaveModal = () => {
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
      pushStateToHistory(nextBoard, spareTile, lastShiftArrowId, activeTarget, activePawn, handCards);
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
      pushStateToHistory(board, nextSpare, lastShiftArrowId, activeTarget, activePawn, handCards);
      showToast('Saved extra spare tile configuration');
    }

    setShowModal(false);
  };

  // Hand card triggers
  const handleAddCard = (cardId) => {
    if (handCards.includes(cardId)) {
      showToast('Card treasure is already in your hand!');
      return;
    }
    playClickSound();
    const nextHand = [...handCards, cardId];
    setHandCards(nextHand);
    if (!activeTarget) {
      setActiveTarget(cardId);
    }
    pushStateToHistory(board, spareTile, lastShiftArrowId, activeTarget || cardId, activePawn, nextHand);
    showToast('Added card to hand list!');
  };

  const handleRemoveCard = (cardId) => {
    playClickSound();
    const nextHand = handCards.filter(c => c !== cardId);
    setHandCards(nextHand);
    
    let nextTarget = activeTarget;
    if (activeTarget === cardId) {
      nextTarget = nextHand.length > 0 ? nextHand[0] : null;
      setActiveTarget(nextTarget);
    }
    
    pushStateToHistory(board, spareTile, lastShiftArrowId, nextTarget, activePawn, nextHand);
    showToast('Removed card from hand list.');
  };

  // Execute recommendation path
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

    let nextHand = [...handCards];
    let nextTarget = activeTarget;

    // Check target achievement
    if (nextBoard[finalPos.r][finalPos.c].treasure === path.cardId) {
      playSuccessSound();
      showToast(`Goal Target Achieved: ${path.cardId.toUpperCase()}! 🏆`);
      
      nextHand = nextHand.filter(c => c !== path.cardId);
      nextTarget = nextHand.length > 0 ? nextHand[0] : null;
      
      setHandCards(nextHand);
      setActiveTarget(nextTarget);
    } else {
      showToast(`Step 1 executed. Pawn moved to (${finalPos.r}, ${finalPos.c})`);
    }

    setBoard(nextBoard);
    setSpareTile(result.newSpare);
    setLastShiftArrowId(turn1.arrowId);
    setHoveredSolution(null);

    pushStateToHistory(nextBoard, result.newSpare, turn1.arrowId, nextTarget, activePawn, nextHand);
  };

  // Undo Action
  const handleUndo = () => {
    if (historyIndex > 0) {
      playClickSound();
      const prevIdx = historyIndex - 1;
      const state = history[prevIdx];
      
      setBoard(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActiveTarget(state.activeTarget);
      setActivePawn(state.activePawn);
      setHandCards(state.handCards);
      setHistoryIndex(prevIdx);
      showToast('Undo executed');
    }
  };

  // Redo Action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      playClickSound();
      const nextIdx = historyIndex + 1;
      const state = history[nextIdx];
      
      setBoard(state.board);
      setSpareTile(state.spareTile);
      setLastShiftArrowId(state.lastShiftArrowId);
      setActiveTarget(state.activeTarget);
      setActivePawn(state.activePawn);
      setHandCards(state.handCards);
      setHistoryIndex(nextIdx);
      showToast('Redo executed');
    }
  };

  // Save layout state to LocalStorage
  const handleSaveState = () => {
    try {
      const state = {
        board,
        spareTile,
        activePawn,
        handCards,
        activeTarget,
        lastShiftArrowId,
        isGameStarted,
        gameStartState
      };
      localStorage.setItem('labyrinth_strategist_state', JSON.stringify(state));
      playSuccessSound();
      showToast('Layout state saved successfully! 💾');
    } catch (e) {
      showToast('Failed to save state to storage.');
    }
  };

  // Load layout state from LocalStorage
  const loadStateFromLocalStorage = (quiet = false) => {
    try {
      const raw = localStorage.getItem('labyrinth_strategist_state');
      if (!raw) return false;

      const state = JSON.parse(raw);
      if (!state.board || !state.spareTile) return false;

      setBoard(state.board);
      setSpareTile(state.spareTile);
      setActivePawn(state.activePawn || 'red');
      setHandCards(state.handCards || []);
      setActiveTarget(state.activeTarget || null);
      setLastShiftArrowId(state.lastShiftArrowId || null);
      setIsGameStarted(state.isGameStarted || false);
      setGameStartState(state.gameStartState || null);
      
      // Record initial history
      const record = {
        board: state.board,
        spareTile: state.spareTile,
        lastShiftArrowId: state.lastShiftArrowId || null,
        activeTarget: state.activeTarget || null,
        activePawn: state.activePawn || 'red',
        handCards: state.handCards || []
      };
      setHistory([record]);
      setHistoryIndex(0);

      if (!quiet) {
        playSuccessSound();
        showToast('Layout state loaded successfully! 📂');
      }
      return true;
    } catch (e) {
      console.warn(e);
      return false;
    }
  };

  const handleLoadState = () => {
    const success = loadStateFromLocalStorage(false);
    if (!success) {
      showToast('No saved state found in browser memory.');
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
            disabled={historyIndex <= 0}
            className="btn-icon" 
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
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
          
          <div className="toolbar-divider" />

          {!isGameStarted ? (
            <>
              <button 
                onClick={handleClearBoard}
                className="btn-text btn-danger"
                title="Wipe board and restart layout from scratch"
              >
                <Trash2 size={14} /> Clear Board
              </button>
              <button 
                onClick={handleResetBoard}
                className="btn-text btn-danger"
              >
                <RefreshCcw size={14} /> Reset Layout
              </button>
              <button 
                onClick={handleShuffleBoard}
                className="btn-text btn-primary"
              >
                <Shuffle size={14} /> Shuffle Movable
              </button>
              <button 
                onClick={handleStartGame}
                className="btn-text btn-success"
                style={{
                  background: 'linear-gradient(135deg, #10b981, #059669)',
                  color: 'white',
                  border: 'none',
                  boxShadow: '0 0 12px rgba(16, 185, 129, 0.4)',
                  fontWeight: 700
                }}
              >
                <Play size={14} /> Start Game
              </button>
            </>
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
            onSlide={handleSlide}
            onDragOver={setDragOverArrowId}
            onDropSpareTile={handleDropSpareTile}
            previewArrowId={previewArrowId}
            isGameStarted={isGameStarted}
            reachableCells={reachableCells}
          />

          {/* Extra Spare Tile Section */}
          <div className="spare-section">
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
          setActiveTarget={setActiveTarget}
          onAddCard={handleAddCard}
          maxTurns={maxTurns}
          setMaxTurns={setMaxTurns}
          solutions={solutions}
          onHoverSolution={setHoveredSolution}
          onExecuteSolution={handleExecuteSolution}
          isGameStarted={isGameStarted}
        />
      </main>

      {/* Floating Detailed Tile Editor Context Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px', marginBottom: '20px'}}>
              <h3 style={{fontSize: '16px', fontWeight: 'bold', color: 'white'}}>
                {selectedTileCoord 
                  ? `Configure Tile at (${selectedTileCoord.r}, ${selectedTileCoord.c})` 
                  : 'Configure Extra Spare Tile'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                style={{color: '#9ca3af', fontSize: '24px', fontWeight: 'bold'}}
              >
                &times;
              </button>
            </div>

            <div style={{display: 'flex', flexDirection: 'column', gap: '16px'}}>
              {/* Path Shape Option */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{fontSize: '12px', fontWeight: 600, color: '#9ca3af'}}>Exit Corridor Shape</label>
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px'}}>
                  {['I', 'L', 'T'].map(sh => (
                    <button
                      key={sh}
                      onClick={() => setModalState(prev => ({ ...prev, shape: sh }))}
                      disabled={selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed}
                      className={clsx(
                        "btn-text",
                        modalState.shape === sh && "btn-primary",
                        selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed && "opacity-50 cursor-not-allowed"
                      )}
                      style={{justifyContent: 'center'}}
                    >
                      {sh === 'I' ? 'Straight (I)' : sh === 'L' ? 'Corner (L)' : 'Junction (T)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation Option */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{fontSize: '12px', fontWeight: 600, color: '#9ca3af'}}>Exits Rotation Angle</label>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'}}>
                  {[0, 1, 2, 3].map(rot => (
                    <button
                      key={rot}
                      onClick={() => setModalState(prev => ({ ...prev, dir: rot }))}
                      disabled={selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed}
                      className={clsx(
                        "btn-text",
                        modalState.dir === rot && "btn-primary",
                        selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed && "opacity-50 cursor-not-allowed"
                      )}
                      style={{justifyContent: 'center'}}
                    >
                      {rot * 90}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned Treasure Option */}
              <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                <label style={{fontSize: '12px', fontWeight: 600, color: '#9ca3af'}}>Assigned Treasure</label>
                <select
                  value={modalState.treasure}
                  onChange={(e) => setModalState(prev => ({ ...prev, treasure: e.target.value }))}
                  disabled={selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed}
                  className="select-control"
                  style={{padding: '8px 12px', fontSize: '14px', borderRadius: '12px'}}
                >
                  <option value="">No Treasure</option>
                  {TREASURES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.symbol} {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Pawns Present Option */}
              {selectedTileCoord && (
                <div style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <label style={{fontSize: '12px', fontWeight: 600, color: '#9ca3af'}}>Pawns Present on Tile</label>
                  <div style={{display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px'}}>
                    {['red', 'blue', 'green', 'yellow'].map(color => {
                      const present = modalState.pawns.includes(color);
                      return (
                        <button
                          key={color}
                          onClick={() => {
                            setModalState(prev => {
                              const alreadyIn = prev.pawns.includes(color);
                              return {
                                ...prev,
                                pawns: alreadyIn 
                                  ? prev.pawns.filter(p => p !== color)
                                  : [...prev.pawns, color]
                              };
                            });
                          }}
                          className={clsx(
                            "btn-text",
                            present && `pawn-${color}`
                          )}
                          style={{
                            justifyContent: 'center', 
                            textTransform: 'capitalize',
                            background: present ? `var(--color-pawn-${color})` : undefined,
                            color: present ? (color === 'yellow' ? 'black' : 'white') : undefined
                          }}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={{display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '16px', marginTop: '16px'}}>
              <button
                onClick={() => setShowModal(false)}
                className="btn-text"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                className="btn-text btn-primary"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
