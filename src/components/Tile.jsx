import React from 'react';
import { TREASURES } from '../constants';
import { Lock } from 'lucide-react';
import clsx from 'clsx';

export default function Tile({
  shape,
  dir,
  treasure,
  pawns = [],
  isFixed = false,
  isSelected = false,
  isHighlightPath = false,
  isHighlightStart = false,
  isHighlightEnd = false,
  isReachable = false,
  isShiftingPreview = false,
  onClick,
  onDoubleClick,
  onContextMenu,
  className,
  style
}) {
  // Exits mapping for SVG drawing and verification
  const getExitsPath = () => {
    switch (shape) {
      case 'I':
        return 'M 40 0 L 40 80';
      case 'L':
        return 'M 40 0 L 40 40 L 80 40';
      case 'T':
        return 'M 0 40 L 80 40 M 40 40 L 40 0';
      default:
        return '';
    }
  };

  const tr = TREASURES.find(t => t.id === treasure);

  return (
    <div
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      onContextMenu={onContextMenu}
      className={clsx(
        "tile-container",
        isFixed && "fixed",
        isSelected && "selected",
        isHighlightPath && "highlight-path",
        isHighlightStart && "highlight-start",
        isHighlightEnd && "highlight-end",
        isReachable && "reachable",
        isShiftingPreview && "shifting-preview",
        className
      )}
      style={style || {}}
    >
      <div className="path-layer" style={{ transform: `rotate(${dir * 90}deg)` }}>
        {shape === 'I' && (
          <div className="path-line path-i-vert" />
        )}
        {shape === 'L' && (
          <>
            <div className="path-line path-l-top" />
            <div className="path-line path-l-right" />
            <div className="path-line path-center" />
          </>
        )}
        {shape === 'T' && (
          <>
            <div className="path-line path-l-left" />
            <div className="path-line path-l-right" />
            <div className="path-line path-l-top" />
            <div className="path-line path-center" />
          </>
        )}
      </div>

      {/* Treasure Icon Overlay */}
      {tr && (
        <span 
          className="treasure-icon"
          title={tr.name}
        >
          {tr.symbol}
        </span>
      )}

      {/* Pawns Overlay */}
      {pawns && pawns.length > 0 && (
        <div className="pawn-container">
          {pawns.map(color => (
            <div
              key={color}
              className={`pawn-marker pawn-${color}`}
            />
          ))}
        </div>
      )}

      {/* Fixed lock indicator */}
      {isFixed && (
        <div className="fixed-lock-badge" title="Fixed Anchor (Cannot slide)">
          <Lock size={10} />
        </div>
      )}
    </div>
  );
}
