import type { Shape, Rotation, BoardScanResult } from "../types";
import { TREASURE_ATLAS_TILES } from "../data/atlasLayout";

const TEMPLATE_SIZE = 64;
const ICON_SAMPLE_FRAC = 0.5; // center 50% of cell for treasure matching
const SHAPE_THRESHOLD = 0.55; // corridor pixel lightness threshold (0-1)
const TREASURE_AUTO = 0.80;
const TREASURE_FLAG = 0.55;

export interface CornerPoint {
  x: number;
  y: number;
}

// ── Utility ──────────────────────────────────────────────────────────────────

function createOffscreenCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function pixelLightness(r: number, g: number, b: number): number {
  return (Math.max(r, g, b) + Math.min(r, g, b)) / 510; // 0..1
}

// ── Template loading ──────────────────────────────────────────────────────────

export interface TileTemplate {
  treasureId: string;
  data: ImageData;
}

let cachedTemplates: TileTemplate[] | null = null;

export async function loadReferenceAtlas(atlasUrl: string): Promise<TileTemplate[]> {
  if (cachedTemplates) return cachedTemplates;
  const img = await loadImage(atlasUrl);
  const src = createOffscreenCanvas(img.naturalWidth, img.naturalHeight);
  const srcCtx = src.getContext("2d")!;
  srcCtx.drawImage(img, 0, 0);

  const templates: TileTemplate[] = [];
  for (const entry of TREASURE_ATLAS_TILES) {
    const crop = createOffscreenCanvas(TEMPLATE_SIZE, TEMPLATE_SIZE);
    const ctx = crop.getContext("2d")!;
    // Sample the center icon area from the atlas tile
    const margin = Math.round(entry.w * 0.25);
    const iconX = entry.x + margin;
    const iconY = entry.y + margin;
    const iconW = entry.w - margin * 2;
    const iconH = entry.h - margin * 2;
    ctx.drawImage(src, iconX, iconY, iconW, iconH, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
    templates.push({ treasureId: entry.treasureId!, data: ctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE) });
  }

  cachedTemplates = templates;
  return templates;
}

// ── Perspective warp ──────────────────────────────────────────────────────────
// Bilinear perspective warp mapping a quad (4 corners) to a flat grid.
// corners: [topLeft, topRight, bottomRight, bottomLeft]

function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }

export function warpBoardToCanvas(
  img: HTMLImageElement | HTMLCanvasElement,
  corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
  outputSize: number
): HTMLCanvasElement {
  const out = createOffscreenCanvas(outputSize, outputSize);
  const outCtx = out.getContext("2d")!;

  // Draw source image onto a temp canvas to get pixel data
  const src = createOffscreenCanvas(
    img instanceof HTMLImageElement ? img.naturalWidth : img.width,
    img instanceof HTMLImageElement ? img.naturalHeight : img.height
  );
  const srcCtx = src.getContext("2d")!;
  srcCtx.drawImage(img, 0, 0);
  const srcData = srcCtx.getImageData(0, 0, src.width, src.height);
  const outData = outCtx.createImageData(outputSize, outputSize);

  const [tl, tr, br, bl] = corners;

  for (let py = 0; py < outputSize; py++) {
    const ty = py / outputSize;
    for (let px = 0; px < outputSize; px++) {
      const tx = px / outputSize;
      // Bilinear interpolation across the quad
      const x = lerp(lerp(tl.x, tr.x, tx), lerp(bl.x, br.x, tx), ty);
      const y = lerp(lerp(tl.y, bl.y, ty), lerp(tr.y, br.y, ty), tx);
      const sx = Math.round(x);
      const sy = Math.round(y);
      if (sx < 0 || sy < 0 || sx >= src.width || sy >= src.height) continue;
      const si = (sy * src.width + sx) * 4;
      const di = (py * outputSize + px) * 4;
      outData.data[di] = srcData.data[si];
      outData.data[di + 1] = srcData.data[si + 1];
      outData.data[di + 2] = srcData.data[si + 2];
      outData.data[di + 3] = 255;
    }
  }

  outCtx.putImageData(outData, 0, 0);
  return out;
}

// ── Shape detection ───────────────────────────────────────────────────────────
// Sample the 4 corridor zones of a cell canvas.
// Each zone is a strip along one edge. If the average lightness > threshold → open.

interface ShapeResult {
  shape: Shape;
  rotation: Rotation;
  confidence: number;
}

function sampleZoneLightness(data: ImageData, zone: "N" | "S" | "E" | "W"): number {
  const w = data.width;
  const h = data.height;
  const stripFrac = 0.25; // corridor is middle 25% wide, extends 25% in from edge
  const stripW = Math.round(w * stripFrac);
  const stripH = Math.round(h * stripFrac);
  const cx = Math.round(w * 0.375);
  const cy = Math.round(h * 0.375);

  let x1: number, y1: number, x2: number, y2: number;
  if (zone === "N") { x1 = cx; y1 = 0;     x2 = cx + stripW; y2 = stripH; }
  else if (zone === "S") { x1 = cx; y1 = h - stripH; x2 = cx + stripW; y2 = h; }
  else if (zone === "W") { x1 = 0;     y1 = cy; x2 = stripW;     y2 = cy + stripH; }
  else               { x1 = w - stripW; y1 = cy; x2 = w;          y2 = cy + stripH; }

  let sum = 0, count = 0;
  for (let y = y1; y < y2; y++) {
    for (let x = x1; x < x2; x++) {
      const i = (y * w + x) * 4;
      sum += pixelLightness(data.data[i], data.data[i+1], data.data[i+2]);
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

export function detectTileShape(cellData: ImageData): ShapeResult {
  const n = sampleZoneLightness(cellData, "N") > SHAPE_THRESHOLD;
  const s = sampleZoneLightness(cellData, "S") > SHAPE_THRESHOLD;
  const e = sampleZoneLightness(cellData, "E") > SHAPE_THRESHOLD;
  const w = sampleZoneLightness(cellData, "W") > SHAPE_THRESHOLD;
  const openCount = [n, s, e, w].filter(Boolean).length;

  // straight: exactly 2 opposite sides open
  if (openCount === 2) {
    if (n && s) return { shape: "straight", rotation: 0, confidence: 0.9 };
    if (e && w) return { shape: "straight", rotation: 90, confidence: 0.9 };
  }
  // corner: exactly 2 adjacent sides open
  if (openCount === 2) {
    if (n && e) return { shape: "corner", rotation: 0, confidence: 0.85 };
    if (s && e) return { shape: "corner", rotation: 90, confidence: 0.85 };
    if (s && w) return { shape: "corner", rotation: 180, confidence: 0.85 };
    if (n && w) return { shape: "corner", rotation: 270, confidence: 0.85 };
  }
  // t-junction: exactly 3 sides open
  if (openCount === 3) {
    if (!s) return { shape: "t-junction", rotation: 0, confidence: 0.85 };
    if (!w) return { shape: "t-junction", rotation: 90, confidence: 0.85 };
    if (!n) return { shape: "t-junction", rotation: 180, confidence: 0.85 };
    if (!e) return { shape: "t-junction", rotation: 270, confidence: 0.85 };
  }
  // Ambiguous — fallback
  return { shape: "straight", rotation: 0, confidence: 0.3 };
}

// ── Treasure matching ─────────────────────────────────────────────────────────

interface TreasureResult {
  treasureId: string | null;
  confidence: number;
}

function normalizedCorrelation(a: ImageData, b: ImageData): number {
  const len = Math.min(a.data.length, b.data.length);
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < len; i += 4) {
    // Grayscale
    const ga = (a.data[i] + a.data[i+1] + a.data[i+2]) / 3;
    const gb = (b.data[i] + b.data[i+1] + b.data[i+2]) / 3;
    dot += ga * gb;
    magA += ga * ga;
    magB += gb * gb;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom > 0 ? dot / denom : 0;
}

function extractCenterCrop(cellData: ImageData, frac: number): ImageData {
  const w = cellData.width;
  const h = cellData.height;
  const margin = Math.round(w * (1 - frac) / 2);
  const cropW = w - margin * 2;
  const cropH = h - margin * 2;

  const canvas = createOffscreenCanvas(TEMPLATE_SIZE, TEMPLATE_SIZE);
  const ctx = canvas.getContext("2d")!;
  const src = createOffscreenCanvas(w, h);
  src.getContext("2d")!.putImageData(cellData, 0, 0);
  ctx.drawImage(src, margin, margin, cropW, cropH, 0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
  return ctx.getImageData(0, 0, TEMPLATE_SIZE, TEMPLATE_SIZE);
}

export function matchTreasure(cellData: ImageData, templates: TileTemplate[]): TreasureResult {
  if (templates.length === 0) return { treasureId: null, confidence: 0 };

  const crop = extractCenterCrop(cellData, ICON_SAMPLE_FRAC);
  let best = 0, bestId: string | null = null;

  for (const tmpl of templates) {
    const score = normalizedCorrelation(crop, tmpl.data);
    if (score > best) { best = score; bestId = tmpl.treasureId; }
  }

  if (best < TREASURE_FLAG) return { treasureId: null, confidence: best };
  return { treasureId: bestId, confidence: best };
}

// ── Fixed cell check ──────────────────────────────────────────────────────────

export function isFixedCell(row: number, col: number): boolean {
  return row % 2 === 0 && col % 2 === 0;
}

// ── Full scan pipeline ────────────────────────────────────────────────────────

export async function scanBoard(
  boardImageElement: HTMLImageElement | HTMLCanvasElement,
  corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint],
  atlasUrl: string,
  onProgress?: (pct: number) => void
): Promise<BoardScanResult> {
  const templates = await loadReferenceAtlas(atlasUrl);
  const CELL_SIZE = 96; // pixels per cell in warped output (7×7 = 672px output)
  const GRID_PX = CELL_SIZE * 7;

  const warpedBoard = warpBoardToCanvas(boardImageElement, corners, GRID_PX);
  const boardCtx = warpedBoard.getContext("2d")!;

  const results: BoardScanResult = [];
  let processed = 0;
  const movableCells = 33; // 7×7 minus 16 fixed

  for (let row = 0; row < 7; row++) {
    for (let col = 0; col < 7; col++) {
      if (isFixedCell(row, col)) continue;

      const px = col * CELL_SIZE;
      const py = row * CELL_SIZE;
      const cellData = boardCtx.getImageData(px, py, CELL_SIZE, CELL_SIZE);

      const { shape, rotation, confidence: shapeConf } = detectTileShape(cellData);
      const { treasureId, confidence: treasureConf } = matchTreasure(cellData, templates);

      // Combined confidence: shape detection weighted 60%, treasure 40%
      const combined = shapeConf * 0.6 + (treasureId !== null ? treasureConf * 0.4 : 0.4 * 0.5);
      const flagged = combined < TREASURE_AUTO;

      results.push({ row, col, shape, rotation, treasureId, confidence: combined, flagged });

      processed++;
      onProgress?.(Math.round((processed / movableCells) * 100));

      // Yield to keep UI responsive
      if (processed % 5 === 0) await new Promise((r) => setTimeout(r, 0));
    }
  }

  return results;
}
