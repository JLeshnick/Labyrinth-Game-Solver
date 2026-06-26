import React, { useState } from 'react';
import { TREASURES, PAWNS } from '../constants';
import { RotateCw, Plus, Brain, User, CreditCard, HelpCircle, ArrowRight, Lock, Unlock } from 'lucide-react';
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
  onExecuteSolution,
  isGameStarted = false
}) {
  const [selectedTreasure, setSelectedTreasure] = useState(TREASURES[0].id);

  const handleAddCard = () => {
    if (onAddCard) {
      onAddCard(selectedTreasure);
    }
  };

  return (
    <aside className="control-panel">
      {/* Game Mode Status Card */}
      {isGameStarted ? (
        <section className="glass-panel cp-section cp-game-status" style={{padding: '20px', borderLeft: '4px solid var(--color-accent-cyan)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <span style={{fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent-cyan)', fontWeight: 'bold'}}>Game Status</span>
              <h3 style={{fontSize: '16px', color: 'white', marginTop: '4px'}}>🎮 Play Mode Active</h3>
            </div>
            <Lock size={20} style={{color: 'var(--color-accent-cyan)'}} />
          </div>
          <p style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px', lineHeight: '1.5'}}>
            All board layout configuration is locked. Slide the extra spare tile using the arrows or click connected paths to move your active pawn legally.
          </p>
        </section>
      ) : (
        <section className="glass-panel cp-section cp-game-status" style={{padding: '20px', borderLeft: '4px solid var(--color-accent-gold)'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <span style={{fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent-gold)', fontWeight: 'bold'}}>Game Status</span>
              <h3 style={{fontSize: '16px', color: 'white', marginTop: '4px'}}>🔧 Setup Mode</h3>
            </div>
            <Unlock size={20} style={{color: 'var(--color-accent-gold)'}} />
          </div>
          <p style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px', lineHeight: '1.5'}}>
            Configure the board exits, place treasures, set starting pawn locations, and add cards. Click <strong>Start Game</strong> in the top header once finished.
          </p>
        </section>
      )}

      {/* Active Player Pawn Manager */}
      <section className="glass-panel cp-section" style={{padding: '20px'}}>
        <h2 className="cp-header">
          <User className="cp-header-icon text-accent-gold" size={18} style={{color: 'var(--color-accent-gold)'}} /> Active Player Pawn
        </h2>
        <div className="pawn-selector">
          {PAWNS.map(p => {
            const isActive = activePawn === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setActivePawn(p.id)}
                className={clsx(
                  "pawn-btn",
                  isActive && "active"
                )}
                style={{
                  color: isActive ? p.textColor : '#9ca3af',
                  backgroundColor: isActive ? `var(--color-pawn-${p.id})` : 'var(--color-bg-white-5)'
                }}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Hand Cards Manager */}
      <section className="glass-panel cp-section" style={{padding: '20px'}}>
        <h2 className="cp-header">
          <CreditCard className="cp-header-icon" size={18} style={{color: 'var(--color-accent-gold)'}} /> Your Hand Cards
        </h2>
        
        {/* Hand Cards List */}
        <div className="hand-list">
          {handCards.length === 0 ? (
            <span style={{fontSize: '12px', color: '#9ca3af', width: '100%', textAlign: 'center', padding: '24px 0'}}>
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
                    "hand-item",
                    isActive && "active-target"
                  )}
                  style={{cursor: 'pointer'}}
                >
                  <span style={{fontSize: '16px'}}>{tr.symbol}</span>
                  <span>{tr.name}</span>
                </button>
              );
            })
          )}
        </div>

        {/* Add Card Controls */}
        <div style={{display: 'flex', gap: '10px'}}>
          <select
            value={selectedTreasure}
            onChange={(e) => setSelectedTreasure(e.target.value)}
            className="select-control"
            style={{flex: 1, padding: '8px 12px', fontSize: '14px', borderRadius: '12px'}}
          >
            {TREASURES.map(t => (
              <option key={t.id} value={t.id}>
                {t.symbol} {t.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCard}
            className="btn-text"
          >
            <Plus size={14} /> Add
          </button>
        </div>
      </section>

      {/* Pathfinder Solver Panel */}
      <section className="glass-panel cp-section" style={{padding: '20px', flex: 1, minHeight: '300px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px'}}>
          <h2 className="cp-header">
            <Brain className="cp-header-icon" size={18} style={{color: 'var(--color-accent-cyan)'}} /> Path Strategist Solver
          </h2>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <label style={{fontSize: '11px', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em'}}>Depth:</label>
            <select
              value={maxTurns}
              onChange={(e) => setMaxTurns(parseInt(e.target.value, 10))}
              className="select-control"
            >
              <option value={1}>1 Turn</option>
              <option value={2}>2 Turns</option>
              <option value={3}>3 Turns</option>
            </select>
          </div>
        </div>

        {/* Suggestion list */}
        <div className="solutions-list">
          {handCards.length === 0 ? (
            <div className="empty-state">
              <p>Add cards to your hand to activate search recommendations.</p>
            </div>
          ) : solutions.length === 0 ? (
            <div className="empty-state">
              <p style={{color: 'var(--color-accent-red)'}}>No valid moves found.</p>
              <span>Try shifting columns or rotating tiles to clear path corridors.</span>
            </div>
          ) : (
            solutions.map((path, idx) => {
              const isSelected = activeTarget === path.cardId;
              const tr = TREASURES.find(t => t.id === path.cardId);
              const trLabel = tr ? `${tr.symbol} ${tr.name}` : path.cardId;
              
              // Safety/Block index properties
              const safety = path.safetyScore || 0;
              let safetyLabel = 'High';
              let safetyColor = 'var(--color-pawn-green)';
              if (safety < 45) {
                safetyLabel = 'Low';
                safetyColor = 'var(--color-accent-red)';
              } else if (safety < 75) {
                safetyLabel = 'Medium';
                safetyColor = 'var(--color-pawn-yellow)';
              }

              return (
                <div
                  key={idx}
                  onMouseEnter={() => onHoverSolution(path)}
                  onMouseLeave={() => onHoverSolution(null)}
                  onClick={() => onExecuteSolution(path)}
                  className="solution-card"
                  style={{
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--color-accent-cyan)' : undefined,
                    background: isSelected ? 'rgba(0, 240, 255, 0.05)' : undefined
                  }}
                >
                  <div className="sol-header">
                    <span className="sol-title">
                      {path.isFallback ? `Approach: ${trLabel}` : `${path.length} Turn Solution to ${trLabel}`}
                    </span>
                    <span className="sol-badge" style={{
                      color: path.isFallback ? 'var(--color-pawn-yellow)' : 'var(--color-pawn-green)',
                      borderColor: path.isFallback ? 'var(--color-pawn-yellow)' : 'var(--color-pawn-green)',
                      background: path.isFallback ? 'rgba(255, 204, 0, 0.1)' : 'rgba(52, 199, 89, 0.1)'
                    }}>
                      {path.isFallback ? 'Proximity' : `${path.length} Turn${path.length > 1 ? 's' : ''}`}
                    </span>
                  </div>

                  {/* Moves list */}
                  <div className="sol-path" style={{fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace'}}>
                    {path.isFallback ? (
                      <div>
                        Pawn target coordinate: ({path[path.length - 1].endPos.r}, {path[path.length - 1].endPos.c})
                        <br />
                        Distance remaining: <span style={{color: 'var(--color-accent-gold)', fontWeight: 'bold'}}>{path[path.length - 1].minDistance} blocks</span>
                      </div>
                    ) : (
                      path.map((step, sIdx) => {
                        const arrowIdParts = step.arrowId.split('-');
                        const formatted = `${arrowIdParts[0].toUpperCase()} ${arrowIdParts[1]} ${arrowIdParts[2].toUpperCase()}`;
                        return (
                          <div key={sIdx} style={{display: 'flex', gap: '4px'}}>
                            <span style={{color: 'var(--color-accent-gold)', fontWeight: 600}}>T{sIdx + 1}:</span>
                            <span>Slide {formatted} (Rot: {step.rotation * 90}°)</span>
                          </div>
                        );
                      })
                    )}
                  </div>

                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '8px', marginTop: '12px'}}>
                    <span style={{fontSize: '10px', color: '#9ca3af'}}>
                      Opponent Block Resistance: <span style={{fontWeight: 'bold', color: safetyColor}}>{safety}% ({safetyLabel})</span>
                    </span>
                    <span style={{fontSize: '10px', color: 'var(--color-accent-cyan)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600}}>
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
      <section className="glass-panel cp-section" style={{padding: '20px', fontSize: '12px', color: '#9ca3af'}}>
        <h2 className="cp-header" style={{borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '8px', marginBottom: '8px'}}>
          <HelpCircle className="cp-header-icon" size={16} style={{color: 'var(--color-accent-gold)'}} /> Reference Manual
        </h2>
        <p style={{marginBottom: '8px'}}>1. <strong>Slide spare tile</strong>: Drag the spare tile and drop it on an arrow, or click the arrows surrounding the grid.</p>
        <p style={{marginBottom: '8px'}}>2. <strong>Rotate corridor exit paths</strong>: Click on tiles to rotate their exits 90° clockwise to build custom pathways.</p>
        <p style={{marginBottom: '8px'}}>3. <strong>Define pawn coordinates</strong>: Double click a board tile to jump your active solver pawn to that cell coordinate.</p>
        <div style={{display: 'flex', gap: '16px', paddingTop: '8px'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{width: '12px', height: '12px', borderRadius: '4px', background: 'var(--color-bg-panel-solid)', border: '1px solid var(--color-accent-gold)'}} />
            <span style={{fontSize: '10px', color: '#d1d5db'}}>Fixed Anchor</span>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
            <span style={{width: '12px', height: '12px', borderRadius: '4px', background: 'var(--color-bg-white-5)', border: '1px solid var(--color-border-subtle)'}} />
            <span style={{fontSize: '10px', color: '#d1d5db'}}>Movable Tile</span>
          </div>
        </div>
      </section>
    </aside>
  );
}
