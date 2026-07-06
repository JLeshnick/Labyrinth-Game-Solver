# Labyrinth Game Rules & Solver Configuration

This file outlines the official Ravensburger Labyrinth board rules, coordinate structures, and configuration details for the solver.

## Game Configuration Rules

1. **Board Layout**: A 7x7 grid of pathways. 
   - **Fixed Tiles**: 16 tiles are permanently glued to the board at coordinates `(x, y)` where both `x` and `y` are even (`0, 2, 4, 6`). These are automatically loaded by presets on startup and locked.
   - **Movable Tiles**: The remaining 33 spaces are filled using tiles from a randomized pool.
2. **Tile Shapes & Limits**:
   - **Straights (`'straight'`)**: 12 tiles total.
   - **Corners (`'corner'`)**: 12 tiles total (including 4 diagnostic corner start pawns).
   - **T-Junctions (`'t-junction'`)**: 9 tiles total.
   - **Spare Tile**: Exactly 1 tile must remain outside the board to slide into rows or columns.
3. **Pawn Placement**: 4 starting corners are mapped:
   - **Red Pawn**: Top-Left `(0, 0)` - locked coordinates `r: 0, c: 0`.
   - **Blue Pawn**: Bottom-Right `(6, 6)` - locked coordinates `r: 6, c: 6`.
   - **Green Pawn**: Bottom-Left `(0, 6)` - locked coordinates `r: 6, c: 0`.
   - **Yellow Pawn**: Top-Right `(6, 0)` - locked coordinates `r: 0, c: 6`.
   *Note: Red is opposite Blue, and Green is opposite Yellow.*
4. **Official Treasures**: 24 named treasure cards.
   - 12 treasures are permanently fixed on the board.
   - 12 treasures are placed on the movable tiles.

---

## Solver Formatting & Translation

The legacy solver engine (`solver.js` / `solver.worker.js`) expects data representations different from our React frontend:

### 1. Shape Representation
- **React Frontend**: `'straight'`, `'corner'`, `'t-junction'`
- **Solver Engine**: `'I'`, `'L'`, `'T'`

### 2. Rotations
- **React Frontend**: `0` | `90` | `180` | `270` (degrees)
- **Solver Engine**: `0` | `1` | `2` | `3` (indices representing clockwise increments)

### 3. State Syncing
Before running a solver loop, state must be passed through the formatter functions inside `App.tsx`:
- **`getSolverFormattedBoard(grid, pawnPositions)`**: Converts the 7x7 React `(TileData | null)[][]` grid into a clean 2D array of solver cells, applying current pawn coordinates onto the board.
- **`getSolverFormattedSpare(spareTile)`**: Formats the loose spare tile.

---

## Shifting Verification Rules

- Sliding is only allowed along odd indices (`1, 3, 5`).
- The player cannot immediately slide a row or column back in the opposite direction of the last turn's slide (restricted by `isOppositeArrow`).
- Pawns that slide off the grid are wrapped around and placed on the newly inserted tile on the opposite end.
