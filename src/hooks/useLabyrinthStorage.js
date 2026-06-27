import { useState, useEffect, useCallback } from 'react';

const SLOTS_LIST_KEY = 'labyrinth_saved_slots_list';
const AUTOSAVE_KEY = 'labyrinth_strategist_state';

export function useLabyrinthStorage() {
  const [slots, setSlots] = useState([]);

  // Load available save slots on mount
  useEffect(() => {
    try {
      const rawList = localStorage.getItem(SLOTS_LIST_KEY);
      if (rawList) {
        setSlots(JSON.parse(rawList));
      } else {
        // Migration from legacy single slot if it exists
        const legacy = localStorage.getItem(AUTOSAVE_KEY);
        if (legacy) {
          const initialSlots = [{ name: 'Auto-Save / Default', key: AUTOSAVE_KEY, timestamp: Date.now() }];
          localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(initialSlots));
          setSlots(initialSlots);
        }
      }
    } catch (e) {
      console.warn('Failed to load save slots list from localStorage:', e);
    }
  }, []);

  const saveSlot = useCallback((slotName, stateData) => {
    try {
      const cleanName = slotName.trim() || `Profile ${Date.now()}`;
      const slotKey = `labyrinth_saved_slot_${cleanName.replace(/\s+/g, '_')}`;
      
      const newSlot = {
        name: cleanName,
        key: slotKey,
        timestamp: Date.now()
      };

      // Save state data
      localStorage.setItem(slotKey, JSON.stringify(stateData));

      // Update slot names list
      setSlots(prev => {
        const filtered = prev.filter(s => s.name.toLowerCase() !== cleanName.toLowerCase());
        const updated = [...filtered, newSlot].sort((a, b) => b.timestamp - a.timestamp);
        localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(updated));
        return updated;
      });

      return true;
    } catch (e) {
      console.error('Failed to save slot to localStorage:', e);
      return false;
    }
  }, []);

  const loadSlot = useCallback((slotKey) => {
    try {
      const raw = localStorage.getItem(slotKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load slot from localStorage:', e);
      return null;
    }
  }, []);

  const deleteSlot = useCallback((slotName) => {
    try {
      const targetSlot = slots.find(s => s.name === slotName);
      if (!targetSlot) return false;

      localStorage.removeItem(targetSlot.key);

      setSlots(prev => {
        const updated = prev.filter(s => s.name !== slotName);
        localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(updated));
        return updated;
      });

      return true;
    } catch (e) {
      console.error('Failed to delete slot from localStorage:', e);
      return false;
    }
  }, [slots]);

  const saveAutosave = useCallback((stateData) => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stateData));
    } catch (e) {
      console.warn('Autosave failed:', e);
    }
  }, []);

  const loadAutosave = useCallback(() => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }, []);

  return {
    slots,
    saveSlot,
    loadSlot,
    deleteSlot,
    saveAutosave,
    loadAutosave
  };
}
