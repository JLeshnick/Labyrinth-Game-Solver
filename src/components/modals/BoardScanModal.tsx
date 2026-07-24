import { useState, useRef, useCallback, useEffect } from "react";
import { Camera, CheckCircle2, AlertTriangle, ChevronRight, Upload, RotateCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { scanBoard, isFixedCell, loadTileTemplates } from "../../lib/boardScanner";
import type { CornerPoint } from "../../lib/boardScanner";
import type { TileData, BoardScanResult } from "../../types";
import { generateMovablePool, FIXED_TILES_PRESETS } from "../../constants";
import { TILE_TEMPLATE_ENTRIES } from "../../data/atlasLayout";

type Step = "upload" | "align" | "scanning" | "results";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (grid: (TileData | null)[][], looseTiles: TileData[]) => void;
}

// ── Grid preview ──────────────────────────────────────────────────────────────
function MiniGrid({ results }: { results: BoardScanResult }) {
  const map = new Map(results.map((c) => [`${c.row},${c.col}`, c]));

  return (
    <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
      {Array.from({ length: 7 }, (_, row) =>
        Array.from({ length: 7 }, (_, col) => {
          const key = `${row},${col}`;
          if (isFixedCell(row, col)) {
            return (
              <div key={key} className="w-7 h-7 rounded-sm bg-amber-900/60 border border-amber-700/40 flex items-center justify-center">
                <span className="text-[7px] text-amber-600">F</span>
              </div>
            );
          }
          const cell = map.get(key);
          if (!cell) return <div key={key} className="w-7 h-7 rounded-sm bg-stone-800" />;
          const bg = !cell.flagged
            ? "bg-green-900/40 border-green-700/40"
            : cell.confidence >= 0.55
            ? "bg-amber-900/40 border-amber-700/40"
            : "bg-red-900/40 border-red-600/40";
          return (
            <div key={key} className={`w-7 h-7 rounded-sm border flex flex-col items-center justify-center gap-0 ${bg}`}>
              <span className="text-[6px] text-stone-300 leading-none capitalize">{cell.shape[0]}</span>
              {cell.treasureId && (
                <span className="text-[5px] text-amber-300 leading-none truncate max-w-full px-0.5">{cell.treasureId.slice(0, 4)}</span>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// Corner order matches the app's board orientation (clockwise from top-left):
//   [0] Yellow TL — yellow pawn's home corner (row 0, col 6 in app = top-right, but visually TL here)
//   [1] Blue   TR
//   [2] Green  BR
//   [3] Red    BL
// App layout (FIXED_TILES_PRESETS): Red=(0,0) TL, Blue=(6,6) BR, Green=(6,0) BL, Yellow=(0,6) TR
// Clockwise from TL: Red → Yellow → Blue → Green
// So handle order [TL, TR, BR, BL] = [Red, Yellow, Blue, Green]
const CORNER_COLORS = ["bg-red-500", "bg-yellow-400", "bg-blue-500", "bg-green-500"];
const CORNER_LABELS = ["Red\nTL", "Yellow\nTR", "Blue\nBR", "Green\nBL"];
const CORNER_SHORT  = ["R", "Y", "B", "G"];

// ── Template availability status ─────────────────────────────────────────────

function TemplateStatus() {
  const treasureCount = TILE_TEMPLATE_ENTRIES.filter((t) => t.treasureId !== null).length;
  const blankCount = TILE_TEMPLATE_ENTRIES.filter((t) => t.treasureId === null).length;
  const total = TILE_TEMPLATE_ENTRIES.length;

  if (total === 0) {
    return (
      <div className="text-[11px] text-amber-400 bg-amber-950/30 border border-amber-800/40 rounded-lg px-3 py-2">
        No tile photos added yet. Shape detection still works. Add closeup photos
        to <code className="font-mono text-amber-300">public/tile-templates/</code> for
        treasure identification.
      </div>
    );
  }
  return (
    <div className="text-[11px] text-stone-400 bg-stone-900/50 border border-stone-800 rounded-lg px-3 py-2 flex flex-col gap-0.5">
      <span>
        <span className="text-stone-300 font-semibold">{treasureCount} treasure</span>
        {blankCount > 0 && (
          <span> + <span className="text-stone-300 font-semibold">{blankCount} blank</span></span>
        )} tile photo{total !== 1 ? "s" : ""} configured.
        {blankCount === 0 && (
          <span className="text-amber-400"> Add blank tile photos for best accuracy.</span>
        )}
      </span>
      <span>Photos go in <code className="font-mono text-stone-500">public/tile-templates/</code>.</span>
    </div>
  );
}

// ── Corner drag handle ────────────────────────────────────────────────────────
interface AlignStepProps {
  imgSrc: string;
  photoRotation: number;
  onRotatePhoto: () => void;
  corners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint];
  onCornersChange: (c: [CornerPoint, CornerPoint, CornerPoint, CornerPoint]) => void;
  onScan: () => void;
}

function AlignStep({ imgSrc, photoRotation, onRotatePhoto, corners, onCornersChange, onScan }: AlignStepProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<number | null>(null);

  const toPercent = (pt: CornerPoint) => ({
    x: (pt.x * 100).toFixed(2) + "%",
    y: (pt.y * 100).toFixed(2) + "%",
  });

  const startDrag = (idx: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = idx;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (dragging.current === null || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
      const y = Math.min(1, Math.max(0, (e.clientY - rect.top) / rect.height));
      const next = [...corners] as [CornerPoint, CornerPoint, CornerPoint, CornerPoint];
      next[dragging.current] = { x, y };
      onCornersChange(next);
    },
    [corners, onCornersChange]
  );

  const onPointerUp = () => { dragging.current = null; };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-stone-400 flex-1">
          Drag the corner handles to match each pawn's home corner. Rotate the photo if needed.
        </p>
        <button
          onClick={onRotatePhoto}
          className="shrink-0 flex items-center gap-1 text-xs text-stone-300 neo-brutalism-button rounded-lg px-2 py-1.5"
          title="Rotate photo 90° clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Rotate
        </button>
      </div>
      {/* Corner color legend */}
      <div className="flex gap-2 flex-wrap text-[10px]">
        {CORNER_LABELS.map((label, i) => (
          <span key={i} className="flex items-center gap-1 text-stone-400">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${CORNER_COLORS[i]}`} />
            {label.replace("\n", " ")}
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className="relative w-full aspect-square overflow-hidden rounded-lg border border-stone-700 select-none touch-none cursor-crosshair"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          src={imgSrc}
          className="w-full h-full object-contain transition-transform duration-200"
          style={{ transform: `rotate(${photoRotation}deg)` }}
          alt="Board photo"
          draggable={false}
        />

        {/* Grid overlay SVG */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          {/* Outer quad */}
          <polygon
            points={corners.map((c) => `${c.x * 100},${c.y * 100}`).join(" ")}
            fill="none"
            stroke="rgba(245,158,11,0.6)"
            strokeWidth="0.5"
          />
          {/* 7×7 grid lines */}
          {Array.from({ length: 8 }, (_, i) => {
            const t = i / 7;
            const [tl, tr, br, bl] = corners;
            const lx = tl.x + (bl.x - tl.x) * t;
            const ly = tl.y + (bl.y - tl.y) * t;
            const rx = tr.x + (br.x - tr.x) * t;
            const ry = tr.y + (br.y - tr.y) * t;
            const tx2 = tl.x + (tr.x - tl.x) * t;
            const ty2 = tl.y + (tr.y - tl.y) * t;
            const bx2 = bl.x + (br.x - bl.x) * t;
            const by2 = bl.y + (br.y - bl.y) * t;
            return (
              <g key={i}>
                <line x1={lx * 100} y1={ly * 100} x2={rx * 100} y2={ry * 100} stroke="rgba(245,158,11,0.4)" strokeWidth="0.3" />
                <line x1={tx2 * 100} y1={ty2 * 100} x2={bx2 * 100} y2={by2 * 100} stroke="rgba(245,158,11,0.4)" strokeWidth="0.3" />
              </g>
            );
          })}
        </svg>

        {/* Corner handles */}
        {corners.map((c, i) => (
          <div
            key={i}
            onPointerDown={startDrag(i)}
            className={`absolute w-7 h-7 rounded-full ${CORNER_COLORS[i]} border-2 border-white shadow-lg cursor-grab active:cursor-grabbing flex items-center justify-center pointer-events-auto`}
            style={{ left: toPercent(c).x, top: toPercent(c).y, transform: "translate(-50%, -50%)" }}
          >
            <span className="text-[9px] font-bold text-white">{CORNER_SHORT[i]}</span>
          </div>
        ))}
      </div>

      <Button
        onClick={onScan}
        className="w-full bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold min-h-11 rounded-xl flex items-center justify-center gap-2"
      >
        <Camera className="w-4 h-4" />
        Scan Board
      </Button>
    </div>
  );
}

// ── Main modal ────────────────────────────────────────────────────────────────

export function BoardScanModal({ open, onClose, onApply }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [photoRotation, setPhotoRotation] = useState(0); // 0, 90, 180, 270
  const [corners, setCorners] = useState<[CornerPoint, CornerPoint, CornerPoint, CornerPoint]>([
    { x: 0.05, y: 0.05 },
    { x: 0.95, y: 0.05 },
    { x: 0.95, y: 0.95 },
    { x: 0.05, y: 0.95 },
  ]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BoardScanResult>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Preload templates when modal opens (no-op if already cached)
  useEffect(() => {
    if (open) loadTileTemplates().catch(() => {/* photos not present yet — ok */});
  }, [open]);

  // Reset on close
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setImgSrc(null);
      setImgEl(null);
      setPhotoRotation(0);
      setResults([]);
      setError(null);
      setProgress(0);
    }
  }, [open]);

  const handleRotatePhoto = () => {
    setPhotoRotation((prev) => (prev + 90) % 360);
    // Reset corners to defaults when rotating so they stay sensible
    setCorners([
      { x: 0.05, y: 0.05 },
      { x: 0.95, y: 0.05 },
      { x: 0.95, y: 0.95 },
      { x: 0.05, y: 0.95 },
    ]);
  };

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please upload an image file."); return; }
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => { setImgEl(img); setStep("align"); };
    img.onerror = () => setError("Could not load image.");
    img.src = url;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleScan = async () => {
    if (!imgEl) return;
    setStep("scanning");
    setProgress(0);
    setError(null);
    try {
      // Build a rotated canvas if the user rotated the photo preview
      let scanSource: HTMLImageElement | HTMLCanvasElement = imgEl;
      let scanW = imgEl.naturalWidth;
      let scanH = imgEl.naturalHeight;

      if (photoRotation !== 0) {
        const swapped = photoRotation === 90 || photoRotation === 270;
        const cW = swapped ? imgEl.naturalHeight : imgEl.naturalWidth;
        const cH = swapped ? imgEl.naturalWidth : imgEl.naturalHeight;
        const c = document.createElement("canvas");
        c.width = cW; c.height = cH;
        const ctx = c.getContext("2d")!;
        ctx.translate(cW / 2, cH / 2);
        ctx.rotate((photoRotation * Math.PI) / 180);
        ctx.drawImage(imgEl, -imgEl.naturalWidth / 2, -imgEl.naturalHeight / 2);
        scanSource = c;
        scanW = cW;
        scanH = cH;
      }

      // Convert fractional corners to absolute pixel coords on the (possibly rotated) image
      const absCorners: [CornerPoint, CornerPoint, CornerPoint, CornerPoint] = corners.map((c) => ({
        x: c.x * scanW,
        y: c.y * scanH,
      })) as [CornerPoint, CornerPoint, CornerPoint, CornerPoint];

      const scanResults = await scanBoard(scanSource, absCorners, setProgress);
      setResults(scanResults);
      setStep("results");
    } catch (err) {
      setError("Scan failed: " + (err instanceof Error ? err.message : String(err)));
      setStep("align");
    }
  };

  const handleApply = () => {
    const pool = generateMovablePool();

    const newGrid: (TileData | null)[][] = Array(7).fill(null).map(() => Array(7).fill(null));

    // Place fixed tiles
    Object.entries(FIXED_TILES_PRESETS).forEach(([coord, partial]) => {
      const [x, y] = coord.split(",").map(Number);
      newGrid[y][x] = {
        id: `fixed_${x}_${y}`,
        shape: partial.shape!,
        rotation: partial.rotation!,
        treasure: partial.treasure,
        isFixed: true,
        color: partial.color,
      };
    });

    // Track which movable tiles are placed
    const usedIds = new Set<string>();
    const placedResults: BoardScanResult = [];

    for (const cell of results) {
      // Skip cells that are too uncertain to place
      if (cell.confidence < 0.35) continue;

      // Find a matching tile from the pool
      const candidate = pool.find((t) => {
        if (usedIds.has(t.id)) return false;
        if (t.shape !== cell.shape) return false;
        if (cell.treasureId) {
          return t.treasure?.id === cell.treasureId;
        }
        return !t.treasure;
      });

      if (!candidate) continue;

      usedIds.add(candidate.id);
      newGrid[cell.row][cell.col] = {
        ...candidate,
        rotation: cell.rotation,
      };
      placedResults.push(cell);
    }

    // Remaining unplaced tiles become the loose tile pool
    const remaining = pool.filter((t) => !usedIds.has(t.id));

    onApply(newGrid, remaining);
    onClose();
  };

  const flaggedCount = results.filter((c) => c.flagged).length;
  const autoCount = results.filter((c) => !c.flagged).length;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md text-stone-100 rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-stone-100">
            <Camera className="w-5 h-5 text-theme-primary" />
            Scan Board Photo
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-stone-400">
              Upload a photo of your assembled board. The app detects tile shapes and treasures on your device — no internet required.
            </p>
            {/* Template availability summary */}
            <TemplateStatus />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div
              className="neo-brutalism-button border-dashed border-stone-700 hover:border-theme-primary rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-8 h-8 text-stone-500" />
              <span className="text-sm text-stone-400">Tap to upload or drag & drop</span>
              <span className="text-xs text-stone-600">JPG, PNG, HEIC, etc.</span>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>
        )}

        {/* Step: Align */}
        {step === "align" && imgSrc && (
          <AlignStep
            imgSrc={imgSrc}
            photoRotation={photoRotation}
            onRotatePhoto={handleRotatePhoto}
            corners={corners}
            onCornersChange={setCorners}
            onScan={handleScan}
          />
        )}

        {/* Step: Scanning */}
        {step === "scanning" && (
          <div className="flex flex-col items-center gap-4 py-6">
            <Camera className="w-10 h-10 text-theme-primary animate-pulse" />
            <p className="text-sm text-stone-300">Analyzing board…</p>
            <div className="w-full bg-stone-900 border-2 border-stone-950 rounded h-3">
              <div
                className="h-full rounded-sm bg-theme-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-stone-500">{progress}% complete</span>
          </div>
        )}

        {/* Step: Results */}
        {step === "results" && (
          <div className="flex flex-col gap-4">
            {/* Summary */}
            <div className="flex gap-3 text-xs">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="w-3.5 h-3.5" /> {autoCount} auto
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <AlertTriangle className="w-3.5 h-3.5" /> {flaggedCount} flagged
              </span>
            </div>

            {flaggedCount > 0 && (
              <p className="text-xs text-stone-400 bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                Amber/red cells were low-confidence. Apply the board and correct them manually by clicking tiles to rotate or dragging replacements.
              </p>
            )}

            {/* Mini grid */}
            <div className="flex justify-center">
              <MiniGrid results={results} />
            </div>

            {/* Legend */}
            <div className="flex gap-3 justify-center text-[10px] text-stone-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Auto</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" /> Review</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Uncertain</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-800 inline-block" /> Fixed</span>
            </div>

            <div className="flex gap-2">
              <Button
                variant="brutalist"
                onClick={() => setStep("align")}
                className="flex-1"
              >
                Re-scan
              </Button>
              <Button
                onClick={handleApply}
                className="flex-1 bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold flex items-center justify-center gap-1.5"
              >
                Apply to Board
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
