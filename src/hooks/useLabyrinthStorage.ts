import { useState, useEffect, useCallback } from "react";
import type { AppGameState, SaveSlot } from "../types";

export type { SaveSlot };

const SLOTS_LIST_KEY = "labyrinth_saved_slots_list";
export const AUTOSAVE_KEY = "labyrinth_strategist_state";

export function useLabyrinthStorage() {
  const [slots, setSlots] = useState<SaveSlot[]>([]);
  const isElectron = !!window.electronAPI;

  const refreshSlots = useCallback(async () => {
    if (isElectron) {
      try {
        const list = await window.electronAPI!.listGames();
        setSlots(list);
      } catch (e) {
        console.error("Failed to list games from disk:", e);
      }
      return;
    }

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
  }, [isElectron]);

  useEffect(() => {
    refreshSlots();
  }, [refreshSlots]);

  const saveAutosave = useCallback((stateData: Partial<AppGameState>) => {
    try {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(stateData));
    } catch (e) {
      console.warn("Autosave failed (storage may be full or blocked):", e);
    }
  }, []);

  const loadAutosave = useCallback((): Partial<AppGameState> | null => {
    try {
      const raw = localStorage.getItem(AUTOSAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, []);

  const saveSlot = useCallback(async (slotName: string, stateData: Partial<AppGameState>): Promise<boolean> => {
    if (isElectron) {
      try {
        const result = await window.electronAPI!.saveGame(slotName, stateData);
        if (result.success) {
          await refreshSlots();
          return true;
        }
        return false;
      } catch (e) {
        console.error("Save slot to disk failed:", e);
        return false;
      }
    }

    try {
      const slotKey = `labyrinth_slot_${Date.now()}`;
      localStorage.setItem(slotKey, JSON.stringify(stateData));

      const newSlot: SaveSlot = { name: slotName, key: slotKey, timestamp: Date.now() };
      const updatedSlots = [newSlot, ...slots.filter((s) => s.key !== AUTOSAVE_KEY)];
      localStorage.setItem(SLOTS_LIST_KEY, JSON.stringify(updatedSlots));
      setSlots(updatedSlots);
      return true;
    } catch (e) {
      console.error("Save slot failed:", e);
      return false;
    }
  }, [slots, isElectron, refreshSlots]);

  const loadSlot = useCallback(async (slotKey: string): Promise<Partial<AppGameState> | null> => {
    if (isElectron) {
      try {
        return await window.electronAPI!.loadGame(slotKey);
      } catch (e) {
        console.error("Load slot from disk failed:", e);
        return null;
      }
    }

    try {
      const raw = localStorage.getItem(slotKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Load slot failed:", e);
      return null;
    }
  }, [isElectron]);

  const deleteSlot = useCallback(async (slotKey: string): Promise<boolean> => {
    if (isElectron) {
      try {
        const success = await window.electronAPI!.deleteGame(slotKey);
        if (success) {
          await refreshSlots();
          return true;
        }
        return false;
      } catch (e) {
        console.error("Delete slot from disk failed:", e);
        return false;
      }
    }

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
  }, [slots, isElectron, refreshSlots]);

  return { slots, saveAutosave, loadAutosave, saveSlot, loadSlot, deleteSlot, refreshSlots };
}
