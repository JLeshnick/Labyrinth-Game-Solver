import { useCallback } from "react";
import type { AppGameState } from "../types";

export const AUTOSAVE_KEY = "labyrinth_strategist_state";

export function useLabyrinthStorage() {
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

  return { saveAutosave, loadAutosave };
}
