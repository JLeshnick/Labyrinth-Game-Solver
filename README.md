# 🧭 Labyrinth Strategist

**Labyrinth Strategist** is an interactive companion, helper, and pathfinder solver for the classic Ravensburger board game, *The Amazing Labyrinth*. 

This application allows players to replicate their physical board game state, plan multi-turn moves, compute optimal slide configurations, evaluate defensive safety indices, and simulate shifts in real-time. Built with a high-performance pathfinding solver offloaded to background threads, it delivers immediate solutions without blocking the browser.

---

## 🚀 Key Features

*   **⚡ Web Worker-Offloaded Solver:** Computes multi-turn path solutions asynchronously. BFS pathfinding is fully decoupled from the UI thread, ensuring a smooth 60 FPS experience.
*   **🧩 Interactive 7x7 Grid Builder:** Easily customize tile shapes, rotations, fixed anchors, and card locations.
*   **🔮 Real-Time Slide Preview:** Hover over slide arrow triggers or drag the spare tile to see a translucent visual highlight of which row or column will shift.
*   **🎮 Turn-Based Multiplayer:** Track separate hand cards, active pawn coordinates, and targets for all 4 players (Red, Blue, Green, Yellow).
*   **💾 Profile Save Slots:** Save manual board layout checkpoints or recover from automatic game session autosaves using local browser storage.
*   **🖱️ Streamlined Edit Interactions:** 
    *   *Left Click:* Rotate exits 90° clockwise.
    *   *Right Click:* Cycle tile shapes (Straight `I` ➔ Corner `L` ➔ Junction `T`).
    *   *Double Click:* Open detailed inspectors.
    *   *Single Tap:* Position player pawns on the grid instantly.
*   **🔊 Synthesized Synth SFX:** Built-in retro audio triggers for slides, rotations, successes, and moves, with a toolbar mute selector.
*   **🎨 Glassmorphic Dark UI:** Modern visual styling featuring clean Google Typography, alert toasts, and step guides.

---

## 🛠️ Technology Stack

*   **Framework:** React 19 + Vite 8
*   **Styling:** Vanilla CSS (custom variables, modern gradients, glassmorphic variables)
*   **Icons:** Lucide React
*   **Linter:** Oxlint (high-speed JavaScript linting)
*   **Performance:** Web Workers API (pure logic offloading)

---

## 📦 File Architecture

```bash
src/
├── components/
│   ├── Board.jsx            # Interactive grid renderer & slide targets
│   ├── ControlPanel.jsx     # Wizard stepper, multiplayer cards, solver logs, & save slots
│   ├── Tile.jsx             # Individual grid tile corridor renderer (exits SVG paths)
│   └── TileEditorModal.jsx  # Detailed floating tile properties manager
├── hooks/
│   ├── useLabyrinthHistory.js # Custom hook for game loop undo/redo checkpoints
│   └── useLabyrinthStorage.js # Custom hook for profile checkpoints & autosave
├── utils/
│   └── audio.js             # Synthesized sound effects (Web Audio API)
├── App.jsx                  # Main interface shell and state coordination
├── solver.js                # Core pure mathematical BFS pathfinder logic
├── solver.worker.js         # background worker wrapping solver computations
└── constants.js             # Fixed anchor coordinates, chevrons, and treasure assets
```

---

## 🎮 Setup & Wizard Workflow

The application guides you through a **6-Step Setup Wizard** to configure the board before unlocking active game mode:

1.  **Step 1: Base Layout** – Align fixed anchor tiles and choose to shuffle movable cells randomly or start with a clear slate.
2.  **Step 2: Paint corridors** – Left-click to rotate exits, right-click to cycle corridor shapes, or double-click to configure individual tiles.
3.  **Step 3: Extra Spare Tile** – Configure the exits and assigned treasure symbol of the spare tile.
4.  **Step 4: Pawns Placement** – Tap a pawn color in the sidebar and click any grid cell to place players.
5.  **Step 5: Hand Cards** – Define target cards for the active player color.
6.  **Step 6: Ready to Play** – Verify your setup and click **Start Game** to lock configuration edits and begin solving.

---

## ⚡ Running Locally

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher recommended)
*   npm or yarn

### 1. Clone the project and navigate to the directory
```bash
cd Labyrinth
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start the development server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser to view the application.

### 4. Build for production
```bash
npm run build
```
Creates a compiled, optimized bundle in the `dist` directory with worker chunks.

### 5. Lint the project
```bash
npm run lint
```
Uses `oxlint` to run high-speed code checks.
