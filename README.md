# Labyrinth Game Solver (Web Edition)

Labyrinth Game Solver is a web application designed to solve configurations of the classic board game **Ravensburger Labyrinth**. The application helps users design board layouts, set up player pawns and target cards, and utilizes an optimized Breadth-First Search (BFS) solver to compute the shortest path of moves (tile shifts and pawn steps) required to collect target cards.

It runs directly in any modern mobile or desktop web browser and is hosted for free on **GitHub Pages**, built using **Vite**, **React**, **TypeScript**, and **Tailwind CSS v4**.

---

## 📱 Mobile-First & Web Features

1. **iPhone / iOS Home Screen PWA**: Configured with Apple Web App meta tags and viewport constraints to disable browser double-tap zoom bouncing. Use **"Add to Home Screen"** in Safari to run it full-screen just like a native mobile app.
2. **Sticky Mobile Action Bar**: Controls like **Undo**, **Redo**, **Rotate Board Perspective**, **Stats**, and **Audio** are placed in a thumb-friendly bottom toolbar on mobile viewports.
3. **Intuitive Tab Editor & Drag-and-Drop**: Build configurations easily on touch screens. Drag movable tiles onto the grid or tap them to rotate. The app enforces official setup limits (12 movable corners, 12 straight corridors, 9 T-junctions, and exactly 1 spare tile).
4. **Official Board Rules**:
   - Spawns match exact game rules: **Red (Top-Left)** is diagonal to **Blue (Bottom-Right)**, and **Yellow (Top-Right)** diagonal to **Green (Bottom-Left)**.
   - Core treasures labeled textually (e.g., "Foot Ghost", "Lady Pig", "Gold Menorah").
5. **Multi-Threaded BFS Solver**: Path search searches are handed off to a background thread Web Worker (`solver.worker.js`), keeping the browser UI fully responsive.
6. **Timeline History & LocalStorage Sync**: Full Undo/Redo support. All saves, auto-saves, and layouts are synced directly to your browser's client-side `LocalStorage` database (runs serverless).
7. **Synthesized Retro Audio**: Retro sound effects built natively using the browser's Web Audio API (oscillators) for game actions.

---

## 🎮 How to Play / Run Online

Simply open the live URL on your desktop browser or mobile phone:
👉 **[https://jleshnick.github.io/Labyrinth-Game-Solver/](https://jleshnick.github.io/Labyrinth-Game-Solver/)**

### 📲 Save as an iOS App:
1. Load the link above in **Safari** on your iPhone.
2. Tap the **Share** button in Safari's bottom toolbar.
3. Scroll down and choose **Add to Home Screen**.
4. Launch it from your home screen to enjoy the full-screen standalone experience!

---

## 🛠️ Developer Setup (Running from Source)

### Prerequisites
You need [Node.js](https://nodejs.org/) (v20 or newer) and [Git](https://git-scm.com/) installed on your computer.

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/JLeshnick/Labyrinth-Game-Solver.git
   cd Labyrinth-Game-Solver
   ```
2. Install package dependencies:
   ```bash
   npm install
   ```

---

## Developer Commands

### 1. Run Development Server
Launches the local Vite hot-reloading dev server:
```bash
npm run dev
```
Open **`http://localhost:3000`** in your browser.

### 2. Compile Web Application
Compiles production assets and outputs them to the `dist/` directory:
```bash
npm run build
```

### 3. Run Tests & Lint
```bash
npm run test        # Runs Vitest unit tests
npm run typecheck   # Typechecks the TypeScript source
npm run lint        # Lints files using oxlint
```

---

## Directory Structure

```
src/
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
│   ├── useLabyrinthHistory.ts  # Timeline undo/redo snapshot stack
│   └── useLabyrinthStorage.ts  # Browser LocalStorage persistence
└── utils/                  # Utility functions
    └── audio.ts            # Web Audio API retro oscillator sound effects
```

---

## License

[MIT](LICENSE)
