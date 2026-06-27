import React, { useState } from 'react';
import { TREASURES, PAWNS } from '../constants';
import { RotateCw, Plus, Brain, User, CreditCard, HelpCircle, ArrowRight, Lock, Unlock, Save } from 'lucide-react';
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
  isGameStarted = false,
  setupStep = 1,
  setSetupStep,
  onNextStep,
  onPrevStep,
  onClearBoard,
  onResetBoard,
  onShuffleBoard,
  onStartGame,
  onEndGame,
  onRestartGame,
  activeTool,
  setActiveTool,
  slots = [],
  onSaveSlot,
  onLoadSlot,
  onDeleteSlot,
  onRemoveCard,
  isLoadingSolutions = false
}) {
  const [selectedTreasure, setSelectedTreasure] = useState(TREASURES[0].id);
  const [newProfileName, setNewProfileName] = useState('');

  const handleAddCard = () => {
    if (onAddCard) {
      onAddCard(selectedTreasure);
    }
  };

  return (
    <aside className="control-panel">
      {/* Setup Wizard Progress Stepper (Only in Setup Mode) */}
      {!isGameStarted && (
        <section className="glass-panel cp-section wizard-stepper-card" style={{padding: '16px 12px', marginBottom: '16px'}}>
          <div className="stepper-bar" style={{display: 'flex', justifyContent: 'space-between', position: 'relative', padding: '0 8px'}}>
            <div className="stepper-line" style={{position: 'absolute', top: '14px', left: '20px', right: '20px', height: '2px', backgroundColor: 'var(--color-bg-white-10)', zIndex: 1}} />
            <div className="stepper-line-progress" style={{
              position: 'absolute', 
              top: '14px', 
              left: '20px', 
              width: `${((setupStep - 1) / 5) * 100}%`, 
              height: '2px', 
              backgroundColor: 'var(--color-accent-gold)', 
              zIndex: 2,
              transition: 'width 0.3s ease'
            }} />
            {[1, 2, 3, 4, 5, 6].map(stepNum => {
              const active = stepNum === setupStep;
              const completed = stepNum < setupStep;
              return (
                <button
                  key={stepNum}
                  onClick={() => setSetupStep(stepNum)}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    zIndex: 3,
                    transition: 'all 0.2s',
                    backgroundColor: completed ? 'var(--color-accent-gold)' : active ? '#ffffff' : 'var(--color-bg-panel-solid)',
                    color: completed ? '#0a0813' : active ? '#0a0813' : '#9ca3af',
                    border: active ? '2px solid var(--color-accent-gold)' : '2px solid var(--color-border-subtle)',
                    boxShadow: active ? '0 0 10px var(--color-accent-gold-glow)' : 'none'
                  }}
                  title={`Go to Step ${stepNum}`}
                >
                  {completed ? '✓' : stepNum}
                </button>
              );
            })}
          </div>
          <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '9px', textTransform: 'uppercase', color: '#9ca3af', fontWeight: 600, padding: '0 4px'}}>
            <span>Layout</span>
            <span>Corridors</span>
            <span>Extra Tile</span>
            <span>Pawns</span>
            <span>Hand</span>
            <span>Ready</span>
          </div>
        </section>
      )}

      {/* Wizard Guidance Card / Active Status Card */}
      {isGameStarted ? (
        <section className="glass-panel cp-section cp-game-status play-mode-active" style={{padding: '20px', borderLeft: '4px solid var(--color-accent-cyan)', marginBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <div>
              <span style={{fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent-cyan)', fontWeight: 'bold'}}>Game Status</span>
              <h3 style={{fontSize: '16px', color: 'white', marginTop: '4px', fontWeight: 700}}>🎮 Play Mode Active</h3>
            </div>
            <Lock size={20} style={{color: 'var(--color-accent-cyan)'}} />
          </div>
          <p style={{fontSize: '12px', color: '#d1d5db', marginTop: '8px', lineHeight: '1.5'}}>
            All board configuration is locked. Slide the extra spare tile using grid arrows, rotate it, and click connected paths to move your active pawn legally.
          </p>
        </section>
      ) : (
        <section className="glass-panel cp-section wizard-instruction-card" style={{padding: '20px', borderLeft: '4px solid var(--color-accent-gold)', marginBottom: '16px'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px'}}>
            <span style={{fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-accent-gold)', fontWeight: 'bold'}}>
              Step {setupStep} of 6
            </span>
            <Unlock size={16} style={{color: 'var(--color-accent-gold)'}} />
          </div>

          <h3 style={{fontSize: '16px', color: 'white', fontWeight: 700}}>
            {setupStep === 1 && "1. Base Board Layout"}
            {setupStep === 2 && "2. Paint Tile Corridors"}
            {setupStep === 3 && "3. Configure Extra Spare Tile"}
            {setupStep === 4 && "4. Place Player Pawns"}
            {setupStep === 5 && "5. Define Player Hand Cards"}
            {setupStep === 6 && "6. Confirm Setup & Play!"}
          </h3>

          <p style={{fontSize: '12px', color: '#9ca3af', marginTop: '8px', lineHeight: '1.5'}}>
            {setupStep === 1 && "Establish the base grid of tiles. You can wipe all movable tiles to start from scratch, load standard aligned coordinates, or shuffle them randomly."}
            {setupStep === 2 && "Select a corridor shape brush below (Straight, Corner, or Junction) and click or rotate movable cells directly on the board to customize paths."}
            {setupStep === 3 && "Choose the corridor exits shape and target treasure assigned to the Extra Spare Tile. You can also rotate the extra tile."}
            {setupStep === 4 && "Position pawns for Red, Blue, Green, and Yellow players. Select a player pawn color below, then double-click any board tile to place them."}
            {setupStep === 5 && "Add target cards to the player's hand list. These are the treasures they need to reach. The strategist solver will immediately plan recommendations once added."}
            {setupStep === 6 && "Verify your board state looks correct! Click Start Game to lock the board configuration controls and begin playing."}
          </p>

          {/* Inline wizard controls */}
          {setupStep === 1 && (
            <div style={{display: 'flex', gap: '8px', marginTop: '16px', flexWrap: 'wrap'}}>
              <button onClick={onClearBoard} className="btn-text btn-danger" style={{fontSize: '11px', padding: '6px 12px'}}>
                Clear Slate
              </button>
              <button onClick={onResetBoard} className="btn-text" style={{fontSize: '11px', padding: '6px 12px'}}>
                Reset Default
              </button>
              <button onClick={onShuffleBoard} className="btn-text btn-primary" style={{fontSize: '11px', padding: '6px 12px'}}>
                Shuffle Movable
              </button>
            </div>
          )}

          {setupStep === 2 && (
            <div style={{marginTop: '16px', display: 'flex', gap: '8px', flexWrap: 'wrap'}}>
              {['select', 'rotate', 'paint-I', 'paint-L', 'paint-T'].map(tool => (
                <button
                  key={tool}
                  onClick={() => setActiveTool(tool)}
                  className={clsx("btn-text", activeTool === tool && "btn-primary")}
                  style={{fontSize: '10px', padding: '6px 10px'}}
                >
                  {tool === 'select' ? 'Inspect' : tool === 'rotate' ? 'Rotate' : tool.split('-')[1]}
                </button>
              ))}
            </div>
          )}

          {/* Navigation Controls */}
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '16px'}}>
            <button 
              onClick={onPrevStep} 
              disabled={setupStep === 1}
              className="btn-text"
              style={{padding: '6px 14px', fontSize: '11px'}}
            >
              Back
            </button>
            
            <div style={{display: 'flex', gap: '8px'}}>
              <button
                onClick={() => setSetupStep(6)}
                className="btn-text"
                style={{fontSize: '11px', padding: '6px 8px', color: '#9ca3af', border: 'none', background: 'transparent'}}
              >
                Skip Wizard
              </button>
              <button
                onClick={onNextStep}
                className="btn-text btn-success"
                style={{
                  padding: '6px 14px', 
                  fontSize: '11px',
                  background: setupStep === 6 ? 'linear-gradient(135deg, #10b981, #059669)' : undefined,
                  color: setupStep === 6 ? 'white' : undefined,
                  fontWeight: 700
                }}
              >
                {setupStep === 6 ? 'Start Game' : 'Next Step'}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Active Player Pawn Manager */}
      <section 
        className={clsx(
          "glass-panel cp-section",
          !isGameStarted && setupStep === 4 && "wizard-highlight-pulse"
        )} 
        style={{padding: '20px'}}
      >
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
      <section 
        className={clsx(
          "glass-panel cp-section",
          !isGameStarted && setupStep === 5 && "wizard-highlight-pulse"
        )} 
        style={{padding: '20px'}}
      >
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
                  onDoubleClick={() => onRemoveCard && onRemoveCard(cardId)}
                  className={clsx(
                    "hand-item",
                    isActive && "active-target"
                  )}
                  style={{cursor: 'pointer'}}
                  title="Click to select target, Double-click to remove card"
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
      {(isGameStarted || setupStep === 6) && (
        <section className="glass-panel cp-section" style={{padding: '20px', flex: 1, minHeight: '300px'}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px'}}>
          <h2 className="cp-header" style={{display: 'flex', alignItems: 'center', gap: '8px', margin: 0}}>
            <Brain className="cp-header-icon" size={18} style={{color: 'var(--color-accent-cyan)'}} /> 
            <span>Path Strategist Solver</span>
            {isLoadingSolutions && (
              <span className="solver-loading-spinner" style={{fontSize: '10px', color: 'var(--color-accent-cyan)', fontWeight: 'normal', opacity: 0.8}}>
                (thinking...)
              </span>
            )}
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
      )}

      {/* Save Profiles Card */}
      <section className="glass-panel cp-section" style={{padding: '20px', marginBottom: '16px'}}>
        <h2 className="cp-header" style={{borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '8px', marginBottom: '12px'}}>
          <Save className="cp-header-icon" size={18} style={{color: 'var(--color-accent-gold)'}} /> Saved Profiles
        </h2>
        <div style={{display: 'flex', gap: '8px', marginBottom: '12px'}}>
          <input
            type="text"
            placeholder="Profile name..."
            value={newProfileName}
            onChange={(e) => setNewProfileName(e.target.value)}
            className="select-control"
            style={{flex: 1, padding: '8px 12px', fontSize: '12px', borderRadius: '8px', border: '1px solid var(--color-border-subtle)', background: 'rgba(0,0,0,0.3)', color: 'white'}}
          />
          <button
            onClick={() => {
              if (newProfileName.trim()) {
                onSaveSlot(newProfileName.trim());
                setNewProfileName('');
              }
            }}
            className="btn-text btn-primary"
            style={{fontSize: '11px', padding: '6px 12px', borderRadius: '8px'}}
          >
            Save
          </button>
        </div>
        {slots.length > 0 ? (
          <div style={{display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto'}}>
            {slots.map(slot => (
              <div key={slot.key} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.03)', padding: '6px 10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                <div style={{display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden'}}>
                  <span style={{fontWeight: 600, color: 'white', fontSize: '11px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap'}} title={slot.name}>
                    {slot.name}
                  </span>
                  <span style={{fontSize: '9px', color: '#9ca3af'}}>
                    {new Date(slot.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div style={{display: 'flex', gap: '4px', flexShrink: 0}}>
                  <button
                    onClick={() => onLoadSlot(slot.key)}
                    className="btn-text"
                    style={{fontSize: '9px', padding: '4px 8px', borderRadius: '6px', minWidth: 'unset'}}
                  >
                    Load
                  </button>
                  <button
                    onClick={() => onDeleteSlot(slot.name)}
                    className="btn-text btn-danger"
                    style={{fontSize: '9px', padding: '4px 8px', borderRadius: '6px', color: '#f87171', minWidth: 'unset'}}
                  >
                    Del
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <span style={{fontSize: '11px', color: '#9ca3af', display: 'block', textAlign: 'center', padding: '8px 0'}}>
            No saved profiles yet.
          </span>
        )}
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
