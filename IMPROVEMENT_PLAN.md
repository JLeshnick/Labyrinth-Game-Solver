# Labyrinth Solver — Improvement Plan

> Generated from the full audit conducted 2026-08-25.
> Work on branch: `improvements/audit-fixes-wave-1`
> Items are grouped by difficulty. Check off each box as completed.

---

## ⚡ Wave 1 — Quick Wins (Trivial, < 30 min each)

These are safe, isolated, low-risk fixes. No architectural changes needed.

- [x] **Fix green pawn color mismatch** — `Board.tsx` defines `#10b981` for green but `constants.ts` has `#22c55e`. Delete `PAWN_HEX_COLORS` from `Board.tsx`, import `PAWN_COLOR_HEX` from `constants.ts`.
  - Files: `src/components/board/Board.tsx`, `src/constants.ts`

- [x] **Extract `ROTATIONS` constant** — Replace the 4+ inline `[0, 90, 180, 270]` array literals scattered through `App.tsx` with a single named constant.
  - Files: `src/App.tsx`, possibly `src/constants.ts`

- [x] **Fix duplicate `animate-fade-in` keyframe** — Two `@keyframes` and two `.animate-fade-in` rules in `index.css`; the second silently overrides the first with different timing.
  - Files: `src/index.css`

- [x] **Remove `HOME_POSITIONS` from `useLabyrinthGame.ts`** — It is a duplicate of `DEFAULT_PAWN_POSITIONS` from `constants.ts`. Delete it and import the constant.
  - Files: `src/hooks/useLabyrinthGame.ts`, `src/constants.ts`

- [x] **Derive `TREASURE_SHORT_NAMES` from `TREASURES` array** — Currently two separate hand-maintained lists with the same data.
  - Files: `src/constants.ts`

- [x] **Fix `totalShiftsRef.current` direct ref access in JSX** — Line 1319 of `App.tsx` reads `game.totalShiftsRef.current` which won't trigger re-renders. Use state value instead.
  - Files: `src/App.tsx`, `src/hooks/useLabyrinthGame.ts`

- [x] **Wrap `<Board>` and `<SolverPanel>` in `<ErrorBoundary>`** — These are the highest-risk render trees; crashes should show a graceful fallback, not a blank screen.
  - Files: `src/App.tsx`, `src/components/ErrorBoundary.tsx`

- [x] **Add Board Scan section to WelcomeGuide** — The camera scan feature is never mentioned to new users.
  - Files: `src/components/modals/WelcomeGuide.tsx`

- [x] **Add `R` keyboard shortcut for board rotate** — Register `R` key in the keyboard handler and document it in `SettingsDialog.tsx`.
  - Files: `src/App.tsx`, `src/components/modals/SettingsDialog.tsx`

- [x] **Persist `mobilePanelStop` to `localStorage`** — Mobile panel height preference resets on every page load.
  - Files: `src/App.tsx`

---

## 🔧 Wave 2 — Medium Fixes (1–3 hours each)

Targeted improvements to specific subsystems. No major restructuring.

- [ ] **Fix toast queue** — When two toasts fire quickly, the second cancels the first. Implement a FIFO array of `{ id, msg }` messages; pop to next on timeout.
  - Files: `src/App.tsx`

- [ ] **Fix autosave boot race condition** — The `ResumeGameDialog` effect (App.tsx lines 107–118) and the worker mount effect (lines 479–498) both call `loadAutosave()` independently. Consolidate to one path: remove the `game.loadAutosave()` inside the worker effect and rely on the dialog flow exclusively.
  - Files: `src/App.tsx`, `src/hooks/useLabyrinthGame.ts`

- [ ] **Deduplicate `previewState` pawn position logic** — The ~25-line pawn-position-update block inside `previewState` and `stagedPreviewState` are identical. Extract to a `computePreviewPawnPositions(arrow, pawnPositions)` helper.
  - Files: `src/App.tsx`

- [ ] **Fix `audio.ts` mute check** — `isAudioMuted()` reads `localStorage` on every sound call, bypassing React state. Remove it; callers already guard with `if (!isMuted)`. Optionally add a module-level `setMuted(val)` setter so audio.ts doesn't need to touch storage at all.
  - Files: `src/utils/audio.ts`, call sites in `src/hooks/useLabyrinthGame.ts`

- [x] **Fix coop & auto stats in StatsPanel** — In coop and auto mode, `coopObtainedTreasures` is now passed to and shown in `StatsPanel` with team progress.
  - Files: `src/components/panels/StatsPanel.tsx`, `src/App.tsx`

- [x] **Fix Auto Mode gameplay & race condition** — Fixed `remainingCoopTreasures` initialization on auto mode start, corrected treasure collection & victory condition triggers, and fixed move execution lock release timing.
  - Files: `src/hooks/useLabyrinthGame.ts`, `src/App.tsx`, `src/components/AppHeader.tsx`

- [ ] **Replace `deepClone` with `structuredClone`** — `JSON.parse/stringify` drops `undefined` values and is slower. Switch to `structuredClone()` which is available in all modern browsers.
  - Files: `src/hooks/useLabyrinthHistory.ts`

- [ ] **Cap undo history length** — History grows unboundedly. Add a `MAX_HISTORY = 50` limit when pushing to the history stack.
  - Files: `src/hooks/useLabyrinthHistory.ts`

- [ ] **Remove `_hoveredSolution` unused prop** — Prop is received but immediately discarded with `_` prefix. If unused, remove from the interface entirely.
  - Files: `src/components/panels/SolverPanel.tsx`, `src/App.tsx`

- [ ] **Add dynamic `<title>` update** — Update `document.title` to reflect game state (e.g., "Red's Turn — Labyrinth Solver") during gameplay.
  - Files: `src/App.tsx` or a small `useDocumentTitle` hook

- [ ] **Timer: auto-pause on tab hidden** — Use the Page Visibility API to pause the stopwatch when the tab goes into the background.
  - Files: `src/hooks/useStopwatch.ts`

- [ ] **Reduce `!important` CSS overrides (low-hanging fruit)** — Identify the most-used components that still use hardcoded `bg-stone-950` etc. and migrate them to use `bg-background`, `bg-card`, `text-foreground` semantic classes. Each converted component removes several `!important` lines.
  - Files: `src/index.css`, various components

---

## 🏗️ Wave 3 — Architectural Refactors (half-day to full-day each)

These are larger, more impactful changes that require careful testing after each step.

- [ ] **Fix duplicate `SolverPanel` / `SetupPanel` render** — Both panels are copy-pasted in the mobile and desktop DOM trees with identical props. Refactor so each panel is rendered once; control visibility with CSS (`hidden md:block` / `md:hidden`) or with an `isMobile` conditional on a single instance.
  - Files: `src/App.tsx`
  - **Risk:** Medium — layout-sensitive, test on both mobile and desktop after

- [ ] **Extract `MobileActionsBar` component** — Lines 1340–1445 of `App.tsx` (the bottom nav bar) are self-contained. Pull into `src/components/MobileActionsBar.tsx`.
  - Files: `src/App.tsx`, new `src/components/MobileActionsBar.tsx`
  - **Risk:** Low

- [ ] **Extract `useSolverWorker` hook** — Move the Web Worker lifecycle (creation, `onmessage`, `onerror`, `terminate`) and solution state (`solutions`, `isLoadingSolutions`, `hoveredSolutionIndex`) out of `App.tsx` into `src/hooks/useSolverWorker.ts`.
  - Files: `src/App.tsx`, new `src/hooks/useSolverWorker.ts`
  - **Risk:** Low-medium — test that solutions still update on board changes

- [ ] **Extract `useSlideStaging` hook** — Pull `stagedArrow`, `stagedRotation`, `handleArrowClick`, `commitStagedSlide`, `cancelStagedSlide` into `src/hooks/useSlideStaging.ts`.
  - Files: `src/App.tsx`, new `src/hooks/useSlideStaging.ts`
  - **Risk:** Low

- [ ] **Extract `usePawnAnimation` hook** — `travelingPawn`, `pawnPositionOverride`, `travelTimerRef`, and `handleExecuteSolutionWithAnimation` into `src/hooks/usePawnAnimation.ts`.
  - Files: `src/App.tsx`, new `src/hooks/usePawnAnimation.ts`
  - **Risk:** Low-medium — test animation timing and cleanup

- [ ] **Fix `any` types throughout** — Replace `pendingResumeState: useState<any>`, `history?: any[]` in types, and the solution path `any` cast with proper interfaces.
  - Files: `src/types.ts`, `src/App.tsx`, `src/components/AppHeader.tsx`
  - **Risk:** Low (compile-time only, no runtime change)

---

## 🧩 Wave 4 — Major Refactors (multi-day, plan carefully)

These are the largest changes. Tackle after Waves 1–3 are stable.

- [ ] **Break up `useLabyrinthGame.ts` (1,326 lines)** into composed sub-hooks:
  - `src/hooks/useBoardManagement.ts` — grid, slide, reset, presets
  - `src/hooks/usePawnManagement.ts` — positions, stats, active pawn rotation, turn switching
  - `src/hooks/useTreasureCollection.ts` — hand management, target selection, obtained tracking
  - Keep `useLabyrinthGame.ts` as a thin composition layer
  - **Risk:** High — touches core game logic. Do one sub-hook at a time with tests between.

- [ ] **CSS theming overhaul** — Migrate components away from hardcoded `stone-*` Tailwind classes to CSS variable-backed semantic classes (`bg-background`, `bg-card`, `text-foreground`). This eliminates the 80+ `!important` overrides in `index.css`.
  - **Risk:** Medium — visual regression risk; do component-by-component with before/after screenshots

- [ ] **Proper `usePreviewState` hook** — Deduplicate `previewState`, `stagedPreviewState`, and `effectivePreview` by consolidating into a single hook that handles all three display modes.
  - Files: `src/App.tsx`, new `src/hooks/usePreviewState.ts`
  - **Risk:** Medium — preview logic is subtle; regression-test by hovering solver suggestions and staging arrows

---

## Notes & Tracking

| Wave | Status | Est. Time |
|------|--------|-----------|
| Wave 1 — Quick Wins | 🟡 In Progress | ~2 hrs |
| Wave 2 — Medium Fixes | ⬜ Not Started | ~1 day |
| Wave 3 — Architectural | ⬜ Not Started | ~2 days |
| Wave 4 — Major Refactors | ⬜ Not Started | ~1 week |

> **Tip:** After each wave, run `npm test` and `npm run typecheck` before moving on.
> **Reminder:** All changes must remain GitHub Pages compatible — no server-side dependencies.
