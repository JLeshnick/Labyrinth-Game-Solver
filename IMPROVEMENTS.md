# Labyrinth Game Solver — Improvement Plan

A phased, checkbox-driven roadmap for cleaning up, fixing, polishing, and hardening the app. Work through it at your own pace — each phase leaves the app in a shippable state. Check items off as you complete them.

## Context

The app works and looks polished, but a deep review of the codebase surfaced a consistent picture: a large amount of dead code, a UI theming layer that is only half-wired (so several visual features silently do nothing), heavy duplication concentrated in one 2,123-line file (`src/App.tsx`), no type safety across the solver boundary, and zero tests. None of these block usage today, but together they make the code fragile and hard to extend, and they leave visible polish on the table (themes that don't re-theme the whole app, tile-scaling breakpoints that don't apply, buttons/cards rendering with undefined colors).

This plan cleans up the codebase, fixes latent bugs, makes theming truly global, deeply refactors the monolithic `App.tsx`, and stands up a real test suite. It is organized into **6 phases** ordered by risk/dependency.

**Recommended order:** `1 → 2 → 3` deliver visible wins fast and low-risk; `4 → 5` are the structural investment (do together — they're coupled); `6` hardens and locks in quality. Commit at the end of each phase. After each phase run `npm run build` and a manual smoke test: new project → setup → solve → execute → save/load → theme switch.

---

## Phase 1 — Dead code & safe cleanup (near-zero risk)

Delete the orphaned pre-TypeScript prototype and stale files. None are imported by the live tree (`main.tsx` → `App.tsx`).

- [x] Delete `src/App.jsx` (1,236 lines — orphaned JS prototype, never imported)
- [x] Delete `src/components/ControlPanel.jsx` (520 lines — only imported by dead `App.jsx`)
- [x] Delete `src/components/TileEditorModal.jsx` (178 lines — only imported by dead `App.jsx`)
- [x] Delete `src/App.css` (unused Vite-template CSS; only imported by the dead `App.jsx`)
- [x] Delete `src/components/ui/scroll-area.tsx` (never imported anywhere)
- [x] Delete `patch.js` (repo root) — stale build hack with a broken line-wrapped path string; the fix it applies (`process.platform` → `navigator.userAgent`) is already baked into `App.tsx`, and it is not wired into any npm script or workflow
- [x] Collapse `src/solver.d.ts` — it declares the identical block twice (once for `"../solver"`, once for `"./solver"`); keep one shared body
- [x] Collapse the byte-identical `dev` / `dev:electron` scripts in `package.json` into one

**Check after:** `npm run build` and `npm run dev` still work; `grep` confirms no imports of the deleted files remain.

---

## Phase 2 — Bug fixes (correctness)

Small, targeted fixes for real defects found during review.

- [x] **Duplicate pawn start position** — `src/App.tsx:110-112`: `red` and `green` both initialize to `{r:6,c:0}`. Reconcile with the presets in `resetBoardToInitialPresets` (`App.tsx:329-334`) where `red` is `{r:0,c:0}`. Fix the initial `useState` so all four pawns start in distinct corners.
- [x] **Broken tile-scaling breakpoints** — `src/components/Tile.tsx:81`: `lg:w-18 lg:h-18` are not valid Tailwind classes (no `4.5rem` step by default). Either drop that breakpoint or define an `18` spacing token in the `@theme` block (Phase 3). Affects the SidePanel palette and DragOverlay, where the fixed size chain is not overridden by the board's `w-full h-full`.
- [x] **`animate-fade-in` is a no-op** — referenced at `App.tsx:1202,1217` but no `@keyframes fade-in` / `.animate-fade-in` exists in `index.css`. Add the keyframes (Phase 3) or remove the class usages.
- [x] **Random tile IDs** — `handleSlide` / `handleExecuteSolution` synthesize `'movable_' + Math.random()` for null cells (`App.tsx:789-792, 970-973`). Replace with a stable monotonic counter (or derive the ID from position) to avoid React key churn/collisions.
- [x] **Visible debug label** — hide the faint `y,x` coordinate text on empty cells (`Board.tsx:85`) behind a dev-only flag, or remove it.
- [x] **Duplicated default pawn-position object** appears literally in `resetBoardToInitialPresets` (`App.tsx:329`), `handleLoadSlot` (`380`), and the autosave effect (`518`) — ensure they all agree once the Phase 2 fix lands (fully centralized in Phase 4).

**Check after:** Start a new project, place pawns, run the solver, execute a suggested slide — confirm pawns start in the four distinct corners and tiles render at all breakpoints.

---

## Phase 3 — UI / theming polish

Make theming truly global and fix the silently-broken style layer. Highest visible-impact phase.

- [x] **Populate a Tailwind v4 `@theme` block** in `src/index.css` mapping the shadcn semantic tokens the `ui/` primitives depend on: `--color-primary`, `--color-primary-foreground`, `--color-background`, `--color-card`, `--color-card-foreground`, `--color-secondary`, `--color-secondary-foreground`, `--color-destructive`, `--color-accent`, `--color-accent-foreground`, `--color-muted-foreground`, `--color-border`, `--color-input`, `--color-ring`, `--radius`. Currently none are defined, so `Button variant="default|secondary|destructive"`, `Card`, and `Dialog` render with transparent/undefined colors and `focus-visible` rings never appear. Verified against `src/components/ui/button.tsx:12-21`, `card.tsx:10`, `dialog.tsx:62`.
- [x] **Add missing custom utilities** in `index.css`: `@keyframes fade-in` + `.animate-fade-in`; and (if keeping the tile breakpoint) an `18: 4.5rem` spacing entry in `@theme`.
- [x] **Replace hard-coded `amber-*` with `theme-primary` helpers** where accents should be themeable. Today only the header consumes the theme, so switching themes leaves most of the app amber. Locations:
  - [x] Landing page (`App.tsx:1041-1127`)
  - [x] Solver suggestion cards (`~1825-1852`)
  - [x] Setup tabs (`~1925-1945`)
  - [x] Toast (`~2116`)
  - [x] Treasure chips (`~2040`)
  - [x] Card-add buttons (`~2081`)
  - [x] "Load" icons (`~1117, 1383`)
- [x] **Fix non-existent color classes** — `stone-850` and `stone-750` (18+ uses in `App.tsx`, plus `Board.tsx`) are not in Tailwind's stone scale and render as nothing. Replace with `stone-800` / `stone-700`, or define `850` / `750` as custom tokens in `@theme` and keep the names.
- [x] **Reconsider the persistent toast animation** — `animate-bounce` on a lingering notification (`App.tsx:2116`) is aggressive; switch to a subtle fade/slide.
- [x] **Add `prefers-reduced-motion` handling** to gate the looping animations (`animate-dash`, `animate-pulse`, `animate-ping`).
- [x] **(Accessibility) Add `aria-label`s to icon-only buttons** (Rotate, Settings, Undo/Redo, Mute, peek/delete — currently rely on `title` only).
- [x] **(Accessibility) Add keyboard support to board cells** — `Board.tsx:50` clickable `<div>`s have no `role`, `tabIndex`, or `onKeyDown`; add them for keyboard navigation. Add `aria-label` to the shift-arrow buttons.

**Check after:** Cycle through several themes in Settings → Themes and confirm the landing page, solver cards, setup tabs, and toast all recolor. Confirm default/secondary/destructive buttons and cards now have visible backgrounds.

---

## Phase 4 — Shared types & solver adapter (foundation for refactor)

Introduce type safety and a single home for the React↔solver translation before splitting components.

- [x] **Create `src/lib/solverAdapter.ts`** and move the duplicated mapping constants there as module-level singletons:
  - `shapeMap` / `dirMap` (React→solver) — currently inline in `getSolverFormattedBoard` (`App.tsx:236-246`), `getSolverFormattedSpare` (`287-297`), and `Board.tsx:155-165`.
  - `shapeMapRev` / `dirMapRev` (solver→React) — duplicated verbatim in `handleSlide` (`773-783`) and `handleExecuteSolution` (`954-964`).
  - Export `toSolverBoard`, `toSolverSpare`, `fromSolverBoard`, and a shared grid-rebuild helper. Have `Board.tsx` and `App.tsx` both import these.
- [x] **Add shared types** in `src/types.ts` (or new `src/lib/appState.ts`): `SolverCell` (`{r,c,shape,dir,treasure,isFixed,pawns}`), `Solution`, and a single `AppState` interface (board, spareTile, looseTiles, hands, targets, positions, etc.).
- [x] **Type the hooks & solver against the shared types** — remove `any` from `useLabyrinthStorage.ts:42,61`, `useLabyrinthHistory.ts:9-10,40-41`, and `solver.d.ts` (currently the whole solver API is `any` in/`any` out).
- [x] **Centralize defaults** — extract into named factory functions (in `constants.ts` or the new state module): the repeated default pawn positions; the `{ red:[], blue:[], green:[], yellow:[] }` hand/target objects (~8 repeats); and the `FIXED_TILES_PRESETS` grid-builder loop (duplicated at `App.tsx:314-324` and `421-431`).
- [x] **Centralize the pawn color map** — `PAWNS` in `constants.ts` already has `colorClass`; use it and remove the 4 inline red/blue/green/yellow → `bg-*-500` duplicates (`Board.tsx:96-101`, `App.tsx:1446-1453, 1522-1530, 2019`). Added `tokenClass` to `PAWNS` for pawn token rendering.

**Check after:** `npm run build` type-checks clean; solver still produces suggestions; save/load round-trips a project correctly.

---

## Phase 5 — Deep refactor of `App.tsx`

Break the 2,123-line god component into focused pieces. Do this after Phase 4 so the extracted pieces import shared adapters/types rather than re-declaring them.

- [x] **Extract `LandingPage.tsx`** (from `App.tsx:1041-1127`) — `src/components/LandingPage.tsx`
- [ ] **Extract `AppHeader.tsx`** (from `~1131-1689`) — header with title/ribbon/buttons; still inline
- [x] **Extract `SettingsDialog.tsx`** (from `~1244-1598`) — `src/components/SettingsDialog.tsx` with SIDEBAR_TABS and THEMES constants extracted
- [x] **Extract `SetupPanel.tsx`** (tiles/pawns/cards) and **`SolverPanel.tsx`** (suggestions list) — `src/components/SetupPanel.tsx` and `src/components/SolverPanel.tsx`; setupTab state moved into SetupPanel
- [x] **Consolidate the duplicated slide/execute logic** — `handleSlide` (`749-858`) and `handleExecuteSolution` (`931-1023`) are near-identical (slide → rebuild grid → set spare → check treasure match, copy-pasted a third time in `handleCellClick`). Extracted shared `fromSolverGrid` / `fromSolverSpare` helpers in `solverAdapter.ts`; both handlers now call these instead of inline loops.
- [ ] **Lift state into a reducer or context** — the ~25 `useState` hooks are prop-drilled everywhere. Introduce a `useLabyrinthGame` hook (or `useReducer` + context) that owns board/spare/pawns/hands/targets and the game handlers, so view components consume a typed context instead of dozens of props.
- [x] **Unify mute handling** — read from `isMuted` state consistently; drop the redundant direct `localStorage.getItem("labyrinth_audio_muted")` reads (`App.tsx:194, 358, 367`) since `audio.ts` already guards internally.

**Check after:** Full manual pass — new project, setup wizard, start game, solve, execute, undo/redo, save/load slot, settings tabs, theme switch. Behavior must be identical to pre-refactor.

---

## Phase 6 — Tooling, resilience & tests (full setup)

- [x] **Add Vitest** (`vitest`, `@vitest/ui`, `jsdom`, `@testing-library/react`) and add `"test"`, `"test:watch"`, and `"typecheck": "tsc -b --noEmit"` scripts to `package.json`.
- [x] **Unit-test `solver.js` first** (pure, high-value, silent-bug-prone): `getOpenDirections`, `areConnected`, `getReachableCells` + path reconstruction, `executeSlideInGrid` (including pawn carry/wrap), `isOppositeArrow`. Tests in `src/solver.test.ts`. Adapter round-trip included.
- [ ] **Component/integration tests** — storage hook (save→load), smoke render of main views.
- [x] **Wire CI** — added `.github/workflows/ci.yml` (typecheck + lint + test + build) alongside existing release workflow.
- [ ] **Enable TypeScript `strict`** in `tsconfig.app.json` and fix the fallout (most `any`s are already removed in Phase 4). Keep `ignoreDeprecations` if still needed for TS 6.
- [ ] **Expand oxlint** (`.oxlintrc.json`) — enable `no-explicit-any` and unused-vars rules; add Prettier + `.editorconfig` for consistent formatting.
- [x] **Add an `ErrorBoundary`** — `src/components/ErrorBoundary.tsx` wraps the app in `main.tsx`. Shows a recovery UI with error message and retry button. Worker errors now call `showToast` and `onerror` is wired.
- [x] **Wrap direct `localStorage.setItem` calls** in `App.tsx` (`170, 182, 224, 585`) in try/catch, or route them through `useLabyrinthStorage`, so full/blocked storage (private mode) doesn't throw uncaught.
- [x] **Reconcile version drift** — `package.json` `"version": "0.0.0"` vs the hardcoded `"v1.0.1"` in the UI (`App.tsx:1251, 1290`). Read the version from a single source. Wired via `__APP_VERSION__` Vite define; bumped package.json to `1.0.1`.
- [x] **Web-first migration & Electron removal**: Replaced the Electron desktop shell and build pipeline with a pure web application optimized for mobile (iPhone Safari/PWA) and hosted for free via GitHub Pages.
- [x] **Verify/remove unused deps** — removed `@dnd-kit/sortable`, `@dnd-kit/utilities` (never imported), and `framer-motion` (never imported) from `package.json`.

**Check after:** `npm run test`, `npm run typecheck`, and `npm run lint` all pass; kill the worker mid-solve to confirm the ErrorBoundary/error UI engages.

---

## Critical files

- `src/App.tsx` — focus of Phases 2, 4, 5
- `src/index.css` — Phase 3 theming
- `src/components/{Tile,Board,SidePanel}.tsx`, `src/components/ui/*`
- `src/solver.js`, `src/solver.d.ts`, `src/solver.worker.js` — Phases 4, 6
- `src/hooks/useLabyrinth{History,Storage}.ts`, `src/constants.ts`, `src/types.ts`
- `tsconfig.app.json`, `.oxlintrc.json`, `package.json`
- **Deletions (Phase 1):** `src/App.jsx`, `src/App.css`, `src/components/ControlPanel.jsx`, `src/components/TileEditorModal.jsx`, `src/components/ui/scroll-area.tsx`, `patch.js`
