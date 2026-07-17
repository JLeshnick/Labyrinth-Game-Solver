import type { Shape } from "../types";
import atlasConfig from "./atlas-config.json";

export interface TileTemplateEntry {
  treasureId: string;
  imageUrl: string;   // URL to load at runtime, e.g. ./tile-templates/lizard.jpg
  shape: Shape;
  enabled: boolean;
}

const TEMPLATES_BASE = "./tile-templates/";

export const TILE_TEMPLATE_ENTRIES: TileTemplateEntry[] = atlasConfig.tile_templates
  .filter((t) => t.enabled !== false)
  .map((t) => ({
    treasureId: t.treasure_id,
    imageUrl: TEMPLATES_BASE + t.image,
    shape: t.shape as Shape,
    enabled: t.enabled !== false,
  }));
