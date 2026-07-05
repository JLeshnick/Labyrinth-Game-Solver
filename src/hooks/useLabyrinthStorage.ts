import { useState, useEffect, useCallback } from "react";

const SLOTS_LIST_KEY = "labyrinth_saved_slots_list";
const AUTOSAVE_KEY = "labyrinth_strategist_state";

interface SaveSlot {
  name: string;
  key: string;
  timestamp: number;
}

export function useLabyrinthStorage() {
  const [slots, setSlots] = useState<SaveSlot[]>([]);

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
          const initialSlots: SaveSlot[] = [
            { name: "Auto-Save / Default", key: AUTOSAVE_KEY, timestamp: Date.now() },
          ];
          localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(initialSlots));
          setSlots(initialSlots);
        }
      }
    } catch (e) {
      console.warn("Failed to load save slots list from localStorage:", e);
    }
  }, []);

  const saveAutosave = useCallback((stateData: any) => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stateData));
    } catch (e) {
      console.warn("Autosave failed:", e);
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
    saveAutosave,
    loadAutosave,
  };
}
