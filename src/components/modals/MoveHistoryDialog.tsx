import { useRef, useEffect, useState } from "react";
import { Clock, ZoomIn, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Button } from "../ui/button";
import { MiniBoardSnapshot } from "../board/MiniBoardSnapshot";
import type { HistoryRecord } from "../../hooks/useLabyrinthHistory";
import type { PawnPositions } from "../../types";
import { DEFAULT_PAWN_POSITIONS } from "../../constants";

interface Props {
  open: boolean;
  onClose: () => void;
  history: HistoryRecord[];
  historyIndex: number;
  activePlayers: string[];
  onJumpTo: (index: number) => void;
}

interface ZoomedSnapshot {
  record: HistoryRecord;
  label: string;
}

export function MoveHistoryDialog({ open, onClose, history, historyIndex, activePlayers, onJumpTo }: Props) {
  const activeRowRef = useRef<HTMLDivElement>(null);
  const [zoomed, setZoomed] = useState<ZoomedSnapshot | null>(null);

  // Scroll active row into view when dialog opens
  useEffect(() => {
    if (open && activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [open, historyIndex]);

  if (history.length === 0) return null;

  const dialog = (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-md text-stone-100 p-0 flex flex-col max-h-[85svh] rounded-xl">
        <DialogHeader className="px-4 pt-4 pb-3 border-b border-stone-800 shrink-0">
          <DialogTitle className="flex items-center gap-2 text-stone-100 text-base">
            <Clock className="w-4 h-4 text-theme-primary" />
            Move History
            <span className="text-xs text-stone-500 font-normal ml-1">
              {history.length} snapshot{history.length !== 1 ? "s" : ""}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overscroll-contain">
          {history.map((record, idx) => {
            const isCurrent = idx === historyIndex;
            const label = record.label ?? (idx === 0 ? "Initial state" : `Move ${idx}`);
            const pawnPositions: PawnPositions = (record.pawnPositions ?? DEFAULT_PAWN_POSITIONS) as PawnPositions;
            const isFirst = idx === 0;

            return (
              <div
                key={idx}
                ref={isCurrent ? activeRowRef : undefined}
                className={`flex items-center gap-3 px-3 py-2.5 border-b border-stone-800/60 transition-colors ${
                  isCurrent ? "bg-theme-primary-10 border-l-2 border-l-theme-primary" : "hover:bg-stone-800/40"
                }`}
              >
                {/* Sequence number */}
                <span
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    isCurrent
                      ? "bg-theme-primary text-stone-950"
                      : "bg-stone-800 text-stone-400"
                  }`}
                >
                  {idx}
                </span>

                {/* Mini board thumbnail — click to zoom */}
                <button
                  onClick={() => setZoomed({ record, label })}
                  className="shrink-0 rounded overflow-hidden hover:ring-2 hover:ring-theme-primary/60 transition-all relative group"
                  title="Click to enlarge"
                  aria-label="Enlarge board snapshot"
                >
                  <MiniBoardSnapshot
                    board={record.board}
                    pawnPositions={pawnPositions}
                    activePlayers={activePlayers}
                    movedPawn={record.movedPawn}
                    pawnPath={record.pawnPath}
                  />
                  <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                    <ZoomIn className="w-3 h-3 text-white" />
                  </span>
                </button>

                {/* Label + actions */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] font-semibold leading-tight truncate ${isCurrent ? "text-theme-primary" : "text-stone-300"}`}>
                    {label}
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {!isFirst && (
                      <button
                        onClick={() => { onJumpTo(idx - 1); onClose(); }}
                        className="text-[10px] px-2 py-0.5 rounded border border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500 transition-colors cursor-pointer"
                        title="Restore state before this move"
                      >
                        Before
                      </button>
                    )}
                    <button
                      onClick={() => { onJumpTo(idx); onClose(); }}
                      className={`text-[10px] px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                        isCurrent
                          ? "border-theme-primary-40 text-theme-primary bg-theme-primary-10"
                          : "border-stone-700 text-stone-400 hover:text-stone-200 hover:border-stone-500"
                      }`}
                      title="Restore to this state"
                    >
                      {isCurrent ? "Current" : "Restore"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-4 py-3 border-t border-stone-800 shrink-0 flex justify-end">
          <Button
            variant="brutalist"
            size="sm"
            onClick={onClose}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      {dialog}
      {/* Zoom overlay */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4"
          onClick={() => setZoomed(null)}
        >
          <div
            className="app-surface bg-card p-4 flex flex-col items-center gap-3 max-w-xs w-full rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <span className="text-sm font-semibold text-stone-200">{zoomed.label}</span>
              <button onClick={() => setZoomed(null)} className="text-stone-500 hover:text-stone-200 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div style={{ transform: "scale(3)", transformOrigin: "center", width: 70, height: 70 }}>
              <MiniBoardSnapshot
                board={zoomed.record.board}
                pawnPositions={(zoomed.record.pawnPositions ?? DEFAULT_PAWN_POSITIONS) as PawnPositions}
                activePlayers={activePlayers}
                movedPawn={zoomed.record.movedPawn}
                pawnPath={zoomed.record.pawnPath}
              />
            </div>
            <div style={{ height: 140 }} />
            <p className="text-[11px] text-stone-500 text-center">Tap outside to close</p>
          </div>
        </div>
      )}
    </>
  );
}
