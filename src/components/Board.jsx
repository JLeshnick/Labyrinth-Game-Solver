import React from 'react';
import Tile from './Tile';
import { SHIFT_ARROWS } from '../constants';
import { isOppositeArrow, parseArrowId } from '../solver';
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
  onTileRightClick,
  onSlide,
  onDragOver,
  onDropSpareTile,
  previewArrowId = null,
  isGameStarted = false,
  reachableCells = []
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

  // Parse preview arrow id to find shifting track
  const previewParts = previewArrowId ? parseArrowId(previewArrowId) : null;

  return (
    <div className={clsx("board-grid-wrapper", isGameStarted && "board-locked")}>
      {/* 9x9 CSS Grid Wrapper */}
      <div className="board-grid">
        {/* Fixed unmovable background tracks */}
        <div className="board-track-horizontal" style={{ gridRow: 2, gridColumn: '2 / 9' }} />
        <div className="board-track-horizontal" style={{ gridRow: 4, gridColumn: '2 / 9' }} />
        <div className="board-track-horizontal" style={{ gridRow: 6, gridColumn: '2 / 9' }} />
        <div className="board-track-horizontal" style={{ gridRow: 8, gridColumn: '2 / 9' }} />

        <div className="board-track-vertical" style={{ gridColumn: 2, gridRow: '2 / 9' }} />
        <div className="board-track-vertical" style={{ gridColumn: 4, gridRow: '2 / 9' }} />
        <div className="board-track-vertical" style={{ gridColumn: 6, gridRow: '2 / 9' }} />
        <div className="board-track-vertical" style={{ gridColumn: 8, gridRow: '2 / 9' }} />

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
                isForbidden && "forbidden",
                isHighlighted && "highlighted"
              )}
              style={{
                gridRow: arrow.gridRow,
                gridColumn: arrow.gridColumn,
                justifySelf: arrow.justifySelf,
                alignSelf: arrow.alignSelf,
                margin: arrow.margin
              }}
              title={
                isForbidden 
                  ? "Forbidden: Cannot immediately reverse the previous shift" 
                  : `Slide extra tile into ${arrow.label}`
              }
            >
              <ChevronRight size={16} style={{transform: `rotate(${arrow.rotation}deg)`}} />
            </button>
          );
        })}

        {/* 49 Grid Tiles */}
        {board.map((row, r) =>
          row.map((tileData, c) => {
            const isSelected = selectedTileCoord && selectedTileCoord.r === r && selectedTileCoord.c === c;
            const { isHighlightPath, isHighlightStart, isHighlightEnd } = getHighlightState(r, c);
            const isReachable = isGameStarted && reachableCells.some(cell => cell.r === r && cell.c === c);
            
            // Check if this tile is in the row or column being shifted in the preview
            const isShiftingPreview = previewParts && (
              (previewParts.type === 'row' && r === previewParts.index) ||
              (previewParts.type === 'col' && c === previewParts.index)
            );

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
                isReachable={isReachable}
                isShiftingPreview={isShiftingPreview}
                onClick={() => onTileClick(r, c)}
                onDoubleClick={() => onTileDoubleClick(r, c)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  onTileRightClick && onTileRightClick(r, c);
                }}
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
