# Changelog: Labyrinth Solver Redesign

All notable changes to the Labyrinth Solver V2 will be documented in this file.

## [2.0.0] - Modernized Design & Refactored Architecture

### Added
- Created V2 Master Plan, Design System guidelines, and updated Architecture specs.
- Designed premium application frame shell (desktop sidebar layout, mobile drawer layouts).
- Integrated framer-motion animations for sidebar transitions and tile shifts.
- Implemented high-contrast Light/Dark mode themes.
- Added **3D Isometric Perspective View**: Live 3D board tilting with card/badge billboarding to stand upright towards the camera.
- Added **3D Plastic Beveled Tiles**: Straight corridor tiles are styled Cobalt Blue, corners are Emerald Green, and T-junctions are Golden Yellow with beveled color-matched height shadows.
- Added **Rounded Pathway Tubes**: Replaced blocky pathways with smooth white plastic tubes with highlight bevels and drop-shadow styling.
- Added **Glossy Peg Pawns & Gold Coins**: Pawns render as glossy spherical 3D pegs, and treasures render as circular gold medallions.

### Changed
- Removed temporary Dashboard widgets panel as requested.
- Refactored component structure to segregate board items and side panels.
- Upgraded CSS style overlays from hard-coded classes to Tailwind CSS semantic styling variables.
- Improved accessibility of grid items with interactive labels and keys.
