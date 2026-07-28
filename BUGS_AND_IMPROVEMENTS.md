# Labyrinth Game Solver — Bugs & Improvements Tracker

> **Living document** — Check items off as they're implemented, noting the commit and branch for each.
> **Last updated:** 2026-07-27

---

## 🔴 Priority 1 — Critical Bugs

- [x] **Board rotation breaks treasure tile labels**
  - **What:** When rotating the board, treasure tile labels don't stay upright — they get visually garbled.
  - **Files:** `Tile.tsx`, `App.tsx`
  - **Commit:** uncommitted

- [x] **Tile shifts don't carry pawns with them**
  - **What:** When a tile is shifted, pawns that should travel with it stay behind.
  - **Files:** `useLabyrinthGame.ts` (`handleSlide`)
  - **Commit:** uncommitted

- [x] **Ghost bottle label → rename to Genie**
  - **What:** The bottle/glass treasure label visually blocks the corridor "T" shape indicator. Rename to "Genie" to avoid the T-junction clash.
  - **Files:** `constants.ts` (`TREASURE_SHORT_NAMES`), `Tile.tsx`
  - **Commit:** uncommitted

- [x] **Suggestion rankings inverted — lower scores showing above higher**
  - **What:** The suggestions list displays worse moves at the top and better ones below.
  - **Files:** `solver.js` (`solveAllHand` sort), `SolverPanel.tsx`
  - **Commit:** uncommitted

- [x] **Suggestions showing moves that don't match the auto-selected target goal**
  - **What:** The solver returns suggestions for treasures the player isn't targeting.
  - **Files:** `solver.js` (`solveAllHand` / `solveAllHandOrdered`), `SolverPanel.tsx`
  - **Commit:** uncommitted

- [x] **Target goal auto-updating broken**
  - **What:** (a) When a pawn sits on a treasure tile, auto-target keeps saying "stay there" instead of advancing. (b) Already-obtained treasures get selected as targets. (c) Must click "Reset Target Goal" to recover.
  - **Files:** `useLabyrinthGame.ts` (auto-target, `switchToNextPawn`)
  - **Commit:** uncommitted

- [x] **Dark mode drop shadows invisible**
  - **What:** In dark mode, tile drop shadows blend into the dark background and become invisible.
  - **Files:** `index.css`, `Board.tsx`
  - **Commit:** uncommitted

---

## 🟡 Priority 2 — Improvements

- [x] **Replace "safety score" with "algorithm score" + show math**
  - **What:** Rename to "algorithm score." Incorporate spaces moved, turns needed, reachability, fixed-space bonus, tile-exit bonus. Show a tooltip/expandable with the breakdown formula.
  - **Files:** `solver.js`, `SolverPanel.tsx`, `types.ts`
  - **Commit:** uncommitted

- [x] **Custom target shows coordinates — also show treasure name**
  - **What:** When user manually selects a target tile, show the treasure name alongside the coordinates (e.g., `(3,3) — Genie`).
  - **Files:** `SolverPanel.tsx`, `App.tsx`
  - **Commit:** uncommitted

- [x] **Accent color theming — propagate to more UI elements**
  - **What:** When user sets a custom accent color, cascade to treasure labels on tiles, app title text, button borders/highlights, shift arrows, and other chrome.
  - **Files:** `index.css`, `App.tsx`, `Tile.tsx`
  - **Commit:** uncommitted

- [x] **Tooltips cut off on left side of app**
  - **What:** Tooltips appear clipped near the left edge of the viewport.
  - **Files:** `ui/tooltip.tsx`, `index.css`
  - **Commit:** uncommitted

---

## 🟢 Priority 3 — UX Enhancements

- [x] **Saved game resume prompt on app boot**
  - **What:** Show a confirmation dialog when restoring a saved game from localStorage — "Continue" or "Start New?"
  - **Files:** `App.tsx`, new `ResumeGameDialog.tsx`
  - **Commit:** uncommitted

- [x] **Mobile usability improvements**
  - **What:** Mobile phone experience is hard to use — larger touch targets, better tile scaling, improved bottom sheet gestures.
  - **Files:** `App.tsx`, `index.css`
  - **Commit:** uncommitted

---

## 📝 Notes

> Add implementation notes, decisions, or discoveries here as work progresses.
