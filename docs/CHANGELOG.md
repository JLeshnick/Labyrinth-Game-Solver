# Changelog: Labyrinth Solver Redesign

All notable changes to the Labyrinth Solver V2 will be documented in this file.

## [2.0.0] - Modernized Design & Refactored Architecture

### Added
- Created V2 Master Plan, Design System guidelines, and updated Architecture specs.
- Designed premium application frame shell (desktop sidebar layout, mobile drawer layouts).
- Integrated framer-motion animations for sidebar transitions and tile shifts.
- Implemented high-contrast Light/Dark mode themes.
- Added **3D Isometric Perspective View**: Live 3D board tilting with card/badge billboarding to stand upright towards the camera.
- Added **3D Board Tray Platform**: Grid board tilts inside a real 3D play tray styled in Neo-Brutalism thick borders and shadows, scaling responsively utilizing `w-full h-full aspect-square` grids.
- Added **Rounded Pathway Tubes**: Replaced blocky pathways with smooth white plastic tubes with highlight bevels and drop-shadow styling.
- Added **Glossy Peg Pawns & Gold Coins**: Pawns render as glossy spherical 3D pegs, and treasures render as circular gold medallions.
- Added **Soft-Neumorphic Shadows**: Standard 2D view renders tiles and buttons with double-shadow highlights (`shadow-neumorphic`) for a soft, pillow-like extruded look.
- Added **Neo-Brutalist Styling**: Cards and buttons utilize thick black borders and flat offset solid shadows (`neo-brutalism-card` and `neo-brutalism-button`).

### Changed
- Unified all tiles to render as a consistent warm stone gray clay block with thick black outlines (pawn starts retain colors for game logic).
- Removed temporary Dashboard widgets panel.
- Refactored color system to map shadcn/ui semantic variables (background, card, border) to theme-aware values, eliminating hardcoded dark panels in light mode.
