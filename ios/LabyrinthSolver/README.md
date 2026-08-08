# Labyrinth Solver — Native iOS App

This folder contains the native iOS application for the **Labyrinth Game Solver**, written in **Swift** and **SwiftUI**.

## 📁 Architecture Overview

### Core Game Logic (`Sources/LabyrinthSolverCore/`)
- **`Models/LabyrinthModels.swift`** — Complete data models: `TileShape`, `TileRotation`, `PawnColor` (with emoji), `Treasure` (with emoji), `TileData`, `PawnPosition/Key/Positions`, `MoveOption`, `TurnPhase`, `HistoryEntry`, `PlayerHand`.
- **`Constants/GameConstants.swift`** — Board layout matching the web app exactly: fixed tile positions, rotations, and the 34-tile movable pool (12 corners, 12 straights, 10 T-junctions).
- **`Solver/SolverEngine.swift`** — BFS reachability, slide simulation, best-move search with last-slide restriction, and async execution via `Task.detached`.

### SwiftUI Interface (`Sources/LabyrinthSolverApp/`)
- **`LabyrinthSolverApp.swift`** — `@main` entry point, `ContentView` with full navigation/toolbar, `SettingsSheet`.
- **`GameViewModel.swift`** — `@Observable` ViewModel with full game state: two-phase turns (slide → move pawn), undo/redo history (30 moves), pawn management, async solver, toast system.
- **`Views/LabyrinthBoardView.swift`** — 7×7 grid with properly sized arrow buttons, staged arrow highlighting, turn-phase-aware arrow enabling/disabling.
- **`Views/TileView.swift`** — `Canvas`-based tile rendering with filled corridor paths, amber walls, treasure emoji+name badges, reachable/target highlights, pawn tokens with active state animation.
- **`Views/SupportingViews.swift`** — `SpareTilePanel`, `PlayerPanel`, `SolverPanelView`, `PlayerHandPanel`, `ToastView`.

---

## ✨ Features

| Feature | Web App | iOS App |
|---------|---------|---------|
| 7×7 Labyrinth board | ✅ | ✅ |
| Shift row/column with arrows | ✅ | ✅ |
| Two-phase turns (slide → move) | ✅ | ✅ |
| No-reverse-slide rule | ✅ | ✅ |
| Undo / Redo (30 levels) | ✅ | ✅ |
| Pawn movement (BFS reachability) | ✅ | ✅ |
| Staged arrow with preview | ✅ | ✅ |
| Target treasure highlighting | ✅ | ✅ |
| Async solver (best move) | ✅ | ✅ |
| Player hand management | ✅ | ✅ |
| Treasure emoji on tiles | ✅ | ✅ |
| Pawn color indicators | ✅ | ✅ |
| Toast notifications | ✅ | ✅ |
| Settings sheet | ✅ | ✅ |

---

## 🚀 How to Run in Xcode

1. Open **Xcode** on your Mac.
2. Select **File › Open** (`Cmd + O`).
3. Navigate to this directory and open `LabyrinthSolver.xcodeproj`.
4. Select an **iPhone 16 Pro** simulator from the top target selector.
5. Press **Run** (`Cmd + R`) to launch the app!

### Alternatively (Swift Package — macOS only):
```bash
cd ios/LabyrinthSolver
swift run LabyrinthSolverApp
```

---

## 🎮 How to Play

1. **Slide Phase**: Tap one of the amber arrow buttons (↓↑→←) around the board to stage a row/column slide. Tap the same arrow again to rotate the spare tile. Tap **Confirm Slide** to apply.
2. **Move Phase**: Highlighted tiles (green) show where your pawn can move. Tap any green tile to move.
3. **Solver**: Tap **Find Best Move** in the solver panel, select a target treasure, and the solver will suggest the optimal slide + spare rotation.
4. **Undo/Redo**: Use the ↩/↪ buttons in the toolbar to undo or redo moves.

---

## 📐 Board Layout (matches web app exactly)

Fixed corner tiles:
- `(0,0)` → Red pawn start
- `(6,6)` → Blue pawn start  
- `(6,0)` → Green pawn start
- `(0,6)` → Yellow pawn start

Fixed T-junction treasures at all even-coordinate positions.
