# Labyrinth Game Solver — Claude/Gemini Context

This is the project root for Labyrinth Game Solver, a responsive, mobile-friendly web application built with React, TypeScript, and Tailwind CSS v4 to configure and solve Ravensburger Labyrinth board game layouts.

## Quick Reference

| Command | Action | Description |
|---|---|---|
| `npm run dev` | Start Dev Server | Launches local browser-only dev server at http://localhost:3000 |
| `npm run build` | Vite compile | Compiles static assets under `dist/` |
| `npm run preview` | Local preview | Serves the compiled `dist/` production build locally |
| `npm run lint` | Lint check | Runs `oxlint` |
| `npm run typecheck` | TS Check | Runs `tsc -b --noEmit` to verify type safety |
| `npm run test` | Run tests | Runs unit tests once via `vitest` |
| `npm run test:watch` | Watch tests | Runs unit tests in interactive watch mode |

## Essential Facts

- **Tech Stack**: React 19, Vite 8, TypeScript 6, Tailwind CSS v4, `@dnd-kit/core` (drag and drop), `lucide-react` (icons).
- **Mobile Standalone / PWA**: Configured with Apple Web App meta tags to allow launching full-screen from the iPhone home screen. Max viewport bounds prevent bouncing and double-tap zoom.
- **Path Resolving**: In `vite.config.ts`, `base: './'` is configured so that files compile with relative links to support hosting on GitHub Pages subpaths. Alias `@/` maps to the `src/` folder.
- **Safe Deep Copy**: `useLabyrinthHistory.ts` uses a custom `deepClone` (via `JSON.parse(JSON.stringify(...))`) instead of solver's `cloneBoard()` to avoid crash errors with `null` grid values.
- **Auto-Save / Game Storage**: The board layout and game state are autosaved to the browser's `localStorage` under `labyrinth_strategist_state` and restored on reload. User preferences (theme, accent color, mute, 3D, active players) use separate keys (`labyrinth_theme`, `labyrinth_accent_color`, etc.).

## Release Pipeline

Merging any PR to `main` automatically bumps the version, publishes a GitHub Release, and deploys to GitHub Pages — **do not merge to main unless shipping is intended**.

Version bump is driven by the merge commit message prefix:
- `feat:` → minor bump
- `fix:` / `chore:` / `refactor:` / `docs:` / `style:` / `perf:` / `test:` / `ci:` → patch bump
- `BREAKING CHANGE` anywhere in the message → major bump

Always prefix commits with one of these types. Add `[skip ci]` to skip the pipeline entirely. See `DEVELOPMENT_AND_RELEASES.md` for full details.

## Coding Style Rules

1. **Keep Imports Simple**: Do not import `RotateCw` or unused utilities. Import type definitions using `import type { ... }` when utilizing TS type configurations.
2. **Type Declarations**: Ensure callback arguments are explicitly typed (e.g. `(cell: { r: number; c: number }) => ...` or `(t: TileData | null) => ...`) to avoid compiler implicit-any issues.
3. **Responsive Spacing**: Tiles should scale dynamically from mobile to large screens: `w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 lg:w-24 lg:h-24`.
