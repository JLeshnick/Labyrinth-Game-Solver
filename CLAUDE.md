# Labyrinth Game Solver — Claude/Gemini Context

This is the project root for Labyrinth Game Solver, a native desktop application built with Electron, React, TypeScript, and Tailwind CSS v4 to configure and solve Ravensburger Labyrinth board game layouts.

## Quick Reference

| Command | Action | Description |
|---|---|---|
| `npm run dev` | Launch Dev Mode | Starts Vite server on port 3000/3001 and Electron concurrent window |
| `npm run dev:electron` | Launch Dev Mode | Alias for concurrent dev start |
| `npm run dev:web` | Start Web Server | Starts local browser-only dev server at http://localhost:3000 |
| `npm run build` | Vite compile | Compiles static assets under `dist/` |
| `npm run pack:electron` | Local Build Unpacked | Builds local executables under `release/mac-arm64/` or `release/win-unpacked/` |
| `npm run build:electron` | Local Package Installer | Packages production installers (.dmg, .zip, .exe) in `release/` |
| `npm run lint` | Lint check | Runs `oxlint` |

## Essential Facts

- **Tech Stack**: React 19, Vite 8, TypeScript 6, Tailwind CSS v4, `@dnd-kit/core` (drag and drop), `lucide-react` (icons), Electron 43.
- **Port Detection**: Electron's entry points poll ports `3000` and `3001` sequentially to locate the Vite dev server before loading the renderer window.
- **Path Resolving**: In `vite.config.ts`, `base: './'` is configured so that files compile with relative links to support Electron's `file://` protocol. Alias `@/` maps to the `src/` folder.
- **Safe Deep Copy**: `useLabyrinthHistory.ts` uses a custom `deepClone` (via `JSON.parse(JSON.stringify(...))`) instead of solver's `cloneBoard()` to avoid crash errors with `null` grid values.
- **Auto-Save**: The state synchronizes to `localStorage` under `labyrinth_saved_slots_list` and `labyrinth_strategist_state`.

## Release Pipeline

Merging any PR to `main` automatically bumps the version and publishes a GitHub Release — **do not merge to main unless shipping is intended**.

Version bump is driven by the merge commit message prefix:
- `feat:` → minor bump
- `fix:` / `chore:` / `refactor:` / `docs:` / `style:` / `perf:` / `test:` / `ci:` → patch bump
- `BREAKING CHANGE` anywhere in the message → major bump

Always prefix commits with one of these types. Add `[skip ci]` to skip the pipeline entirely. See `DEVELOPMENT_AND_RELEASES.md` for full details.

## Coding Style Rules

1. **Keep Imports Simple**: Do not import `RotateCw` or unused utilities. Import type definitions using `import type { ... }` when utilizing TS type configurations.
2. **Type Declarations**: Ensure callback arguments are explicitly typed (e.g. `(cell: { r: number; c: number }) => ...` or `(t: TileData | null) => ...`) to avoid compiler implicit-any issues.
3. **Responsive Spacing**: Tiles should scale dynamically from mobile to large screens: `w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24`.
