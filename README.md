# Labyrinth Game Solver (Desktop Edition)

Labyrinth Game Solver is a desktop application designed to solve configurations of the classic board game **Ravensburger Labyrinth**. The application helps users design board layouts, set up player pawns and target cards, and utilizes an optimized Breadth-First Search (BFS) solver to compute the shortest path of moves (tile shifts and pawn steps) required to collect target cards.

It runs locally as a cross-platform desktop application powered by **Electron**, **Vite**, **React**, **TypeScript**, and **Tailwind CSS v4**.

---

## Key Features

1. **Intuitive Drag-and-Drop Editor**: Build board configurations easily. Drag movable tiles from a side panel, drop them on the grid, and click to rotate. The app enforces strict game board setup constraints (12 movable corner tiles, 12 movable straight tiles, 9 movable T-junction tiles, and exactly 1 spare tile).
2. **Accurate Official Board Game Layouts**:
   - Swapped diagonal corner colors to exactly match the board game: **Red (Top-Left)** is diagonal to **Blue (Bottom-Right)**, and **Yellow (Top-Right)** is diagonal to **Green (Bottom-Left)**.
   - Textual labels replace vague emojis, displaying exact board treasures (e.g. "Foot Ghost", "Lady Pig", "Gold Menorah", "Book with Clasp").
3. **Multi-Threaded BFS Solver**: Computes path combinations on a separate background Web Worker (`solver.worker.js`), keeping the Electron UI fluid and responsive even during complex, high-depth searches.
4. **Interactive Path Overlays**: Shows visual indicators on the 7x7 board for reachable cells, invalid shift arrow moves (restricting immediate opposite slidebacks), and overlays the gold path of the suggested move. Click "Execute" to execute the move instantly.
5. **Retro Synthesized Sounds**: Retro sound effects built natively using Web Audio API oscillators to provide feedback on tile rotation, grid sliding, pawn hops, and successful target card capture.
6. **Timeline History & Persistence**: Support for complete Undo/Redo history states and automatic local storage synchronization to seamlessly resume setup or gameplay sessions.

---

## Getting Started

### Option A: Standalone Desktop App (Recommended / Easiest)
If you want to run the Labyrinth Game Solver instantly without editing code or using the terminal, you can download a pre-packaged installer:

1. Go to the [Labyrinth Game Solver Releases page](https://github.com/JLeshnick/Labyrinth-Game-Solver/releases) on GitHub.
2. Download the installer for your operating system:
   - **macOS**: Download the `.dmg` or `.zip` file.
   - **Windows**: Download the `.exe` installer.
3. Install and launch:
   - **macOS**: Open the `.dmg` and drag Coaster HUD Studio to your Applications folder.
   - **Windows**: Run the `.exe` file and follow the onscreen setup prompts.

The packaged app automatically checks for and applies new updates on startup.

---

### Option B: Developer Setup (Running from Source)

#### Prerequisites
To run the project from source, you need [Node.js](https://nodejs.org/) (v18 or newer) and [Git](https://git-scm.com/) installed on your computer.

#### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/jleshnick/Coaster-Telemetry-Video-Overlay.git
   cd Coaster-Telemetry-Video-Overlay
   ```
2. Install the package dependencies:
   ```bash
   npm install
   ```

---

## How to Run & Build

### 1. Run Electron Desktop (Development Mode)
Launches the application inside the native Electron shell with Hot Module Replacement (HMR) enabled:
```bash
npm run dev
```

### 2. Compile Standalone Desktop App (Local Package)
Builds the production assets and packages the app as a standalone executable in the `release/` directory:
```bash
npm run build:electron
```
- **macOS output**: `./release/mac/` or `./release/mac-arm64/`
- **Windows output**: `./release/win-unpacked/`

---

## Interactive Workspace Tabs

### 🛠️ Setup Phase (Edit Mode)
Before starting the game, you configure the board configuration using three tabs in the sidebar:
- **Tiles Tab**: Drag the 33 movable pieces from the loose pool onto the 7x7 grid. Clicking a placed tile rotates it clockwise. Standard board constraints must be met to play.
- **Pawns Tab**: Choose a pawn color and click any cell on the grid to position it.
- **Cards Tab**: Assign target treasure cards to each player's hand.

### 🎮 Gameplay Phase (Play Mode)
Clicking **Start Game** locks the board configuration and transitions the app to gameplay:
- **Slide Insertions**: Click highlighted orange shift arrows along the edges to push the spare tile into the grid, shifting tiles along that row/column and sliding a new spare tile out the opposite end.
- **Pawn Movements**: Move the active player's pawn to any reachable coordinate on the path. Capturing the active target card pops it off the hand.
- **Solver Suggestions**: Click "Solver" to let the BFS algorithm find the optimal next move. Click **Execute** to run the suggested path step.
- **Undo / Redo**: Use the history controls in the top header to navigate forward or backward through shifts.

---

## Directory Structure

```
src/
├── main-electron.cjs       # Electron main process & port polling
├── preload.cjs             # Electron context isolation bridge
├── App.tsx                 # Core application controller & React state machine
├── index.css               # Tailwind CSS v4 styling & scrollbars
├── main.tsx                # Bootstrap React mounting
├── solver.js               # Legacy solver logic (BFS, sliding, reachability)
├── solver.worker.js        # Background worker for non-blocking solver computations
├── solver.d.ts             # TypeScript module declarations for solver functions
├── constants.ts            # Official board presets, coordinates, and treasure names
├── types.ts                # App-wide TypeScript interfaces
├── components/             # React view components
│   ├── Board.tsx           # 9x9 Layout grid (arrows, tiles, reachable overlays)
│   ├── SidePanel.tsx       # Loose tiles container
│   ├── Tile.tsx            # Corridor renders, starting colors, and descriptions
│   └── ui/                 # Accessible Radix primitives and UI shells
├── hooks/                  # Custom React hooks
│   ├── useLabyrinthHistory.ts  # deepClone timeline undo/redo
│   └── useLabyrinthStorage.ts  # Autosave state management
└── utils/                  # Utility functions
    └── audio.ts            # Web Audio API retro oscillator sound effects
```

---

## License

[MIT](LICENSE)
