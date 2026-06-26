import React, { useState, useEffect } from 'react';
import { Compass, RotateCw, Save, FolderOpen, RefreshCcw, Shuffle, Undo2, Redo2, Wrench, Edit3, Trash2 } from 'lucide-react';
import Board from './components/Board';
import ControlPanel from './components/ControlPanel';
import Tile from './components/Tile';
import { TREASURES, PAWNS, FIXED_TILES, SHIFT_ARROWS } from './constants';
import { 
  cloneBoard, 
  parseArrowId, 
  executeSlideInGrid, 
  solveAllHand,
  isOppositeArrow
} from './solver';
import { 
  playClickSound, 
  playSlideSound, 
  playRotateSound, 
  playSuccessSound 
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

  // Brush click actions
  const handleTileClick = (r, c) => {
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

  // Double click moves active pawn directly to coordinate
  const handleTileDoubleClick = (r, c) => {
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
        lastShiftArrowId
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
    <div className="min-h-screen text-gray-100 flex flex-col font-sans bg-bg-primary">
      {/* Dynamic Toast Alert */}
      <div 
        className={clsx(
          "fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-bg-panel-solid border border-accent-cyan/30 text-accent-cyan text-sm font-semibold shadow-2xl transition-all duration-300 z-[100] tracking-wide backdrop-blur-md flex items-center justify-center gap-2",
          toast.visible ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0 pointer-events-none"
        )}
      >
        <span className="w-2 h-2 rounded-full bg-accent-cyan animate-ping" />
        {toast.message}
      </div>

      {/* Header */}
      <header className="px-6 py-4 border-b border-white/5 bg-bg-secondary/40 backdrop-blur-md flex justify-between items-center z-50 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-accent-gold to-yellow-600 rounded-xl shadow-lg shadow-accent-gold/15">
            <Compass className="text-black" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-br from-white via-gray-100 to-accent-gold bg-clip-text text-transparent flex items-center gap-2 tracking-tight">
              Labyrinth Strategist
            </h1>
            <p className="text-[10px] text-gray-400 font-medium tracking-wide uppercase mt-0.5">Amaze-ing Labyrinth Board Helper</p>
          </div>
        </div>
        
        {/* Header toolbar control actions */}
        <div className="flex gap-2">
          {/* Undo/Redo */}
          <button 
            onClick={handleUndo} 
            disabled={historyIndex <= 0}
            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none border border-white/10 rounded-xl transition-all cursor-pointer active:scale-95" 
            title="Undo"
          >
            <Undo2 size={16} />
          </button>
          <button 
            onClick={handleRedo} 
            disabled={historyIndex >= history.length - 1}
            className="p-2 bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:pointer-events-none border border-white/10 rounded-xl transition-all cursor-pointer active:scale-95" 
            title="Redo"
          >
            <Redo2 size={16} />
          </button>
          
          <div className="w-px h-6 bg-white/10 self-center mx-1" />

          <button 
            onClick={handleSaveState}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-semibold cursor-pointer active:scale-95"
          >
            <Save size={14} /> Save State
          </button>
          <button 
            onClick={handleLoadState}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-semibold cursor-pointer active:scale-95"
          >
            <FolderOpen size={14} /> Load State
          </button>
          <button 
            onClick={handleResetBoard}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-xs font-semibold cursor-pointer active:scale-95 text-red-400"
          >
            <RefreshCcw size={14} /> Reset
          </button>
          <button 
            onClick={handleShuffleBoard}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-br from-accent-gold to-yellow-600 text-black font-bold rounded-xl hover:shadow-[0_0_15px_rgba(255,190,26,0.3)] transition-all text-xs cursor-pointer active:scale-95"
          >
            <Shuffle size={14} /> Shuffle Movable
          </button>
        </div>
      </header>

      {/* Main Container Layout */}
      <main className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-8 max-w-[1500px] mx-auto w-full items-start">
        {/* Left Side: Board and Spare Tile */}
        <section className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center border border-white/10 shadow-2xl relative">
          {/* Painting Toolbar */}
          <div className="w-full flex flex-wrap justify-between items-center mb-5 gap-3 border-b border-white/5 pb-4 px-2">
            <div className="flex gap-1.5 bg-black/30 p-1 rounded-xl border border-white/5">
              <button 
                onClick={() => setActiveTool('select')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTool === 'select' ? "bg-accent-gold text-black font-bold shadow-md" : "text-gray-400 hover:text-white"
                )}
              >
                <Wrench size={13} /> Inspect Mode
              </button>
              <button 
                onClick={() => setActiveTool('rotate')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTool === 'rotate' ? "bg-accent-gold text-black font-bold shadow-md" : "text-gray-400 hover:text-white"
                )}
              >
                <RefreshCcw size={13} /> Quick Rotate
              </button>
              <button 
                onClick={() => setActiveTool('paint-I')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTool === 'paint-I' ? "bg-accent-gold text-black font-bold shadow-md" : "text-gray-400 hover:text-white"
                )}
              >
                <Edit3 size={13} /> Paint Straight (I)
              </button>
              <button 
                onClick={() => setActiveTool('paint-L')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTool === 'paint-L' ? "bg-accent-gold text-black font-bold shadow-md" : "text-gray-400 hover:text-white"
                )}
              >
                <Edit3 size={13} /> Paint Corner (L)
              </button>
              <button 
                onClick={() => setActiveTool('paint-T')}
                className={clsx(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                  activeTool === 'paint-T' ? "bg-accent-gold text-black font-bold shadow-md" : "text-gray-400 hover:text-white"
                )}
              >
                <Edit3 size={13} /> Paint Junction (T)
              </button>
            </div>
            
            <div className="text-xs text-gray-400 font-semibold uppercase tracking-wider bg-white/5 px-3.5 py-1.5 rounded-lg border border-white/5">
              Last shift: <span className="text-accent-cyan font-bold font-mono ml-1">{getLastShiftText()}</span>
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
          />

          {/* Extra Spare Tile Section */}
          <div className="mt-8 p-4.5 bg-black/35 rounded-2xl border border-white/10 w-full max-w-[650px] flex items-center justify-between shadow-lg">
            <div className="space-y-1">
              <h3 className="font-semibold text-sm flex items-center gap-1.5 text-white">
                Extra Spare Tile 🧩
              </h3>
              <p className="text-xs text-gray-400 leading-relaxed max-w-[320px]">
                Drag this spare tile and drop it on any board arrow, or select configuration options.
              </p>
            </div>
            
            <div className="flex gap-4 items-center bg-white/5 p-3 rounded-xl border border-white/5">
              {/* Draggable Spare Tile Wrapper */}
              <div 
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'spare-tile');
                  e.dataTransfer.effectAllowed = 'move';
                  playClickSound();
                }}
                className="w-16 h-16 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform duration-200"
                onClick={handleOpenSpareEditor}
                title="Drag this tile onto grid arrows, or click to edit in modal"
              >
                <Tile
                  shape={spareTile.shape}
                  dir={spareTile.dir}
                  treasure={spareTile.treasure}
                  isFixed={false}
                  pawns={[]}
                  className="rounded-lg shadow-md border-white/15"
                />
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={handleRotateSpare}
                  className="p-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors cursor-pointer text-gray-300 hover:text-white self-center active:scale-95"
                  title="Rotate Spare 90° Clockwise"
                >
                  <RotateCw size={14} />
                </button>
                <select
                  value={spareTile.shape}
                  onChange={(e) => handleUpdateSpareConfig('shape', e.target.value)}
                  className="bg-bg-secondary border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent-gold"
                >
                  <option value="I">Straight (I)</option>
                  <option value="L">Corner (L)</option>
                  <option value="T">Junction (T)</option>
                </select>
                <select
                  value={spareTile.treasure}
                  onChange={(e) => handleUpdateSpareConfig('treasure', e.target.value)}
                  className="bg-bg-secondary border border-white/10 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent-gold"
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
        />
      </main>

      {/* Floating Detailed Tile Editor Context Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="glass-panel border border-white/15 rounded-3xl w-full max-w-[420px] shadow-2xl p-6 flex flex-col gap-5 bg-bg-panel-solid/95 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-md font-bold text-white">
                {selectedTileCoord 
                  ? `Configure Tile at (${selectedTileCoord.r}, ${selectedTileCoord.c})` 
                  : 'Configure Extra Spare Tile'}
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-white text-xl leading-none font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              {/* Path Shape Option */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">Exit Corridor Shape</label>
                <div className="grid grid-cols-3 gap-2">
                  {['I', 'L', 'T'].map(sh => (
                    <button
                      key={sh}
                      onClick={() => setModalState(prev => ({ ...prev, shape: sh }))}
                      disabled={selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed}
                      className={clsx(
                        "py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                        modalState.shape === sh
                          ? "bg-accent-gold text-black border-accent-gold shadow-md font-bold"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10",
                        selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {sh === 'I' ? 'Straight (I)' : sh === 'L' ? 'Corner (L)' : 'Junction (T)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Rotation Option */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">Exits Rotation Angle</label>
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3].map(rot => (
                    <button
                      key={rot}
                      onClick={() => setModalState(prev => ({ ...prev, dir: rot }))}
                      disabled={selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed}
                      className={clsx(
                        "py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer",
                        modalState.dir === rot
                          ? "bg-accent-gold text-black border-accent-gold shadow-md font-bold"
                          : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10",
                        selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {rot * 90}°
                    </button>
                  ))}
                </div>
              </div>

              {/* Assigned Treasure Option */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-400">Assigned Treasure</label>
                <select
                  value={modalState.treasure}
                  onChange={(e) => setModalState(prev => ({ ...prev, treasure: e.target.value }))}
                  disabled={selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed}
                  className={clsx(
                    "w-full bg-bg-secondary border border-white/15 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-gold transition-colors",
                    selectedTileCoord && board[selectedTileCoord.r][selectedTileCoord.c].isFixed && "opacity-50 cursor-not-allowed"
                  )}
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
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-gray-400">Pawns Present on Tile</label>
                  <div className="grid grid-cols-4 gap-2">
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
                            "py-2 rounded-xl text-xs font-semibold transition-all border cursor-pointer capitalize",
                            present
                              ? color === 'red' ? "bg-pawn-red border-pawn-red text-white shadow-md font-bold"
                                : color === 'blue' ? "bg-pawn-blue border-pawn-blue text-white shadow-md font-bold"
                                : color === 'green' ? "bg-pawn-green border-pawn-green text-white shadow-md font-bold"
                                : "bg-pawn-yellow border-pawn-yellow text-black shadow-md font-bold"
                              : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10"
                          )}
                        >
                          {color}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end border-t border-white/5 pt-4 mt-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4.5 py-2 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl transition-colors cursor-pointer border border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModal}
                className="px-5 py-2 bg-gradient-to-br from-accent-gold to-yellow-600 text-black font-bold text-xs rounded-xl hover:shadow-lg transition-all cursor-pointer"
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
