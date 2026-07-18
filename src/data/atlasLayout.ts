import type { Shape } from "../types";
import atlasConfig from "./atlas-config.json";

export interface TileTemplateEntry {
  treasureId: string | null; // null means blank tile
  imageUrl: string;
  shape: Shape;
  enabled: boolean;
}

const TEMPLATES_BASE = "./tile-templates/";

// '__blank__' in the JSON becomes treasureId: null in code
export const TILE_TEMPLATE_ENTRIES: TileTemplateEntry[] = atlasConfig.tile_templates
  .filter((t) => t.enabled !== false)
  .map((t) => ({
    treasureId: t.treasure_id === "__blank__" ? null : t.treasure_id,
    imageUrl: TEMPLATES_BASE + t.image,
    shape: t.shape as Shape,
    enabled: t.enabled !== false,
  }));
