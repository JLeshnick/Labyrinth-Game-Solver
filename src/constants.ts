import type { TileData, Treasure } from "./types";

export const TREASURES: Treasure[] = [
  // Fixed T-Junction Treasures (12)
  { id: "book", name: "Book with Clasp" },
  { id: "coins", name: "Bag of Gold Coins" },
  { id: "map", name: "Treasure Map" },
  { id: "crown", name: "Gold Crown" },
  { id: "keys", name: "Set of Keys" },
  { id: "skull", name: "Skull" },
  { id: "ring", name: "Gold Ring" },
  { id: "chest", name: "Treasure Chest" },
  { id: "emerald", name: "Emerald Jewel" },
  { id: "sword", name: "Sword" },
  { id: "menorah", name: "Gold Menorah" },
  { id: "helmet", name: "Helmet Armor" },

  // Movable Corner Treasures (6)
  { id: "moth", name: "Moth" },
  { id: "bat", name: "Bat" },
  { id: "spider", name: "Spider on Web" },
  { id: "rat", name: "Rat" },
  { id: "owl", name: "Owl" },
  { id: "scarab", name: "Scarab Beetle" },

  // Movable T-Junction Treasures (6)
  { id: "ghost_foot", name: "Foot Ghost" },
  { id: "ghost_bottle", name: "Bottle Ghost" },
  { id: "sorceress", name: "Sorceress" },
  { id: "lady_pig", name: "Lady Pig" },
  { id: "dragon", name: "Dragon" },
  { id: "lizard", name: "Lizard" }
];

export const PAWNS = [
  { id: "red", name: "Red", colorClass: "bg-red-500", borderClass: "border-red-500" },
  { id: "blue", name: "Blue", colorClass: "bg-blue-500", borderClass: "border-blue-500" },
  { id: "green", name: "Green", colorClass: "bg-green-500", borderClass: "border-green-500" },
  { id: "yellow", name: "Yellow", colorClass: "bg-yellow-400", borderClass: "border-yellow-400" }
];

// Fixed tiles on the board game (16 total).
// Swapped Red and Yellow starting spots, and Green and Blue starting spots
// so Blue/Red are across from each other, and Green/Yellow are across from each other.
export const FIXED_TILES_PRESETS: Record<string, Partial<TileData>> = {
  "0,0": { shape: "corner", rotation: 90, color: "red" }, // Top-Left: Red
  "6,6": { shape: "corner", rotation: 270, color: "blue" }, // Bottom-Right: Blue

  "0,6": { shape: "corner", rotation: 0, color: "green" }, // Bottom-Left: Green
  "6,0": { shape: "corner", rotation: 180, color: "yellow" }, // Top-Right: Yellow

  "2,0": { shape: "t-junction", rotation: 180, treasure: TREASURES[0] },  // Book with Clasp
  "4,0": { shape: "t-junction", rotation: 180, treasure: TREASURES[1] },  // Bag of Gold Coins
  
  "0,2": { shape: "t-junction", rotation: 90, treasure: TREASURES[2] },   // Treasure Map
  "2,2": { shape: "t-junction", rotation: 90, treasure: TREASURES[3] },   // Gold Crown
  "4,2": { shape: "t-junction", rotation: 180, treasure: TREASURES[4] },  // Set of Keys
  "6,2": { shape: "t-junction", rotation: 270, treasure: TREASURES[5] },  // Skull
  
  "0,4": { shape: "t-junction", rotation: 90, treasure: TREASURES[6] },   // Gold Ring
  "2,4": { shape: "t-junction", rotation: 0, treasure: TREASURES[7] },    // Treasure Chest
  "4,4": { shape: "t-junction", rotation: 270, treasure: TREASURES[8] },  // Emerald Jewel
  "6,4": { shape: "t-junction", rotation: 270, treasure: TREASURES[9] },  // Sword
  
  "2,6": { shape: "t-junction", rotation: 0, treasure: TREASURES[10] },   // Gold Menorah
  "4,6": { shape: "t-junction", rotation: 0, treasure: TREASURES[11] }    // Helmet Armor
};

// Movable pool (34 total)
export function generateMovablePool(): TileData[] {
  const pool: TileData[] = [];

  // 13 Straights (Empty)
  for (let i = 0; i < 13; i++) {
    pool.push({
      id: `movable_straight_${i}`,
      shape: "straight",
      isFixed: false,
      rotation: 0
    });
  }

  // 9 Corners (Empty)
  for (let i = 0; i < 9; i++) {
    pool.push({
      id: `movable_corner_${i}`,
      shape: "corner",
      isFixed: false,
      rotation: 0
    });
  }

  // 6 Corner Treasures (moth, bat, spider, rat, owl, scarab)
  const cornerTreasures = TREASURES.slice(12, 18);
  cornerTreasures.forEach((treasure, i) => {
    pool.push({
      id: `movable_corner_t_${i}`,
      shape: "corner",
      treasure,
      isFixed: false,
      rotation: 0
    });
  });

  // 6 T-Junction Treasures (ghost_foot, ghost_bottle, sorceress, lady_pig, dragon, lizard)
  const tTreasures = TREASURES.slice(18, 24);
  tTreasures.forEach((treasure, i) => {
    pool.push({
      id: `movable_t_t_${i}`,
      shape: "t-junction",
      treasure,
      isFixed: false,
      rotation: 0
    });
  });

  return pool;
}

export const SHIFT_ARROWS = [
  { id: "row-1-left", type: "row", index: 1, dir: "left", label: "Row 1 Right", gridRow: 3, gridColumn: 1, x: 0, y: 1, insertionDir: "left" },
  { id: "row-1-right", type: "row", index: 1, dir: "right", label: "Row 1 Left", gridRow: 3, gridColumn: 9, x: 6, y: 1, insertionDir: "right" },
  { id: "row-3-left", type: "row", index: 3, dir: "left", label: "Row 3 Right", gridRow: 5, gridColumn: 1, x: 0, y: 3, insertionDir: "left" },
  { id: "row-3-right", type: "row", index: 3, dir: "right", label: "Row 3 Left", gridRow: 5, gridColumn: 9, x: 6, y: 3, insertionDir: "right" },
  { id: "row-5-left", type: "row", index: 5, dir: "left", label: "Row 5 Right", gridRow: 7, gridColumn: 1, x: 0, y: 5, insertionDir: "left" },
  { id: "row-5-right", type: "row", index: 5, dir: "right", label: "Row 5 Left", gridRow: 7, gridColumn: 9, x: 6, y: 5, insertionDir: "right" },
  
  { id: "col-1-top", type: "col", index: 1, dir: "top", label: "Col 1 Down", gridRow: 1, gridColumn: 3, x: 1, y: 0, insertionDir: "top" },
  { id: "col-1-bottom", type: "col", index: 1, dir: "bottom", label: "Col 1 Up", gridRow: 9, gridColumn: 3, x: 1, y: 6, insertionDir: "bottom" },
  { id: "col-3-top", type: "col", index: 3, dir: "top", label: "Col 3 Down", gridRow: 1, gridColumn: 5, x: 3, y: 0, insertionDir: "top" },
  { id: "col-3-bottom", type: "col", index: 3, dir: "bottom", label: "Col 3 Up", gridRow: 9, gridColumn: 5, x: 3, y: 6, insertionDir: "bottom" },
  { id: "col-5-top", type: "col", index: 5, dir: "top", label: "Col 5 Down", gridRow: 1, gridColumn: 7, x: 5, y: 0, insertionDir: "top" },
  { id: "col-5-bottom", type: "col", index: 5, dir: "bottom", label: "Col 5 Up", gridRow: 9, gridColumn: 7, x: 5, y: 6, insertionDir: "bottom" }
];
