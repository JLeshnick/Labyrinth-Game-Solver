# Decisions Log: Labyrinth Solver V2

This document records the Architectural Decision Records (ADRs) for Project Phoenix.

---

## ADR 1: Unified Component Organization

### Context
The original project placed all UI components (board, tiles, settings dialog, setup panel, side sheets) inside a flat `src/components/` directory. As the application grows in features, this clutter makes it harder to identify visual modules and reuse styles.

### Decision
Segregate components into functional subfolders under `src/components/`:
- `board/`: Contains the board grid space (`Board.tsx`, `Tile.tsx`, and relevant helper cards).
- `panels/`: Houses sidebar panels (`SetupPanel.tsx`, `SolverPanel.tsx`, `StatsPanel.tsx`).
- `modals/`: Houses full screen and overlay dialogs (`SettingsDialog.tsx`, `BoardScanModal.tsx`, `MoveHistoryDialog.tsx`, `WelcomeGuide.tsx`).
- `ui/`: Standard reusable design primitives.

### Consequences
- Imports will be cleaner and localized.
- Easier to navigate component dependencies.
- Avoids namespace clutter.

---

## ADR 2: Responsive Workspace Grid

### Context
The board is the hero element of the game (~70% visual focus on desktops). We need a layout that handles both ultra-wide screens and compact mobile devices (portrait screens, touch inputs).

### Decision
We will construct a CSS Grid wrapper in `App.tsx` that splits the layout:
- **Desktop (md and above)**: A 3-column grid of `[Setup Sidebar (Left)] [Board (Center)] [Solver & Analysis (Right)]`.
- **Mobile / Portrait**: A vertical stacks system where the board is centered at the top, and bottom-sheets / sliding drawer panels display Setup/Solver actions.

### Consequences
- Optimizes board layout constraints dynamically.
- Eliminates overlapping widgets or double scrollbars.
