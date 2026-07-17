import type { Shape, Rotation } from "../types";

export interface AtlasTile {
  tileId: string;
  shape: Shape;
  rotation: Rotation;
  treasureId: string | null;
  // Pixel bounds in Game_Board_Ref.png (1076×1076)
  x: number;
  y: number;
  w: number;
  h: number;
}

// The reference image is 1076×1076px.
// Tiles are ~150×150px with ~13px gaps, arranged in rows.
// Row start Y values: 30, 196, 362, 528, 694, 860
// Col start X values: 30, 193, 356, 519, 682, 845
// Tile size: 150×150
const T = 150;
const cols = [30, 193, 356, 519, 682, 845];
const rows = [30, 196, 362, 528, 694, 860];

function at(row: number, col: number): { x: number; y: number; w: number; h: number } {
  return { x: cols[col], y: rows[row], w: T, h: T };
}

// Mappings determined by visual inspection of Game_Board_Ref.png.
// Row 0 (top): green-home, dragon(corner), ring(corner), blank-straight, map(straight), sorceress(straight), red-home
//   The home tiles (green circle, red circle) are fixed tiles — we skip them for matching.
//   6 tiles per row × 6 rows = 36 tile positions, but layout is irregular.
//
// Actual tile layout (treasure tiles only need to be in the atlas for icon matching):
// Row 0: [0] green-home(skip), [1] dragon(corner), [2] ring(corner), [3] blank-straight, [4] map(straight), [5] sorceress(straight)
//         + red-home at far right (beyond col 5) — skip
// Row 1: [0] helmet(corner), [1] lady_pig(straight), [2] blank-corner, [3] blank-straight, [4] blank-straight, [5] moth(corner)
// Row 2: [0] menorah(corner), [1] bat(straight), [2] book(corner-treasure?), [3] blank-straight, [4] chest(corner), [5] spider(corner), + book(straight) at col 6
// Row 3: [0] blank-corner, [1] ghost_waving(straight), [2] blank-corner, [3] blank-straight(missing), [4] blank-straight(missing), [5] owl(corner)
// Row 4: [0] blank-corner, [1] ghost_bottle(straight), [2] emerald(straight), [3] blank-straight, [4] keys(straight), [5] rat(corner), [6] scarab(corner)
// Row 5: [0] blank-corner, [1] blank-corner, [skip], [2] blank-straight, [skip], [3] lizard(corner)
// Spare: [0] blank-t-junction

// NOTE: The "book" treasure in the reference image appears on a corner tile.
// Fixed-tile treasures (book, coins, map, crown, keys, skull, ring, chest, emerald, sword, menorah, helmet)
// appear on the movable tiles too — but in this game those are FIXED tiles only.
// The movable treasure tiles are: lizard, moth, owl, scarab, rat, spider (corner) + bat, dragon, ghost_bottle, ghost_waving, lady_pig, sorceress (straight)

export const ATLAS_TILES: AtlasTile[] = [
  // Row 0
  // [0] Green home — fixed, skip for matching
  // [1] Dragon — corner treasure
  { tileId: "movable_corner_t_0", shape: "corner", rotation: 0, treasureId: "dragon", ...at(0, 1) },
  // [2] Ring — corner, but ring is a FIXED tile treasure. This is likely a plain corner.
  //     Visual: shows a ring icon → must be movable_corner_t (but ring is index 6 = fixed).
  //     Re-examining: the treasure list — ring IS treasure[6] which is a fixed tile.
  //     However the atlas shows it as movable. Since ring only appears on fixed tiles in-game,
  //     this is simply a plain corner tile used as visual filler in the atlas.
  { tileId: "movable_corner_0", shape: "corner", rotation: 0, treasureId: null, ...at(0, 2) },
  // [3] blank straight
  { tileId: "movable_straight_0", shape: "straight", rotation: 0, treasureId: null, ...at(0, 3) },
  // [4] Map — straight treasure (map is treasure[2] = fixed tile). Again fixed-only. Plain straight.
  { tileId: "movable_straight_1", shape: "straight", rotation: 0, treasureId: null, ...at(0, 4) },
  // [5] Sorceress — straight treasure (movable)
  { tileId: "movable_straight_t_4", shape: "straight", rotation: 0, treasureId: "sorceress", ...at(0, 5) },

  // Row 1
  // [0] Helmet — corner. helmet is fixed-tile treasure[11]. This appears to be a movable corner tile in the atlas reference, displayed with the helmet icon to show all treasures. For template matching we only care about movable treasure tiles.
  { tileId: "movable_corner_1", shape: "corner", rotation: 0, treasureId: null, ...at(1, 0) },
  // [1] Lady Pig — straight treasure (movable)
  { tileId: "movable_straight_t_3", shape: "straight", rotation: 0, treasureId: "lady_pig", ...at(1, 1) },
  // [2] blank corner
  { tileId: "movable_corner_2", shape: "corner", rotation: 0, treasureId: null, ...at(1, 2) },
  // [3] blank straight
  { tileId: "movable_straight_2", shape: "straight", rotation: 0, treasureId: null, ...at(1, 3) },
  // [4] blank straight
  { tileId: "movable_straight_3", shape: "straight", rotation: 0, treasureId: null, ...at(1, 4) },
  // [5] Moth — corner treasure (movable)
  { tileId: "movable_corner_t_1", shape: "corner", rotation: 0, treasureId: "moth", ...at(1, 5) },

  // Row 2
  // [0] Menorah — corner. menorah is fixed-tile treasure[10]. Plain corner in atlas.
  { tileId: "movable_corner_3", shape: "corner", rotation: 0, treasureId: null, ...at(2, 0) },
  // [1] Bat — straight treasure (movable)
  { tileId: "movable_straight_t_0", shape: "straight", rotation: 0, treasureId: "bat", ...at(2, 1) },
  // [2] Book — corner. book is fixed-tile treasure[0]. Plain corner.
  { tileId: "movable_corner_4", shape: "corner", rotation: 0, treasureId: null, ...at(2, 2) },
  // [3] blank straight
  { tileId: "movable_straight_4", shape: "straight", rotation: 0, treasureId: null, ...at(2, 3) },
  // [4] Chest/jewel — corner. chest is fixed-tile treasure[7]. Plain corner.
  { tileId: "movable_corner_5", shape: "corner", rotation: 0, treasureId: null, ...at(2, 4) },
  // [5] Spider — corner treasure (movable)
  { tileId: "movable_corner_t_5", shape: "corner", rotation: 0, treasureId: "spider", ...at(2, 5) },

  // Row 3 — the layout has a gap in the middle (3 left, gap, 2 right based on image)
  // [0] blank corner
  { tileId: "movable_corner_6", shape: "corner", rotation: 0, treasureId: null, ...at(3, 0) },
  // [1] Ghost waving — straight treasure (movable)
  { tileId: "movable_straight_t_2", shape: "straight", rotation: 0, treasureId: "ghost_waving", ...at(3, 1) },
  // [2] blank corner
  { tileId: "movable_corner_7", shape: "corner", rotation: 0, treasureId: null, ...at(3, 2) },
  // [4] Owl — corner treasure (movable) — appears at col 4 position in image
  { tileId: "movable_corner_t_2", shape: "corner", rotation: 0, treasureId: "owl", ...at(3, 4) },

  // Row 4
  // [0] blank corner
  { tileId: "movable_corner_8", shape: "corner", rotation: 0, treasureId: null, ...at(4, 0) },
  // [1] Ghost bottle — straight treasure (movable)
  { tileId: "movable_straight_t_1", shape: "straight", rotation: 0, treasureId: "ghost_bottle", ...at(4, 1) },
  // [2] Emerald — straight. emerald is fixed-tile treasure[8]. Plain straight.
  { tileId: "movable_straight_5", shape: "straight", rotation: 0, treasureId: null, ...at(4, 2) },
  // [3] blank straight
  { tileId: "movable_straight_6", shape: "straight", rotation: 0, treasureId: null, ...at(4, 3) },
  // [4] Keys — straight. keys is fixed-tile treasure[4]. Plain straight.
  { tileId: "movable_straight_7", shape: "straight", rotation: 0, treasureId: null, ...at(4, 4) },
  // [5] Rat — corner treasure (movable)
  { tileId: "movable_corner_t_4", shape: "corner", rotation: 0, treasureId: "rat", ...at(4, 5) },

  // Row 5 (partial: left 2, gap, right 2)
  // [0] blank straight
  { tileId: "movable_straight_8", shape: "straight", rotation: 0, treasureId: null, ...at(5, 0) },
  // [1] blank straight
  { tileId: "movable_straight_9", shape: "straight", rotation: 0, treasureId: null, ...at(5, 1) },
  // [4] Lizard — corner treasure (movable)
  { tileId: "movable_corner_t_3", shape: "corner", rotation: 0, treasureId: "lizard", ...at(5, 4) },
  // [5] Scarab — corner treasure (movable) — appears at rightmost position
  { tileId: "movable_corner_t_0_scarab", shape: "corner", rotation: 0, treasureId: "scarab", ...at(5, 5) },
];

// The spare tile (bottom center of image) — t-junction shape, no treasure
// Approximate position: x=463, y=948, 150×150
export const ATLAS_SPARE: AtlasTile = {
  tileId: "spare",
  shape: "t-junction",
  rotation: 0,
  treasureId: null,
  x: 463,
  y: 948,
  w: T,
  h: T,
};

// Only the 12 movable treasure tiles matter for template matching.
// (Fixed-tile treasures like book/coins/map/crown/etc. are always pre-placed
// and do not need to be identified in the scanned board photo.)
export const TREASURE_ATLAS_TILES: AtlasTile[] = ATLAS_TILES.filter(
  (t) => t.treasureId !== null
);
