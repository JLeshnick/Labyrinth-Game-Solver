import { useState, useEffect, useCallback } from "react";

const SLOTS_LIST_KEY = "labyrinth_saved_slots_list";
export const AUTOSAVE_KEY = "labyrinth_strategist_state";

export interface SaveSlot {
  name: string;
  key: string;
  timestamp: number;
}

export function useLabyrinthStorage() {
  const [slots, setSlots] = useState<SaveSlot[]>([]);

  // Load available save slots on mount
  const refreshSlots = useCallback(() => {
    try {
      const rawList = localStorage.getItem(SLOTS_LIST_KEY);
      if (rawList) {
        setSlots(JSON.parse(rawList));
      } else {
        const legacy = localStorage.getItem(AUTOSAVE_KEY);
        if (legacy) {
          const initialSlots: SaveSlot[] = [
            { name: "Auto-Save / Default", key: AUTOSAVE_KEY, timestamp: Date.now() },
          ];
          localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(initialSlots));
          setSlots(initialSlots);
        } else {
          setSlots([]);
        }
      }
    } catch (e) {
      console.warn("Failed to load save slots list from localStorage:", e);
    }
  }, []);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

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

  // Save a custom named slot
  const saveSlot = useCallback((slotName: string, stateData: any) => {
    try {
      const slotKey = `labyrinth_slot_${Date.now()}`;
      localStorage.setItem(slotKey, JSON.stringify(stateData));

      const newSlot: SaveSlot = {
        name: slotName,
        key: slotKey,
        timestamp: Date.now(),
      };

      const updatedSlots = [newSlot, ...slots.filter((s) => s.key !== AUTOSAVE_KEY)];
      localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(updatedSlots));
      setSlots(updatedSlots);
      return true;
    } catch (e) {
      console.error("Save slot failed:", e);
      return false;
    }
  }, [slots]);

  // Load a custom slot
  const loadSlot = useCallback((slotKey: string) => {
    try {
      const raw = localStorage.getItem(slotKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Load slot failed:", e);
      return null;
    }
  }, []);

  // Delete a custom slot
  const deleteSlot = useCallback((slotKey: string) => {
    try {
      localStorage.removeItem(slotKey);
      const updatedSlots = slots.filter((s) => s.key !== slotKey);
      localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(updatedSlots));
      setSlots(updatedSlots);
      return true;
    } catch (e) {
      console.error("Delete slot failed:", e);
      return false;
    }
  }, [slots]);

  return {
    slots,
    saveAutosave,
    loadAutosave,
    saveSlot,
    loadSlot,
    deleteSlot,
  };
}
