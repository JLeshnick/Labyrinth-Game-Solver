import { useState, useEffect, useCallback } from "react";
import type { AppGameState, SaveSlot } from "../types";

export type { SaveSlot };

const SLOTS_LIST_KEY = "labyrinth_saved_slots_list";
export const AUTOSAVE_KEY = "labyrinth_strategist_state";

export function useLabyrinthStorage() {
  const [slots, setSlots] = useState<SaveSlot[]>([]);

  const refreshSlots = useCallback(async () => {
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
  }, [slots]);

  const loadSlot = useCallback(async (slotKey: string): Promise<Partial<AppGameState> | null> => {
    try {
      const raw = localStorage.getItem(slotKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error("Load slot failed:", e);
      return null;
    }
  }, []);

  const deleteSlot = useCallback(async (slotKey: string): Promise<boolean> => {
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

  return { slots, saveAutosave, loadAutosave, saveSlot, loadSlot, deleteSlot, refreshSlots };
}
