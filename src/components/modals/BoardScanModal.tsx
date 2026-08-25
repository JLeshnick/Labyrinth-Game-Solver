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
          if (!cell) return <div key={key} className="w-7 h-7 rounded-sm bg-muted" />;
          const bg = !cell.flagged
            ? "bg-green-900/40 border-green-700/40"
            : cell.confidence >= 0.55
            ? "bg-amber-900/40 border-amber-700/40"
            : "bg-red-900/40 border-red-600/40";
          return (
            <div key={key} className={`w-7 h-7 rounded-sm border flex flex-col items-center justify-center gap-0 ${bg}`}>
              <span className="text-[6px] text-foreground leading-none capitalize">{cell.shape[0]}</span>
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

// Handle order [TL, TR, BR, BL] = [Red, Yellow, Blue, Green]
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
    <div className="text-[11px] text-muted-foreground bg-muted/50 border border-border rounded-lg px-3 py-2 flex flex-col gap-0.5">
      <span>
        <span className="text-foreground font-semibold">{treasureCount} treasure</span>
        {blankCount > 0 && (
          <span> + <span className="text-foreground font-semibold">{blankCount} blank</span></span>
        )} tile photo{total !== 1 ? "s" : ""} configured.
        {blankCount === 0 && (
          <span className="text-amber-400"> Add blank tile photos for best accuracy.</span>
        )}
      </span>
      <span>Photos go in <code className="font-mono text-muted-foreground">public/tile-templates/</code>.</span>
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
        <p className="text-xs text-muted-foreground flex-1">
          Drag the corner handles to match each pawn's home corner. Rotate the photo if needed.
        </p>
        <button
          onClick={onRotatePhoto}
          className="shrink-0 flex items-center gap-1 text-xs text-foreground neo-brutalism-button rounded-lg px-2 py-1.5"
          title="Rotate photo 90° clockwise"
        >
          <RotateCw className="w-3.5 h-3.5" />
          Rotate
        </button>
      </div>
      {/* Corner color legend */}
      <div className="flex gap-2 flex-wrap text-[10px]">
        {CORNER_LABELS.map((label, i) => (
          <span key={i} className="flex items-center gap-1 text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full inline-block ${CORNER_COLORS[i]}`} />
            {label.replace("\n", " ")}
          </span>
        ))}
      </div>
      <div
        ref={containerRef}
        className="relative w-full aspect-square overflow-hidden rounded-lg border border-border select-none touch-none cursor-crosshair"
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        <img
          src={imgSrc}
          alt="Board for alignment"
          className="w-full h-full object-cover pointer-events-none transition-transform duration-150"
          style={{ transform: `rotate(${photoRotation}deg)` }}
          draggable={false}
        />
        {/* SVG quadrilateral showing the crop area */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polygon
            points={corners.map((c) => `${c.x * 100},${c.y * 100}`).join(" ")}
            fill="rgba(245,158,11,0.12)"
            stroke="var(--theme-color)"
            strokeWidth="0.8"
            strokeDasharray="2,2"
          />
        </svg>
        {/* Four corner draggable handles */}
        {corners.map((pt, i) => {
          const { x, y } = toPercent(pt);
          return (
            <div
              key={i}
              onPointerDown={startDrag(i)}
              style={{ left: x, top: y }}
              className="absolute -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing touch-none z-10"
            >
              <div
                className={`w-6 h-6 rounded-full border-2 border-white shadow-md flex items-center justify-center text-[9px] font-bold text-white ${CORNER_COLORS[i]}`}
              >
                {CORNER_SHORT[i]}
              </div>
            </div>
          );
        })}
      </div>
      <Button
        onClick={onScan}
        className="w-full bg-theme-primary hover:bg-theme-primary-hover text-stone-950 font-bold min-h-11 rounded-xl flex items-center justify-center gap-2"
      >
        <Camera className="w-4 h-4" />
        Analyze Board
      </Button>
    </div>
  );
}

// ── Main Modal ────────────────────────────────────────────────────────────────

export function BoardScanModal({ open, onClose, onApply }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [photoRotation, setPhotoRotation] = useState<number>(0);
  const [corners, setCorners] = useState<[CornerPoint, CornerPoint, CornerPoint, CornerPoint]>([
    { x: 0.05, y: 0.05 }, // Red TL
    { x: 0.95, y: 0.05 }, // Yellow TR
    { x: 0.95, y: 0.95 }, // Blue BR
    { x: 0.05, y: 0.95 }, // Green BL
  ]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<BoardScanResult>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Pre-load tile templates in background when modal mounts
  useEffect(() => {
    if (open) {
      loadTileTemplates().catch(() => {});
    }
  }, [open]);

  // Reset state when closed
  useEffect(() => {
    if (!open) {
      setStep("upload");
      setImgSrc(null);
      setPhotoRotation(0);
      setProgress(0);
      setResults([]);
      setError(null);
    }
  }, [open]);

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImgSrc(e.target?.result as string);
      setPhotoRotation(0);
      setStep("align");
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleRotatePhoto = () => {
    setPhotoRotation((r) => (r + 90) % 360);
  };

  const handleScan = async () => {
    if (!imgSrc) return;
    setStep("scanning");
    setProgress(0);
    setError(null);

    try {
      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = imgSrc;
      });

      // If photo was rotated, draw into an offscreen canvas with that rotation first
      let sourceImage: HTMLImageElement | HTMLCanvasElement = img;
      if (photoRotation !== 0) {
        const rotCanvas = document.createElement("canvas");
        const rad = (photoRotation * Math.PI) / 180;
        const isOdd = photoRotation === 90 || photoRotation === 270;
        rotCanvas.width = isOdd ? img.naturalHeight : img.naturalWidth;
        rotCanvas.height = isOdd ? img.naturalWidth : img.naturalHeight;
        const ctx = rotCanvas.getContext("2d")!;
        ctx.translate(rotCanvas.width / 2, rotCanvas.height / 2);
        ctx.rotate(rad);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        sourceImage = rotCanvas;
      }

      const scanResults = await scanBoard(sourceImage, corners, (pct) => setProgress(pct));
      setResults(scanResults);
      setStep("results");
    } catch {
      setError("Scan failed. Please try a clearer, top-down photo.");
      setStep("align");
    }
  };

  // Convert scan results to TileData grid + looseTiles pool
  const handleApply = () => {
    const newGrid: (TileData | null)[][] = Array(7)
      .fill(null)
      .map(() => Array(7).fill(null));

    // Fill fixed tiles from presets
    Object.entries(FIXED_TILES_PRESETS).forEach(([coord, tilePartial]) => {
      const [x, y] = coord.split(",").map(Number);
      newGrid[y][x] = {
        id: `fixed_${x}_${y}`,
        shape: tilePartial.shape!,
        rotation: tilePartial.rotation!,
        treasure: tilePartial.treasure,
        isFixed: true,
        color: tilePartial.color,
      };
    });

    // Match movable pool tiles to scan results
    const pool = generateMovablePool();
    const usedIds = new Set<string>();

    const resultMap = new Map(results.map((c) => [`${c.row},${c.col}`, c]));

    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (isFixedCell(r, c)) continue;
        const detected = resultMap.get(`${r},${c}`);
        if (!detected) continue;

        // Find best match in unused pool tiles:
        // Priority 1: same treasureId
        // Priority 2: same shape, no treasure
        // Priority 3: any tile of that shape
        let match = detected.treasureId
          ? pool.find((t) => !usedIds.has(t.id) && t.treasure?.id === detected.treasureId)
          : null;

        if (!match) {
          match = pool.find((t) => !usedIds.has(t.id) && t.shape === detected.shape && !t.treasure);
        }
        if (!match) {
          match = pool.find((t) => !usedIds.has(t.id) && t.shape === detected.shape);
        }
        if (!match) {
          match = pool.find((t) => !usedIds.has(t.id));
        }

        if (match) {
          usedIds.add(match.id);
          newGrid[r][c] = {
            ...match,
            rotation: detected.rotation,
          };
        }
      }
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
      <DialogContent className="max-w-md text-foreground rounded-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Camera className="w-5 h-5 text-theme-primary" />
            Scan Board Photo
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">
              Upload a photo of your assembled board. The app detects tile shapes and treasures on your device — no internet required.
            </p>
            {/* Template availability summary */}
            <TemplateStatus />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div
              className="neo-brutalism-button border-dashed border-border hover:border-theme-primary rounded-xl p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors"
              onClick={() => fileRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Tap to upload or drag & drop</span>
              <span className="text-xs text-muted-foreground/60">JPG, PNG, HEIC, etc.</span>
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
            <p className="text-sm text-foreground">Analyzing board…</p>
            <div className="w-full bg-muted border-2 border-stone-950 rounded h-3">
              <div
                className="h-full rounded-sm bg-theme-primary transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{progress}% complete</span>
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
              <p className="text-xs text-muted-foreground bg-amber-950/30 border border-amber-800/30 rounded-lg px-3 py-2">
                Amber/red cells were low-confidence. Apply the board and correct them manually by clicking tiles to rotate or dragging replacements.
              </p>
            )}

            {/* Mini grid */}
            <div className="flex justify-center">
              <MiniGrid results={results} />
            </div>

            {/* Legend */}
            <div className="flex gap-3 justify-center text-[10px] text-muted-foreground">
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
