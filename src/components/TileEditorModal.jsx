import React, { useState, useEffect } from 'react';
import { TREASURES } from '../constants';
import clsx from 'clsx';

export default function TileEditorModal({
  isOpen,
  onClose,
  onSave,
  selectedTileCoord,
  initialTileData
}) {
  const [modalState, setModalState] = useState({
    shape: 'I',
    dir: 0,
    treasure: '',
    pawns: []
  });

  // Sync state with initialTileData whenever modal opens or coordinate changes
  useEffect(() => {
    if (isOpen && initialTileData) {
      setModalState({
        shape: initialTileData.shape || 'I',
        dir: initialTileData.dir || 0,
        treasure: initialTileData.treasure || '',
        pawns: [...(initialTileData.pawns || [])]
      });
    }
  }, [isOpen, initialTileData, selectedTileCoord]);

  if (!isOpen) return null;

  const isFixed = initialTileData?.isFixed || false;

  const handleSave = () => {
    onSave(modalState);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '12px', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'white' }}>
            {selectedTileCoord 
              ? `Configure Tile at (${selectedTileCoord.r}, ${selectedTileCoord.c})` 
              : 'Configure Extra Spare Tile'}
          </h3>
          <button 
            onClick={onClose}
            style={{ color: '#9ca3af', fontSize: '24px', fontWeight: 'bold' }}
          >
            &times;
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Path Shape Option */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>Exit Corridor Shape</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
              {['I', 'L', 'T'].map(sh => (
                <button
                  key={sh}
                  onClick={() => setModalState(prev => ({ ...prev, shape: sh }))}
                  disabled={isFixed}
                  className={clsx(
                    "btn-text",
                    modalState.shape === sh && "btn-primary",
                    isFixed && "opacity-50 cursor-not-allowed"
                  )}
                  style={{ justifyContent: 'center' }}
                >
                  {sh === 'I' ? 'Straight (I)' : sh === 'L' ? 'Corner (L)' : 'Junction (T)'}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Option */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>Exits Rotation Angle</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {[0, 1, 2, 3].map(rot => (
                <button
                  key={rot}
                  onClick={() => setModalState(prev => ({ ...prev, dir: rot }))}
                  disabled={isFixed}
                  className={clsx(
                    "btn-text",
                    modalState.dir === rot && "btn-primary",
                    isFixed && "opacity-50 cursor-not-allowed"
                  )}
                  style={{ justifyContent: 'center' }}
                >
                  {rot * 90}°
                </button>
              ))}
            </div>
          </div>

          {/* Assigned Treasure Option */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>Assigned Treasure</label>
            <select
              value={modalState.treasure}
              onChange={(e) => setModalState(prev => ({ ...prev, treasure: e.target.value }))}
              disabled={isFixed}
              className="select-control"
              style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '12px' }}
            >
              <option value="">No Treasure</option>
              {TREASURES.map(t => (
                <option key={t.id} value={t.id}>
                  {t.symbol} {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Pawns Present Option */}
          {selectedTileCoord && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#9ca3af' }}>Pawns Present on Tile</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                {['red', 'blue', 'green', 'yellow'].map(color => {
                  const present = modalState.pawns.includes(color);
                  return (
                    <button
                      key={color}
                      onClick={() => {
                        setModalState(prev => {
                          const alreadyIn = prev.pawns.includes(color);
                          return {
                            ...prev,
                            pawns: alreadyIn 
                              ? prev.pawns.filter(p => p !== color)
                              : [...prev.pawns, color]
                          };
                        });
                      }}
                      className={clsx(
                        "btn-text",
                        present && `pawn-${color}`
                      )}
                      style={{
                        justifyContent: 'center', 
                        textTransform: 'capitalize',
                        background: present ? `var(--color-pawn-${color})` : undefined,
                        color: present ? (color === 'yellow' ? 'black' : 'white') : undefined
                      }}
                    >
                      {color}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', borderTop: '1px solid var(--color-border-subtle)', paddingTop: '16px', marginTop: '16px' }}>
          <button
            onClick={onClose}
            className="btn-text"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="btn-text btn-primary"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
