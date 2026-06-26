/**
 * Labyrinth Strategist - Application Logic
 * Manages state, board rendering, interaction toolbars, modal edits,
 * LocalStorage sync, and path suggestion overlays.
 */

// 24 Classic Treasures with their symbols and names
const TREASURES = [
  { id: 'dragon', symbol: '🐉', name: 'Dragon' },
  { id: 'ghost', symbol: '👻', name: 'Ghost' },
  { id: 'owl', symbol: '🦉', name: 'Owl' },
  { id: 'spider', symbol: '🕷️', name: 'Spider' },
  { id: 'bat', symbol: '🦇', name: 'Bat' },
  { id: 'mouse', symbol: '🐭', name: 'Mouse' },
  { id: 'lizard', symbol: '🦎', name: 'Lizard' },
  { id: 'butterfly', symbol: '🦋', name: 'Butterfly' },
  { id: 'crown', symbol: '👑', name: 'Crown' },
  { id: 'ring', symbol: '💍', name: 'Ring' },
  { id: 'gem', symbol: '💎', name: 'Gem' },
  { id: 'coin', symbol: '🪙', name: 'Coin' },
  { id: 'map', symbol: '🗺️', name: 'Map' },
  { id: 'key', symbol: '🔑', name: 'Key' },
  { id: 'potion', symbol: '🧪', name: 'Potion' },
  { id: 'scroll', symbol: '📜', name: 'Scroll' },
  { id: 'sword', symbol: '⚔️', name: 'Sword' },
  { id: 'shield', symbol: '🛡️', name: 'Shield' },
  { id: 'vase', symbol: '🏺', name: 'Vase' },
  { id: 'candle', symbol: '🕯️', name: 'Candle' },
  { id: 'backpack', symbol: '🎒', name: 'Backpack' },
  { id: 'compass', symbol: '🧭', name: 'Compass' },
  { id: 'horn', symbol: '📯', name: 'Horn' },
  { id: 'oldkey', symbol: '🗝️', name: 'Old Key' }
];

// App State
let board = [];
let spareTile = { shape: 'L', dir: 0, treasure: '', isFixed: false, pawns: [] };
let activePawn = 'red';
let handCards = [];
let activeTarget = null;
let activeTool = 'select'; // 'select', 'rotate', 'paint-I', 'paint-L', 'paint-T'
let lastShiftArrowId = null;

// Modal temporary state
let selectedTileCoord = null;
let modalState = { shape: 'I', dir: 0, treasure: '', pawns: [] };

// Initialize App
window.addEventListener('DOMContentLoaded', () => {
  populateDropdowns();
  initDefaultBoard();
  loadStateFromLocalStorage(true); // Attempt quiet initial load
  renderBoard();
  renderSpareTile();
  renderHand();
  triggerSolver();
});

// Populates dropdown lists with treasures
function populateDropdowns() {
  const treasureSelect = document.getElementById('treasure-select');
  const spareTreasureSelect = document.getElementById('spare-treasure-select');
  const modalTreasureSelect = document.getElementById('modal-treasure-select');
  
  // Clear first
  treasureSelect.innerHTML = '';
  spareTreasureSelect.innerHTML = '<option value="">No Treasure</option>';
  modalTreasureSelect.innerHTML = '<option value="">No Treasure</option>';
  
  TREASURES.forEach(t => {
    // Hand list
    const opt1 = document.createElement('option');
    opt1.value = t.id;
    opt1.textContent = `${t.symbol} ${t.name}`;
    treasureSelect.appendChild(opt1);
    
    // Spare config list
    const opt2 = document.createElement('option');
    opt2.value = t.id;
    opt2.textContent = `${t.symbol} ${t.name}`;
    spareTreasureSelect.appendChild(opt2);
    
    // Modal edit list
    const opt3 = document.createElement('option');
    opt3.value = t.id;
    opt3.textContent = `${t.symbol} ${t.name}`;
    modalTreasureSelect.appendChild(opt3);
  });
}

// Initial configuration for the standard Labyrinth board
function initDefaultBoard() {
  board = [];
  for (let r = 0; r < 7; r++) {
    const row = [];
    for (let c = 0; c < 7; c++) {
      row.push({
        r: r,
        c: c,
        shape: 'I',
        dir: 0,
        treasure: null,
        isFixed: false,
        pawns: []
      });
    }
    board.push(row);
  }

  // Define 16 Fixed Tiles Layout
  // Row 0
  configureFixedTile(0, 0, 'L', 1, null, ['yellow']);
  configureFixedTile(0, 2, 'T', 2, 'scroll'); // 📜
  configureFixedTile(0, 4, 'T', 2, 'potion'); // 🧪
  configureFixedTile(0, 6, 'L', 2, null, ['green']);

  // Row 2
  configureFixedTile(2, 0, 'T', 1, 'map');    // 🗺️
  configureFixedTile(2, 2, 'T', 1, 'crown');  // 👑
  configureFixedTile(2, 4, 'T', 2, 'gem');    // 💎
  configureFixedTile(2, 6, 'T', 3, 'ring');   // 💍

  // Row 4
  configureFixedTile(4, 0, 'T', 1, 'key');    // 🔑
  configureFixedTile(4, 2, 'T', 0, 'coin');   // 🪙
  configureFixedTile(4, 4, 'T', 3, 'sword');  // ⚔️
  configureFixedTile(4, 6, 'T', 3, 'shield'); // 🛡️

  // Row 6
  configureFixedTile(6, 0, 'L', 0, null, ['red']);
  configureFixedTile(6, 2, 'T', 0, 'candle'); // 🕯️
  configureFixedTile(6, 4, 'T', 0, 'vase');   // 🏺
  configureFixedTile(6, 6, 'L', 3, null, ['blue']);

  // Default setup for movable tiles (placed in non-fixed spaces)
  // Standard distribution of 33 movable board tiles:
  // 12 Straight (I), 10 Corners (L), 6 Corners with treasures, 6 Junctions with treasures.
  const movablePool = [
    // 12 Straight (I)
    ...Array(12).fill(null).map(() => ({ shape: 'I', treasure: null })),
    // 10 Corners (L)
    ...Array(10).fill(null).map(() => ({ shape: 'L', treasure: null })),
    // 6 Corners with treasures
    { shape: 'L', treasure: 'spider' },   // 🕷️
    { shape: 'L', treasure: 'bat' },      // 🦇
    { shape: 'L', treasure: 'owl' },      // 🦉
    { shape: 'L', treasure: 'mouse' },    // 🐭
    { shape: 'L', treasure: 'lizard' },   // 🦎
    { shape: 'L', treasure: 'butterfly' },// 🦋
    // 6 Junctions with treasures
    { shape: 'T', treasure: 'dragon' },   // 🐉
    { shape: 'T', treasure: 'ghost' },    // 👻
    { shape: 'T', treasure: 'backpack' }, // 🎒
    { shape: 'T', treasure: 'compass' },  // 🧭
    { shape: 'T', treasure: 'horn' },     // 📯
    { shape: 'T', treasure: 'oldkey' }    // 🗝️
  ];

  // Distribute movable pool onto the board sequentially (unshuffled default configuration)
  let poolIndex = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (!board[r][c].isFixed) {
        const item = movablePool[poolIndex++];
        board[r][c].shape = item.shape;
        board[r][c].treasure = item.treasure;
        board[r][c].dir = Math.floor(Math.random() * 4); // Random rotation
      }
    }
  }

  // The 34th tile is the starting spare tile
  spareTile = {
    shape: 'L',
    dir: 0,
    treasure: '',
    isFixed: false,
    pawns: []
  };
  
  lastShiftArrowId = null;
  document.getElementById('last-shift-display').textContent = 'None';
}

function configureFixedTile(r, c, shape, dir, treasure, pawns = []) {
  board[r][c].shape = shape;
  board[r][c].dir = dir;
  board[r][c].treasure = treasure;
  board[r][c].isFixed = true;
  board[r][c].pawns = pawns;
}

// Reset Board action
function resetBoardPreset() {
  initDefaultBoard();
  renderBoard();
  renderSpareTile();
  triggerSolver();
  showToast('Reset board to default standard anchors!');
}

// Randomizes all movable tiles (mimics shuffling & laying tiles during setup)
function shuffleMovableTiles() {
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

  // Fisher-Yates Shuffle
  for (let i = movablePool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [movablePool[i], movablePool[j]] = [movablePool[j], movablePool[i]];
  }

  // Place on board
  let poolIndex = 0;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (!board[r][c].isFixed) {
        const item = movablePool[poolIndex++];
        board[r][c].shape = item.shape;
        board[r][c].treasure = item.treasure;
        board[r][c].dir = Math.floor(Math.random() * 4);
      }
    }
  }

  // Last remaining tile in shuffled pool is the spare
  const spareItem = movablePool[poolIndex];
  spareTile = {
    shape: spareItem.shape,
    dir: Math.floor(Math.random() * 4),
    treasure: spareItem.treasure || '',
    isFixed: false,
    pawns: []
  };

  // Sync inputs
  document.getElementById('spare-shape-select').value = spareTile.shape;
  document.getElementById('spare-treasure-select').value = spareTile.treasure;

  lastShiftArrowId = null;
  document.getElementById('last-shift-display').textContent = 'None';

  renderBoard();
  renderSpareTile();
  triggerSolver();
  showToast('Shuffled movable board tiles randomly!');
}

// Render dynamic board tiles in grid
function renderBoard() {
  const gridContainer = document.getElementById('board-grid');
  
  // Clear any existing dynamic tiles (keep the static edge arrow divs)
  const tiles = gridContainer.querySelectorAll('.tile');
  tiles.forEach(t => t.remove());

  // Loop and insert dynamic tiles
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const tileData = board[r][c];
      const tileDiv = document.createElement('div');
      
      // CSS position coordinate placement
      tileDiv.className = 'tile';
      if (tileData.isFixed) tileDiv.classList.add('fixed');
      tileDiv.style.gridRow = r + 2;
      tileDiv.style.gridColumn = c + 2;
      tileDiv.dataset.r = r;
      tileDiv.dataset.c = c;
      
      // Double-click shortcut: Jump active pawn directly here
      tileDiv.addEventListener('dblclick', (e) => {
        e.preventDefault();
        movePawnToCoord(r, c, activePawn);
      });

      // Single-click editor tool binding
      tileDiv.addEventListener('click', () => handleTileClick(r, c));

      // Draw path connections
      const svg = createTileSVG(tileData.shape, tileData.dir);
      tileDiv.appendChild(svg);

      // Render treasure emoji
      if (tileData.treasure) {
        const treasure = TREASURES.find(t => t.id === tileData.treasure);
        if (treasure) {
          const tSpan = document.createElement('span');
          tSpan.className = 'treasure-icon';
          tSpan.textContent = treasure.symbol;
          tSpan.title = treasure.name;
          tileDiv.appendChild(tSpan);
        }
      }

      // Render Pawns
      if (tileData.pawns && tileData.pawns.length > 0) {
        const pawnsOverlay = document.createElement('div');
        pawnsOverlay.className = `pawns-overlay pawns-count-${tileData.pawns.length}`;
        
        tileData.pawns.forEach(pColor => {
          const pDiv = document.createElement('div');
          pDiv.className = `pawn pawn-${pColor}`;
          pawnsOverlay.appendChild(pDiv);
        });
        tileDiv.appendChild(pawnsOverlay);
      }

      gridContainer.appendChild(tileDiv);
    }
  }
  
  // Update arrow forbidden status
  const arrows = document.querySelectorAll('.arrow');
  arrows.forEach(arrow => {
    const arrowId = arrow.dataset.arrow;
    if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
      arrow.classList.add('forbidden');
      arrow.title = 'Rule Restriction: Cannot immediately reverse previous shift';
    } else {
      arrow.classList.remove('forbidden');
      arrow.title = arrow.className.includes('top') ? 'Slide Column Down' :
                    arrow.className.includes('bottom') ? 'Slide Column Up' :
                    arrow.className.includes('left') ? 'Slide Row Right' : 'Slide Row Left';
    }
  });
}

// Generate the vector SVGs for maze corridors
function createTileSVG(shape, dir) {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', '0 0 80 80');
  svg.style.transform = `rotate(${dir * 90}deg)`;

  const pathBg = document.createElementNS(ns, 'path');
  const pathFg = document.createElementNS(ns, 'path');
  pathBg.setAttribute('class', 'path-bg');
  pathFg.setAttribute('class', 'path-fg');

  let d = '';
  if (shape === 'I') {
    d = 'M 40 0 L 40 80';
  } else if (shape === 'L') {
    d = 'M 40 0 L 40 40 L 80 40';
  } else if (shape === 'T') {
    d = 'M 0 40 L 80 40 M 40 40 L 40 0';
  }

  pathBg.setAttribute('d', d);
  pathFg.setAttribute('d', d);
  
  svg.appendChild(pathBg);
  svg.appendChild(pathFg);
  return svg;
}

// Render the spare tile configurator slot
function renderSpareTile() {
  const slot = document.getElementById('spare-tile-slot');
  slot.innerHTML = '';

  const tileDiv = document.createElement('div');
  tileDiv.className = 'tile';
  tileDiv.title = 'Click to open details';
  
  const svg = createTileSVG(spareTile.shape, spareTile.dir);
  tileDiv.appendChild(svg);

  if (spareTile.treasure) {
    const treasure = TREASURES.find(t => t.id === spareTile.treasure);
    if (treasure) {
      const tSpan = document.createElement('span');
      tSpan.className = 'treasure-icon';
      tSpan.textContent = treasure.symbol;
      tileDiv.appendChild(tSpan);
    }
  }

  slot.appendChild(tileDiv);
}

// Rotate spare tile
function rotateSpareTile() {
  spareTile.dir = (spareTile.dir + 1) % 4;
  renderSpareTile();
  triggerSolver();
}

// Spare tile config update handlers
function updateSpareTileConfig() {
  spareTile.shape = document.getElementById('spare-shape-select').value;
  spareTile.treasure = document.getElementById('spare-treasure-select').value;
  renderSpareTile();
  triggerSolver();
}

// Active Editor tool setter
function setTool(tool) {
  activeTool = tool;
  
  const buttons = document.querySelectorAll('.tool-btn');
  buttons.forEach(b => b.classList.remove('active'));
  
  document.getElementById(`tool-${tool.replace('paint-', 'paint-')}`).classList.add('active');
}

// Handles grid mouse clicking depending on the active brush
function handleTileClick(r, c) {
  const tile = board[r][c];
  
  if (activeTool === 'select') {
    openEditModal(r, c);
  } else {
    // Quick paint brushes (skip fixed tiles)
    if (tile.isFixed) {
      showToast("Fixed tiles cannot be edited!");
      return;
    }
    
    if (activeTool === 'rotate') {
      tile.dir = (tile.dir + 1) % 4;
    } else if (activeTool === 'paint-I') {
      tile.shape = 'I';
    } else if (activeTool === 'paint-L') {
      tile.shape = 'L';
    } else if (activeTool === 'paint-T') {
      tile.shape = 'T';
    }
    
    renderBoard();
    triggerSolver();
  }
}

// Moves a pawn directly to coordinates
function movePawnToCoord(r, c, pawnColor) {
  // Remove pawn from old position
  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      board[row][col].pawns = (board[row][col].pawns || []).filter(p => p !== pawnColor);
    }
  }
  
  // Add to new position
  if (!board[r][c].pawns) board[r][c].pawns = [];
  board[r][c].pawns.push(pawnColor);
  
  renderBoard();
  triggerSolver();
  showToast(`Jumped ${pawnColor} pawn to (${r}, ${c})`);
}

// Set active solving player
function setActivePawn(pawnColor) {
  activePawn = pawnColor;
  
  const buttons = document.querySelectorAll('.pawn-select-btn');
  buttons.forEach(b => {
    b.classList.remove('active');
    if (b.dataset.pawn === pawnColor) b.classList.add('active');
  });
  
  triggerSolver();
}

// Shift Slide Event triggers (User slides board in helper)
function triggerSlide(arrowId) {
  if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
    showToast('Rule Restriction: Cannot shift opposite row/col immediately!');
    return;
  }

  const { type, index, dir } = parseArrowId(arrowId);
  const slideResult = executeSlideInGrid(board, spareTile, type, index, dir);
  
  spareTile = slideResult.newSpare;
  lastShiftArrowId = arrowId;
  
  // Update last shift visual indicator
  const arrowInfo = parseArrowId(arrowId);
  const formattedArrow = `${arrowInfo.type.toUpperCase()} ${arrowInfo.index} ${arrowInfo.dir.toUpperCase()}`;
  document.getElementById('last-shift-display').textContent = formattedArrow;
  
  // Sync spare selects
  document.getElementById('spare-shape-select').value = spareTile.shape;
  document.getElementById('spare-treasure-select').value = spareTile.treasure || '';

  renderBoard();
  renderSpareTile();
  triggerSolver();
  showToast(`Shifted ${formattedArrow}!`);
}

// Hand Card Management
function renderHand() {
  const container = document.getElementById('hand-cards-list');
  container.innerHTML = '';
  
  if (handCards.length === 0) {
    container.innerHTML = '<div style="font-size: 0.8rem; color: var(--text-secondary); width:100%; text-align:center;">No cards in hand.</div>';
    return;
  }

  handCards.forEach(cardId => {
    const treasure = TREASURES.find(t => t.id === cardId);
    if (!treasure) return;

    const token = document.createElement('div');
    token.className = 'hand-card-token';
    if (activeTarget === cardId) token.classList.add('active-target');
    
    token.textContent = `${treasure.symbol} ${treasure.name}`;
    token.addEventListener('click', () => {
      activeTarget = cardId;
      renderHand();
      triggerSolver();
    });

    container.appendChild(token);
  });
}

function addCardToHand() {
  const select = document.getElementById('treasure-select');
  const val = select.value;
  if (!val) return;

  if (handCards.includes(val)) {
    showToast('Card is already in your hand!');
    return;
  }

  handCards.push(val);
  if (!activeTarget) activeTarget = val; // Set as default active target if first
  
  renderHand();
  triggerSolver();
  showToast('Added card to hand!');
}

// Floating Tile Overlay Modal Actions
function openEditModal(r, c) {
  selectedTileCoord = { r, c };
  const tile = board[r][c];
  
  modalState = {
    shape: tile.shape,
    dir: tile.dir,
    treasure: tile.treasure || '',
    pawns: [...(tile.pawns || [])]
  };

  document.getElementById('modal-tile-title').textContent = `Edit Tile at (${r}, ${c}) ${tile.isFixed ? '[Fixed Anchor]' : ''}`;
  
  // Highlight shape buttons
  setModalShapeActive(modalState.shape);
  setModalRotationActive(modalState.dir);
  document.getElementById('modal-treasure-select').value = modalState.treasure;

  // Toggle pawns
  const colors = ['red', 'blue', 'green', 'yellow'];
  colors.forEach(col => {
    const btn = document.getElementById(`pawn-toggle-${col}`);
    if (modalState.pawns.includes(col)) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Highlight selection on board grid
  const tiles = document.querySelectorAll('.tile');
  tiles.forEach(t => t.classList.remove('selected'));
  const activeTileEl = document.querySelector(`.tile[data-r="${r}"][data-c="${c}"]`);
  if (activeTileEl) activeTileEl.classList.add('selected');

  document.getElementById('edit-modal-overlay').style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('edit-modal-overlay').style.display = 'none';
  const tiles = document.querySelectorAll('.tile');
  tiles.forEach(t => t.classList.remove('selected'));
}

function setModalShape(shape) {
  modalState.shape = shape;
  setModalShapeActive(shape);
}

function setModalShapeActive(shape) {
  const shapes = ['I', 'L', 'T'];
  shapes.forEach(s => {
    const btn = document.getElementById(`shape-btn-${s}`);
    if (s === shape) btn.classList.add('active');
    else btn.classList.remove('active');
  });
}

function setModalRotation(rot) {
  modalState.dir = rot;
  setModalRotationActive(rot);
}

function setModalRotationActive(rot) {
  for (let r = 0; r < 4; r++) {
    const btn = document.getElementById(`rot-btn-${r}`);
    if (r === rot) btn.classList.add('active');
    else btn.classList.remove('active');
  }
}

function toggleModalPawn(color) {
  const btn = document.getElementById(`pawn-toggle-${color}`);
  if (modalState.pawns.includes(color)) {
    modalState.pawns = modalState.pawns.filter(p => p !== color);
    btn.classList.remove('active');
  } else {
    modalState.pawns.push(color);
    btn.classList.add('active');
  }
}

function saveModalChanges() {
  if (!selectedTileCoord) return;
  const { r, c } = selectedTileCoord;
  const tile = board[r][c];

  if (tile.isFixed) {
    // Only allow editing pawns on fixed tiles
    tile.pawns = modalState.pawns;
  } else {
    tile.shape = modalState.shape;
    tile.dir = modalState.dir;
    tile.treasure = document.getElementById('modal-treasure-select').value || null;
    tile.pawns = modalState.pawns;
  }

  // Sync global pawn positions across the grid (each pawn color can only exist in 1 space)
  modalState.pawns.forEach(color => {
    for (let row = 0; row < 7; row++) {
      for (let col = 0; col < 7; col++) {
        if (row !== r || col !== c) {
          board[row][col].pawns = (board[row][col].pawns || []).filter(p => p !== color);
        }
      }
    }
  });

  closeEditModal();
  renderBoard();
  triggerSolver();
  showToast(`Saved changes for cell (${r}, ${c})`);
}

// Active Spare edit modal
function openSpareTileEditor() {
  selectedTileCoord = null;
  modalState = {
    shape: spareTile.shape,
    dir: spareTile.dir,
    treasure: spareTile.treasure || '',
    pawns: []
  };

  document.getElementById('modal-tile-title').textContent = 'Edit Extra Spare Tile';
  setModalShapeActive(modalState.shape);
  setModalRotationActive(modalState.dir);
  document.getElementById('modal-treasure-select').value = modalState.treasure;

  // Pawns cannot sit on spare tile
  const colors = ['red', 'blue', 'green', 'yellow'];
  colors.forEach(col => {
    document.getElementById(`pawn-toggle-${col}`).classList.remove('active');
  });

  document.getElementById('edit-modal-overlay').style.display = 'flex';
}

// Executes Solver Logic
// Executes Solver Logic
function triggerSolver() {
  const suggestionsList = document.getElementById('suggestions-list');
  suggestionsList.innerHTML = '';

  if (!handCards || handCards.length === 0) {
    suggestionsList.innerHTML = '<div class="no-suggestions">Add cards to your hand to calculate suggestions.</div>';
    return;
  }

  // Find active player pawn coordinate
  let pawnPos = null;
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      if (board[r][c].pawns && board[r][c].pawns.includes(activePawn)) {
        pawnPos = { r, c };
        break;
      }
    }
  }

  if (!pawnPos) {
    suggestionsList.innerHTML = `<div class="no-suggestions" style="color:var(--accent-red)">Active pawn (${activePawn.toUpperCase()}) not found on board. Set it in the active cell modal or double click a tile.</div>`;
    return;
  }

  const turnsSelect = document.getElementById('turns-select');
  const maxTurns = parseInt(turnsSelect.value, 10);

  // Compute standard BFS solutions for all hand cards simultaneously
  const solutions = solveAllHand(board, spareTile, pawnPos, handCards, lastShiftArrowId, maxTurns);

  renderSuggestions(solutions);
}

// Render computed path recommendations with safety block ratings
function renderSuggestions(solutions) {
  const container = document.getElementById('suggestions-list');
  container.innerHTML = '';

  if (!solutions || solutions.length === 0) {
    container.innerHTML = '<div class="no-suggestions">No options found. Try modifying the board layout!</div>';
    return;
  }

  solutions.forEach((path, pathIdx) => {
    const card = document.createElement('div');
    card.className = 'suggestion-card';
    if (activeTarget === path.cardId) card.classList.add('selected'); // Highlight current selected active target
    
    const info = document.createElement('div');
    info.className = 'suggestion-info';

    // Title description
    const title = document.createElement('div');
    title.className = 'suggestion-title';
    
    const tr = TREASURES.find(t => t.id === path.cardId);
    const trLabel = tr ? `${tr.symbol} ${tr.name}` : path.cardId;
    
    // Format suggestion details
    const stepCount = path.length;
    title.innerHTML = path.isFallback 
      ? `Approach to ${trLabel}`
      : `${stepCount} Turn Solution to ${trLabel}`;
    
    const desc = document.createElement('div');
    desc.className = 'suggestion-desc';
    
    // Generate text for move sequence
    let moveTexts = [];
    path.forEach((step, idx) => {
      const arrowParts = parseArrowId(step.arrowId);
      const formattedArrow = `${arrowParts.type.toUpperCase()} ${arrowParts.index} ${arrowParts.dir.toUpperCase()}`;
      const rotDeg = step.rotation * 90;
      moveTexts.push(`Turn ${idx+1}: Slide ${formattedArrow} (Rot: ${rotDeg}°)`);
    });

    if (path.isFallback) {
      desc.className += ' fallback';
      const lastStep = path[path.length - 1];
      desc.textContent = `Pawn ends at (${lastStep.endPos.r}, ${lastStep.endPos.c}), Distance remaining: ${lastStep.minDistance}`;
    } else {
      desc.innerHTML = moveTexts.join('<br>');
    }

    // Safety score formatting (Heuristics against opponent shifts)
    const safety = path.safetyScore || 0;
    let safetyLabel = 'Safe';
    let safetyColor = 'var(--pawn-green)';
    if (safety < 50) {
      safetyLabel = 'Risky';
      safetyColor = 'var(--accent-red)';
    } else if (safety < 80) {
      safetyLabel = 'Moderate';
      safetyColor = '#ff9500';
    }

    const safetyText = document.createElement('div');
    safetyText.style.fontSize = '0.75rem';
    safetyText.style.marginTop = '4px';
    safetyText.style.fontWeight = '500';
    safetyText.style.color = 'var(--text-secondary)';
    safetyText.innerHTML = `Block Resistance: <span style="color: ${safetyColor}; font-weight:600;">${safety}% (${safetyLabel})</span>`;

    info.appendChild(title);
    info.appendChild(desc);
    info.appendChild(safetyText);

    const badge = document.createElement('span');
    badge.className = 'suggestion-badge';
    if (path.isFallback) {
      badge.classList.add('fallback-badge');
      badge.textContent = 'Proximity';
    } else {
      badge.textContent = `${stepCount} Turn${stepCount > 1 ? 's' : ''}`;
    }

    card.appendChild(info);
    card.appendChild(badge);

    // Hover overlays: Render path preview
    card.addEventListener('mouseenter', () => highlightSuggestion(path));
    card.addEventListener('mouseleave', () => clearHighlight());
    
    // Clicking applies/executes the move
    card.addEventListener('click', () => {
      executeMoveSuggestion(path);
      clearHighlight();
    });

    container.appendChild(card);
  });
}

// Highlight arrow and draw coordinates path on board
function highlightSuggestion(path) {
  clearHighlight();
  if (!path || path.length === 0) return;

  // For visual simplicity, preview the FIRST turn of the path sequence
  const turn1 = path[0];
  
  // Highlight Arrow indicator
  const arrowEl = document.querySelector(`.arrow[data-arrow="${turn1.arrowId}"]`);
  if (arrowEl) arrowEl.classList.add('highlight-arrow');

  // We highlight the pawn path tiles
  if (turn1.pawnPath && turn1.pawnPath.length > 0) {
    turn1.pawnPath.forEach((cell, idx) => {
      const tileEl = document.querySelector(`.tile[data-r="${cell.r}"][data-c="${cell.c}"]`);
      if (tileEl) {
        tileEl.classList.add('highlight-path-tile');
        if (idx === 0) tileEl.classList.add('highlight-start');
        if (idx === turn1.pawnPath.length - 1) tileEl.classList.add('highlight-end');
      }
    });
  }
}

function clearHighlight() {
  const arrows = document.querySelectorAll('.arrow');
  arrows.forEach(a => a.classList.remove('highlight-arrow'));
  
  const tiles = document.querySelectorAll('.tile');
  tiles.forEach(t => {
    t.classList.remove('highlight-path-tile');
    t.classList.remove('highlight-start');
    t.classList.remove('highlight-end');
  });
}

// Executes a move recommendation inside the helper
function executeMoveSuggestion(path) {
  if (!path || path.length === 0) return;
  
  // We execute only the FIRST turn step. The player can re-solve for subsequent turns.
  const turn1 = path[0];
  const { type, index, dir } = parseArrowId(turn1.arrowId);
  
  // 1. Rotate spare to matching orientation
  spareTile.dir = turn1.rotation;
  
  // 2. Perform slide
  const slideResult = executeSlideInGrid(board, spareTile, type, index, dir);
  spareTile = slideResult.newSpare;
  lastShiftArrowId = turn1.arrowId;

  // 3. Move pawn to suggested endpoint
  const finalPos = turn1.endPos;
  
  // Clear pawn old position
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      board[r][c].pawns = (board[r][c].pawns || []).filter(p => p !== activePawn);
    }
  }

  // Update pawn on grid
  if (!board[finalPos.r][finalPos.c].pawns) board[finalPos.r][finalPos.c].pawns = [];
  board[finalPos.r][finalPos.c].pawns.push(activePawn);

  // Sync spare selects
  document.getElementById('spare-shape-select').value = spareTile.shape;
  document.getElementById('spare-treasure-select').value = spareTile.treasure || '';
  
  // Update last shift visual indicator
  const arrowInfo = parseArrowId(turn1.arrowId);
  const formattedArrow = `${arrowInfo.type.toUpperCase()} ${arrowInfo.index} ${arrowInfo.dir.toUpperCase()}`;
  document.getElementById('last-shift-display').textContent = formattedArrow;

  // Re-render
  renderBoard();
  renderSpareTile();
  
  // Check if player reached their goal
  if (board[finalPos.r][finalPos.c].treasure === path.cardId) {
    showToast(`Collected Goal Card: ${path.cardId.toUpperCase()}! 🏆`);
    // Remove from hand
    handCards = handCards.filter(c => c !== path.cardId);
    activeTarget = handCards.length > 0 ? handCards[0] : null;
    renderHand();
  } else {
    showToast(`Executed step: Pawn moved to (${finalPos.r}, ${finalPos.c})`);
  }

  triggerSolver();
}

// LocalStorage State Syncing
function saveState() {
  const state = {
    board: board,
    spareTile: spareTile,
    activePawn: activePawn,
    handCards: handCards,
    activeTarget: activeTarget,
    lastShiftArrowId: lastShiftArrowId
  };
  
  localStorage.setItem('labyrinth_strategist_state', JSON.stringify(state));
  showToast('State Saved Successfully! 💾');
}

function loadState() {
  const success = loadStateFromLocalStorage(false);
  if (success) {
    showToast('State Loaded Successfully! 📂');
  }
}

function loadStateFromLocalStorage(quiet = false) {
  try {
    const raw = localStorage.getItem('labyrinth_strategist_state');
    if (!raw) {
      if (!quiet) showToast('No saved state found.');
      return false;
    }
    
    const state = JSON.parse(raw);
    if (!state.board || !state.spareTile) return false;
    
    board = state.board;
    spareTile = state.spareTile;
    activePawn = state.activePawn || 'red';
    handCards = state.handCards || [];
    activeTarget = state.activeTarget || null;
    lastShiftArrowId = state.lastShiftArrowId || null;
    
    // Sync UI elements
    setActivePawn(activePawn);
    document.getElementById('spare-shape-select').value = spareTile.shape;
    document.getElementById('spare-treasure-select').value = spareTile.treasure || '';
    
    if (lastShiftArrowId) {
      const arrowInfo = parseArrowId(lastShiftArrowId);
      document.getElementById('last-shift-display').textContent = `${arrowInfo.type.toUpperCase()} ${arrowInfo.index} ${arrowInfo.dir.toUpperCase()}`;
    } else {
      document.getElementById('last-shift-display').textContent = 'None';
    }
    
    renderBoard();
    renderSpareTile();
    renderHand();
    triggerSolver();
    return true;
  } catch (err) {
    console.error('Error loading state from localStorage:', err);
    return false;
  }
}

// Toast message helpers
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'show';
  setTimeout(() => {
    toast.className = toast.className.replace('show', '');
  }, 3000);
}
