export const TREASURES = [
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

export const PAWNS = [
  { id: 'red', name: 'Red', colorClass: 'bg-pawn-red', textClass: 'text-white' },
  { id: 'blue', name: 'Blue', colorClass: 'bg-pawn-blue', textClass: 'text-white' },
  { id: 'green', name: 'Green', colorClass: 'bg-pawn-green', textClass: 'text-white' },
  { id: 'yellow', name: 'Yellow', colorClass: 'bg-pawn-yellow', textClass: 'text-black' }
];

export const FIXED_TILES = [
  // Row 0
  { r: 0, c: 0, shape: 'L', dir: 1, treasure: null, pawns: ['yellow'] },
  { r: 0, c: 2, shape: 'T', dir: 2, treasure: 'scroll' },
  { r: 0, c: 4, shape: 'T', dir: 2, treasure: 'potion' },
  { r: 0, c: 6, shape: 'L', dir: 2, treasure: null, pawns: ['green'] },
  // Row 2
  { r: 2, c: 0, shape: 'T', dir: 1, treasure: 'map' },
  { r: 2, c: 2, shape: 'T', dir: 1, treasure: 'crown' },
  { r: 2, c: 4, shape: 'T', dir: 2, treasure: 'gem' },
  { r: 2, c: 6, shape: 'T', dir: 3, treasure: 'ring' },
  // Row 4
  { r: 4, c: 0, shape: 'T', dir: 1, treasure: 'key' },
  { r: 4, c: 2, shape: 'T', dir: 0, treasure: 'coin' },
  { r: 4, c: 4, shape: 'T', dir: 3, treasure: 'sword' },
  { r: 4, c: 6, shape: 'T', dir: 3, treasure: 'shield' },
  // Row 6
  { r: 6, c: 0, shape: 'L', dir: 0, treasure: null, pawns: ['red'] },
  { r: 6, c: 2, shape: 'T', dir: 0, treasure: 'candle' },
  { r: 6, c: 4, shape: 'T', dir: 0, treasure: 'vase' },
  { r: 6, c: 6, shape: 'L', dir: 3, treasure: null, pawns: ['blue'] }
];

export const SHIFT_ARROWS = [
  { id: 'row-1-left', type: 'row', index: 1, dir: 'left', label: 'Row 1 Right', class: 'col-start-1 row-start-3 justify-self-end mr-2 rotate-0' },
  { id: 'row-1-right', type: 'row', index: 1, dir: 'right', label: 'Row 1 Left', class: 'col-start-9 row-start-3 justify-self-start ml-2 rotate-180' },
  { id: 'row-3-left', type: 'row', index: 3, dir: 'left', label: 'Row 3 Right', class: 'col-start-1 row-start-5 justify-self-end mr-2 rotate-0' },
  { id: 'row-3-right', type: 'row', index: 3, dir: 'right', label: 'Row 3 Left', class: 'col-start-9 row-start-5 justify-self-start ml-2 rotate-180' },
  { id: 'row-5-left', type: 'row', index: 5, dir: 'left', label: 'Row 5 Right', class: 'col-start-1 row-start-7 justify-self-end mr-2 rotate-0' },
  { id: 'row-5-right', type: 'row', index: 5, dir: 'right', label: 'Row 5 Left', class: 'col-start-9 row-start-7 justify-self-start ml-2 rotate-180' },
  
  { id: 'col-1-top', type: 'col', index: 1, dir: 'top', label: 'Col 1 Down', class: 'col-start-3 row-start-1 self-end mb-2 rotate-90' },
  { id: 'col-1-bottom', type: 'col', index: 1, dir: 'bottom', label: 'Col 1 Up', class: 'col-start-3 row-start-9 self-start mt-2 -rotate-90' },
  { id: 'col-3-top', type: 'col', index: 3, dir: 'top', label: 'Col 3 Down', class: 'col-start-5 row-start-1 self-end mb-2 rotate-90' },
  { id: 'col-3-bottom', type: 'col', index: 3, dir: 'bottom', label: 'Col 3 Up', class: 'col-start-5 row-start-9 self-start mt-2 -rotate-90' },
  { id: 'col-5-top', type: 'col', index: 5, dir: 'top', label: 'Col 5 Down', class: 'col-start-7 row-start-1 self-end mb-2 rotate-90' },
  { id: 'col-5-bottom', type: 'col', index: 5, dir: 'bottom', label: 'Col 5 Up', class: 'col-start-7 row-start-9 self-start mt-2 -rotate-90' }
];
