import React from 'react';
import Tile from './Tile';
import { SHIFT_ARROWS } from '../constants';
import { isOppositeArrow } from '../solver';
import { ChevronRight } from 'lucide-react';
import clsx from 'clsx';

export default function Board({
  board,
  lastShiftArrowId,
  selectedTileCoord,
  highlightedPath = [],
  highlightedStart = null,
  highlightedEnd = null,
  activeTool = 'select',
  onTileClick,
  onTileDoubleClick,
  onSlide,
  onDragOver,
  onDropSpareTile,
  previewArrowId = null
}) {
  if (!board || board.length === 0) return null;

  // Verify if a specific tile is on the highlighted solver path
  const getHighlightState = (r, c) => {
    const isOnPath = highlightedPath.some(cell => cell.r === r && cell.c === c);
    const isStart = highlightedStart && highlightedStart.r === r && highlightedStart.c === c;
    const isEnd = highlightedEnd && highlightedEnd.r === r && highlightedEnd.c === c;
    
    return {
      isHighlightPath: isOnPath,
      isHighlightStart: isStart,
      isHighlightEnd: isEnd
    };
  };

  // Drag handlers for board column/row drop targets
  const handleDragOver = (e, arrowId) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(arrowId);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (onDragOver) {
      onDragOver(null);
    }
  };

  const handleDrop = (e, arrowId) => {
    e.preventDefault();
    if (onDropSpareTile) {
      onDropSpareTile(arrowId);
    }
  };

  return (
    <div className="relative w-full max-w-[650px] aspect-square bg-black/40 rounded-3xl p-4 border border-white/10 shadow-2xl flex items-center justify-center">
      {/* 9x9 CSS Grid Wrapper */}
      <div 
        className="w-full h-full grid grid-cols-[40px_repeat(7,1fr)_40px] grid-rows-[40px_repeat(7,1fr)_40px] gap-1.5"
        style={{ contentVisibility: 'auto' }}
      >
        {/* Shifting Arrows */}
        {SHIFT_ARROWS.map(arrow => {
          const isForbidden = lastShiftArrowId && isOppositeArrow(arrow.id, lastShiftArrowId);
          const isHighlighted = previewArrowId === arrow.id;
          
          return (
            <button
              key={arrow.id}
              onClick={() => !isForbidden && onSlide(arrow.id)}
              onDragOver={(e) => !isForbidden && handleDragOver(e, arrow.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => !isForbidden && handleDrop(e, arrow.id)}
              disabled={isForbidden}
              className={clsx(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 border",
                arrow.class,
                isForbidden
                  ? "bg-red-950/20 border-red-900/30 text-red-800 cursor-not-allowed opacity-30"
                  : isHighlighted
                    ? "bg-accent-cyan text-black border-accent-cyan shadow-[0_0_15px_rgba(0,240,255,0.6)] scale-110"
                    : "bg-white/5 border-white/10 text-accent-gold hover:bg-accent-gold hover:text-black hover:border-accent-gold hover:scale-105 active:scale-95"
              )}
              title={
                isForbidden 
                  ? "Forbidden: Cannot immediately reverse the previous shift" 
                  : `Slide extra tile into ${arrow.label}`
              }
            >
              <ChevronRight size={16} className="transform transition-transform" />
            </button>
          );
        })}

        {/* 49 Grid Tiles */}
        {board.map((row, r) =>
          row.map((tileData, c) => {
            const isSelected = selectedTileCoord && selectedTileCoord.r === r && selectedTileCoord.c === c;
            const { isHighlightPath, isHighlightStart, isHighlightEnd } = getHighlightState(r, c);

            return (
              <Tile
                key={`${r}-${c}`}
                shape={tileData.shape}
                dir={tileData.dir}
                treasure={tileData.treasure}
                pawns={tileData.pawns}
                isFixed={tileData.isFixed}
                isSelected={isSelected}
                isHighlightPath={isHighlightPath}
                isHighlightStart={isHighlightStart}
                isHighlightEnd={isHighlightEnd}
                onClick={() => onTileClick(r, c)}
                onDoubleClick={() => onTileDoubleClick(r, c)}
                className="transition-all"
                style={{
                  gridRow: r + 2,
                  gridColumn: c + 2
                }}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
