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
    <div className="board-grid-wrapper">
      {/* 9x9 CSS Grid Wrapper */}
      <div className="board-grid">
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
                "shift-arrow",
                arrow.class,
                isForbidden && "forbidden",
                isHighlighted && "highlighted"
              )}
              title={
                isForbidden 
                  ? "Forbidden: Cannot immediately reverse the previous shift" 
                  : `Slide extra tile into ${arrow.label}`
              }
            >
              <ChevronRight size={16} style={{transform: arrow.class.includes('rotate-90') ? 'rotate(90deg)' : arrow.class.includes('-rotate-90') ? 'rotate(-90deg)' : arrow.class.includes('rotate-180') ? 'rotate(180deg)' : 'none'}} />
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
