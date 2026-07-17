import type { Shape, Rotation } from "../types";
import atlasConfig from "./atlas-config.json";

export interface AtlasTile {
  tileId: string;
  shape: Shape;
  rotation: Rotation;
  treasureId: string | null;
  // Pixel bounds in Game_Board_Ref.png
  x: number;
  y: number;
  w: number;
  h: number;
}

// ── Pixel coordinate calculation ──────────────────────────────────────────────
// Derives the bounding box for each tile from the image_info in atlas-config.json.

const { tile_size: T, gap: G, margin_x: MX, margin_y: MY } = atlasConfig.image_info;

function colToX(col: number): number {
  return MX + col * (T + G);
}

function rowToY(row: number): number {
  return MY + row * (T + G);
}

// ── tileId generator ──────────────────────────────────────────────────────────
// Assigns stable IDs matching generateMovablePool() in constants.ts.
// We need one ID per non-skipped entry; for treasure tiles the ID is determined
// by the treasure; for blank tiles we use counters per shape.

let _cornerCount = 0;
let _straightCount = 0;
let _tjunctionCount = 0;

function nextBlankId(shape: Shape): string {
  if (shape === "corner")     return `movable_corner_${_cornerCount++}`;
  if (shape === "straight")   return `movable_straight_${_straightCount++}`;
  return                             `movable_tjunction_${_tjunctionCount++}`;
}

const TREASURE_TO_TILE_ID: Record<string, string> = {
  // Corner treasures — indices 0-5 from generateMovablePool
  lizard:      "movable_corner_t_0",
  moth:        "movable_corner_t_1",
  owl:         "movable_corner_t_2",
  scarab:      "movable_corner_t_3",
  rat:         "movable_corner_t_4",
  spider:      "movable_corner_t_5",
  // T-junction treasures — indices 0-5
  bat:         "movable_tjunction_t_0",
  dragon:      "movable_tjunction_t_1",
  ghost_bottle: "movable_tjunction_t_2",
  ghost_waving: "movable_tjunction_t_3",
  lady_pig:    "movable_tjunction_t_4",
  sorceress:   "movable_tjunction_t_5",
};

// ── Build ATLAS_TILES from config ─────────────────────────────────────────────

// Reset counters each time this module is evaluated (important for HMR)
_cornerCount = 0;
_straightCount = 0;
_tjunctionCount = 0;

export const ATLAS_TILES: AtlasTile[] = atlasConfig.tiles
  .filter((entry) => !(entry as { skip?: boolean }).skip)
  .map((entry) => {
    const e = entry as {
      row: number;
      col: number;
      shape: string;
      treasure_id: string | null;
    };
    const treasureId = e.treasure_id ?? null;
    const tileId = treasureId
      ? TREASURE_TO_TILE_ID[treasureId] ?? `unknown_${treasureId}`
      : nextBlankId(e.shape as Shape);

    return {
      tileId,
      shape: e.shape as Shape,
      rotation: 0 as Rotation,
      treasureId,
      x: colToX(e.col),
      y: rowToY(e.row),
      w: T,
      h: T,
    };
  });

// Spare tile
export const ATLAS_SPARE: AtlasTile = {
  tileId: "spare",
  shape: atlasConfig.spare.shape as Shape,
  rotation: 0 as Rotation,
  treasureId: null,
  x: atlasConfig.spare.pixel_x,
  y: atlasConfig.spare.pixel_y,
  w: T,
  h: T,
};

// Only the 12 movable treasure tiles matter for template matching.
export const TREASURE_ATLAS_TILES: AtlasTile[] = ATLAS_TILES.filter(
  (t) => t.treasureId !== null
);
