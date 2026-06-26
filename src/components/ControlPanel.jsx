import React, { useState } from 'react';
import { TREASURES, PAWNS } from '../constants';
import { RotateCw, Plus, Brain, User, CreditCard, HelpCircle, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

export default function ControlPanel({
  activePawn,
  setActivePawn,
  handCards = [],
  activeTarget,
  setActiveTarget,
  onAddCard,
  maxTurns,
  setMaxTurns,
  solutions = [],
  onHoverSolution,
  onExecuteSolution
}) {
  const [selectedTreasure, setSelectedTreasure] = useState(TREASURES[0].id);

  const handleAddCard = () => {
    if (onAddCard) {
      onAddCard(selectedTreasure);
    }
  };

  return (
    <aside className="w-full flex flex-col gap-6">
      {/* Active Player Pawn Manager */}
      <section className="glass-panel rounded-2xl p-5 border border-white/10">
        <h2 className="text-md font-semibold mb-3.5 flex items-center gap-2 text-white">
          <User className="text-accent-gold" size={18} /> Active Player Pawn
        </h2>
        <div className="grid grid-cols-4 gap-2">
          {PAWNS.map(p => {
            const isActive = activePawn === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePawn(p.id)}
                className={clsx(
                  "py-2 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer border",
                  p.colorClass,
                  p.textClass,
                  isActive
                    ? "ring-2 ring-white scale-[1.03] opacity-100 border-white shadow-[0_0_12px_rgba(255,255,255,0.2)]"
                    : "opacity-45 hover:opacity-85 border-transparent scale-100"
                )}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Hand Cards Manager */}
      <section className="glass-panel rounded-2xl p-5 border border-white/10">
        <h2 className="text-md font-semibold mb-3 flex items-center gap-2 text-white">
          <CreditCard className="text-accent-gold" size={18} /> Your Hand Cards
        </h2>
        
        {/* Hand Cards List */}
        <div className="min-h-[96px] max-h-[180px] overflow-y-auto border border-white/10 rounded-xl mb-4 p-3 bg-black/35 flex flex-wrap gap-2 items-start justify-start">
          {handCards.length === 0 ? (
            <span className="text-xs text-gray-500 w-full text-center py-6 font-medium">
              No cards in hand. Select below to add cards.
            </span>
          ) : (
            handCards.map(cardId => {
              const tr = TREASURES.find(t => t.id === cardId);
              const isActive = activeTarget === cardId;
              if (!tr) return null;

              return (
                <button
                  key={cardId}
                  onClick={() => setActiveTarget(cardId)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 border cursor-pointer",
                    isActive
                      ? "bg-accent-gold text-black border-accent-gold shadow-[0_0_10px_rgba(255,190,26,0.3)] font-bold scale-[1.03]"
                      : "bg-white/5 text-gray-300 border-white/10 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <span className="text-base leading-none">{tr.symbol}</span>
                  <span>{tr.name}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Add Card Controls */}
        <div className="flex gap-2.5">
          <select
            value={selectedTreasure}
            onChange={(e) => setSelectedTreasure(e.target.value)}
            className="flex-1 bg-bg-secondary border border-white/15 rounded-xl px-3 py-2 text-sm text-gray-200 focus:outline-none focus:border-accent-gold transition-colors"
          >
            {TREASURES.map(t => (
              <option key={t.id} value={t.id}>
                {t.symbol} {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCard}
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl transition-all border border-white/10 cursor-pointer active:scale-95"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </section>

      {/* Pathfinder Solver Panel */}
      <section className="glass-panel rounded-2xl p-5 border border-white/10 flex-1 flex flex-col min-h-[300px]">
        <div className="flex justify-between items-center mb-4.5">
          <h2 className="text-md font-semibold flex items-center gap-2 text-white">
            <Brain className="text-accent-cyan" size={18} /> Path Strategist Solver
          </h2>
          <div className="flex items-center gap-2">
            <label className="text-[11px] text-gray-400 font-semibold uppercase tracking-wider">Depth:</label>
            <select
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value, 10))}
              className="bg-bg-secondary border border-white/15 rounded-lg px-2 py-1 text-xs text-gray-200 focus:outline-none focus:border-accent-cyan cursor-pointer"
            >
              <option value={1}>1 Turn</option>
              <option value={2}>2 Turns</option>
              <option value={3}>3 Turns</option>
            </select>
          </div>
        </div>

        {/* Suggestion list */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[420px]">
          {handCards.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-black/10">
              <span className="text-xs text-gray-500 font-medium">Add cards to your hand to activate search recommendations.</span>
            </div>
          ) : solutions.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-xl bg-black/10">
              <span className="text-xs text-red-400/80 font-medium">No valid moves found. Try shifting columns or rotating tiles to clear path corridors.</span>
            </div>
          ) : (
            solutions.map((path, idx) => {
              const isSelected = activeTarget === path.cardId;
              const tr = TREASURES.find(t => t.id === path.cardId);
              const trLabel = tr ? `${tr.symbol} ${tr.name}` : path.cardId;
              
              // Safety/Block index properties
              const safety = path.safetyScore || 0;
              let safetyLabel = 'High';
              let safetyClass = 'text-pawn-green';
              if (safety < 45) {
                safetyLabel = 'Low';
                safetyClass = 'text-accent-red';
              } else if (safety < 75) {
                safetyLabel = 'Medium';
                safetyClass = 'text-yellow-500';
              }

              return (
                <div
                  key={idx}
                  onMouseEnter={() => onHoverSolution(path)}
                  onMouseLeave={() => onHoverSolution(null)}
                  onClick={() => onExecuteSolution(path)}
                  className={clsx(
                    "relative p-4 rounded-xl border transition-all duration-300 cursor-pointer flex flex-col gap-2 hover:scale-[1.015]",
                    isSelected 
                      ? "bg-accent-cyan/5 border-accent-cyan/45 shadow-[inset_0_0_12px_rgba(0,240,255,0.06)] hover:border-accent-cyan/70"
                      : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"
                  )}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-gray-200">
                      {path.isFallback ? `Approach: ${trLabel}` : `${path.length} Turn Solution to ${trLabel}`}
                    </span>
                    <span className={clsx(
                      "text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider",
                      path.isFallback 
                        ? "bg-yellow-950/20 border-yellow-700/30 text-yellow-500" 
                        : "bg-emerald-950/20 border-emerald-700/30 text-emerald-400"
                    )}>
                      {path.isFallback ? 'Proximity' : `${path.length} Turn${path.length > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Moves list */}
                  <div className="text-[11px] text-gray-400 font-mono space-y-1 mt-1 leading-relaxed">
                    {path.isFallback ? (
                      <div>
                        Pawn target coordinate: ({path[path.length - 1].endPos.r}, {path[path.length - 1].endPos.c})
                        <br />
                        Distance remaining: <span className="text-accent-gold font-bold">{path[path.length - 1].minDistance} blocks</span>
                      </div>
                    ) : (
                      path.map((step, sIdx) => {
                        const arrowIdParts = step.arrowId.split('-');
                        const formatted = `${arrowIdParts[0].toUpperCase()} ${arrowIdParts[1]} ${arrowIdParts[2].toUpperCase()}`;
                        return (
                          <div key={sIdx} className="flex items-center gap-1">
                            <span className="text-accent-gold font-semibold">T{sIdx + 1}:</span>
                            <span>Slide {formatted} (Rot: {step.rotation * 90}°)</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div className="flex justify-between items-center border-t border-white/5 pt-2 mt-1">
                    <span className="text-[10px] text-gray-500 font-medium">
                      Opponent Block Resistance: <span className={clsx("font-bold", safetyClass)}>{safety}% ({safetyLabel})</span>
                    </span>
                    <span className="text-[10px] text-accent-cyan opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 font-semibold">
                      Execute <ArrowRight size={10} />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Rules & Reference Info */}
      <section className="glass-panel rounded-2xl p-5 border border-white/10 text-xs text-gray-400 space-y-2.5">
        <h2 className="text-md font-semibold flex items-center gap-2 text-white pb-1 border-b border-white/5">
          <HelpCircle className="text-accent-gold" size={16} /> Reference Manual
        </h2>
        <p>1. <strong>Slide spare tile</strong>: Drag the spare tile and drop it on an arrow, or click the green arrows surrounding the grid.</p>
        <p>2. <strong>Rotate corridor exit paths</strong>: Click on tiles to rotate their exits 90° clockwise to build custom pathways.</p>
        <p>3. <strong>Define pawn coordinates</strong>: Double click a board tile to jump your active solver pawn to that cell coordinate.</p>
        <div className="flex gap-4 pt-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-bg-panel-solid border border-accent-gold/40 shadow-sm" />
            <span className="text-[10px] text-gray-300">Fixed Anchor</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-white/5 border border-white/10" />
            <span className="text-[10px] text-gray-300">Movable Tile</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
