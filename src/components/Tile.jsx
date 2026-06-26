import React from 'react';
import { TREASURES } from '../constants';
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
  onClick,
  onDoubleClick,
  className
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
      className={clsx(
        "relative w-full aspect-square rounded-xl flex items-center justify-center overflow-hidden transition-all duration-300 select-none group cursor-pointer border",
        isFixed 
          ? "bg-bg-panel-solid/90 border-accent-gold/40 shadow-[inset_0_0_12px_rgba(255,190,26,0.15)]" 
          : "bg-white/5 hover:bg-white/10 border-white/10 active:scale-[0.97]",
        isSelected && "border-accent-gold ring-2 ring-accent-gold/50 scale-[1.02]",
        isHighlightPath && "border-accent-cyan ring-4 ring-accent-cyan/30 shadow-[0_0_15px_rgba(0,240,255,0.4)] scale-[1.01]",
        isHighlightStart && "ring-dashed ring-accent-cyan animate-pulse",
        className
      )}
    >
      {/* SVG Corridor Paths */}
      <svg
        viewBox="0 0 80 80"
        className="absolute inset-0 w-full h-full transition-transform duration-300"
        style={{ transform: `rotate(${dir * 90}deg)` }}
      >
        {/* Background Corridor Path */}
        <path
          d={getExitsPath()}
          className="fill-none stroke-bg-primary stroke-[22] stroke-linecap-round"
        />
        {/* Foreground Corridor Path */}
        <path
          d={getExitsPath()}
          className={clsx(
            "fill-none stroke-[16] stroke-linecap-round transition-all duration-300",
            isHighlightPath 
              ? "stroke-accent-cyan drop-shadow-[0_0_4px_rgba(0,240,255,0.8)]" 
              : isFixed 
                ? "stroke-accent-gold/80" 
                : "stroke-accent-gold/60 group-hover:stroke-accent-gold"
          )}
        />
      </svg>

      {/* Treasure Icon Overlay */}
      {tr && (
        <span 
          className="absolute z-10 text-2xl select-none filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] transform transition-transform group-hover:scale-110 duration-200"
          title={tr.name}
        >
          {tr.symbol}
        </span>
      )}

      {/* Pawns Overlay */}
      {pawns && pawns.length > 0 && (
        <div 
          className={clsx(
            "absolute inset-0 z-20 p-2 flex items-center justify-center gap-1 flex-wrap pointer-events-none"
          )}
        >
          {pawns.map(color => (
            <div
              key={color}
              className={clsx(
                "w-4 h-4 rounded-full border border-white/80 shadow-[0_2px_6px_rgba(0,0,0,0.6)] animate-bounce",
                color === 'red' && "bg-pawn-red shadow-[0_0_8px_#ff3b30]",
                color === 'blue' && "bg-pawn-blue shadow-[0_0_8px_#007aff]",
                color === 'green' && "bg-pawn-green shadow-[0_0_8px_#34c759]",
                color === 'yellow' && "bg-pawn-yellow shadow-[0_0_8px_#ffcc00]"
              )}
              style={{
                animationDelay: color === 'red' ? '0ms' : color === 'blue' ? '150ms' : color === 'green' ? '300ms' : '450ms',
                animationDuration: '1.2s'
              }}
            />
          ))}
        </div>
      )}

      {/* Grid Coordinates (Subtle hover tag) */}
      <div className="absolute bottom-1 right-1.5 text-[8px] text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        {isFixed ? 'F' : 'M'}
      </div>
    </div>
  );
}
