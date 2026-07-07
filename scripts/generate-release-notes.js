import { execSync } from 'child_process';
import fs from 'fs';

function getPreviousTag() {
  try {
    // Finds the closest tag before HEAD
    const tag = execSync('git describe --tags --abbrev=0 HEAD^', { encoding: 'utf8' }).trim();
    return tag;
  } catch (err) {
    console.log('No previous tag found:', err.message);
    return null;
  }
}

function getCommitLogs(prevTag) {
  try {
    const range = prevTag ? `${prevTag}..HEAD` : 'HEAD~10..HEAD'; // Fallback to last 10 commits if no previous tag
    const logOutput = execSync(`git log ${range} --pretty=format:"%s%n%b%n---COMMIT---"`, { encoding: 'utf8' });
    
    const rawCommits = logOutput
      .split('---COMMIT---')
      .map(c => c.trim())
      .filter(Boolean);
      
    return rawCommits.map(c => {
      const lines = c.split('\n');
      const subject = lines[0];
      const body = lines.slice(1).join('\n');
      return { subject, body };
    });
  } catch (err) {
    console.error('Error getting commit logs:', err.message);
    return [];
  }
}

function generateReleaseNotes() {
  const prevTag = getPreviousTag();
  const commits = getCommitLogs(prevTag);
  
  const features = [];
  const fixes = [];
  const perf = [];
  const maintenance = [];
  const breaking = [];
  
  commits.forEach(({ subject, body }) => {
    // Skip version bump commits to keep release notes clean
    if (subject.startsWith('chore: bump version to')) {
      return;
    }

    const isBreaking = subject.includes('!') || body.includes('BREAKING CHANGE');
    
    const formattedCommit = `- ${subject}`;
    
    if (isBreaking) {
      breaking.push(formattedCommit);
    } else if (subject.match(/^feat(\(.*\))?:/i)) {
      features.push(formattedCommit);
    } else if (subject.match(/^fix(\(.*\))?:/i)) {
      fixes.push(formattedCommit);
    } else if (subject.match(/^perf(\(.*\))?:/i)) {
      perf.push(formattedCommit);
    } else {
      // Group chores, refactors, docs, etc. under maintenance
      maintenance.push(formattedCommit);
    }
  });
  
  let md = '';
  
  // Title / Tag
  const currentTag = process.env.GITHUB_REF_NAME || 'v1.0.8';
  md += `# Labyrinth Game Solver ${currentTag}\n\n`;
  
  md += `## 🚀 What's New\n\n`;
  
  let hasUpdates = false;
  
  if (breaking.length > 0) {
    md += `### ⚠️ Breaking Changes\n`;
    breaking.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (features.length > 0) {
    md += `### ✨ New Features\n`;
    features.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (fixes.length > 0) {
    md += `### 🐛 Bug Fixes\n`;
    fixes.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (perf.length > 0) {
    md += `### ⚡ Performance Improvements\n`;
    perf.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (maintenance.length > 0) {
    md += `### ⚙️ Maintenance & Tooling\n`;
    maintenance.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (!hasUpdates) {
    md += `- Initial release reference and automated packaging setup.\n\n`;
  }
  
  md += `---\n\n`;
  
  // App Description
  md += `## ℹ️ About Labyrinth Game Solver\n\n`;
  md += `**Labyrinth Game Solver** is a cross-platform desktop application designed to solve configurations of the classic board game **Ravensburger Labyrinth**. The application helps users design board layouts, set up player pawns and target cards, and utilizes an optimized Breadth-First Search (BFS) solver to compute the shortest path of moves (tile shifts and pawn steps) required to collect target cards.\n\n`;
  
  md += `### 🌟 Key Features\n`;
  md += `- **Intuitive Drag-and-Drop Editor**: Build board configurations easily. Drag movable tiles from a side panel, drop them on the grid, and click to rotate. The app enforces strict game board setup constraints (12 movable corner tiles, 12 movable straight tiles, 9 movable T-junction tiles, and exactly 1 spare tile).\n`;
  md += `- **Accurate Official Board Game Layouts**: Swapped diagonal corner colors to exactly match the board game: **Red (Top-Left)** is diagonal to **Blue (Bottom-Right)**, and **Yellow (Top-Right)** is diagonal to **Green (Bottom-Left)**. Fixed tiles are locked, and exact board treasures are displayed.\n`;
  md += `- **Multi-Threaded BFS Solver**: Computes path combinations on a separate background Web Worker (\`solver.worker.js\`), keeping the Electron UI fluid and responsive even during complex, high-depth searches.\n`;
  md += `- **Interactive Path Overlays**: Shows visual indicators on the 7x7 board for reachable cells, invalid shift arrow moves (restricting immediate opposite slidebacks), and overlays the gold path of the suggested move.\n`;
  md += `- **Retro Synthesized Sounds**: Retro sound effects built natively using Web Audio API oscillators to provide feedback on tile rotation, grid sliding, pawn hops, and successful target card capture.\n`;
  md += `- **Timeline History & Persistence**: Support for complete Undo/Redo history states and automatic local storage synchronization to seamlessly resume setup or gameplay sessions.\n\n`;
  
  md += `### 📦 Installation\n`;
  md += `- **macOS**: Download \`Labyrinth-Game-Solver-<version>-arm64.dmg\`, open it, and drag the app to your Applications folder.\n`;
  md += `- **Windows**: Run the \`Labyrinth-Game-Solver Setup <version>.exe\` installer.\n\n`;
  md += `*Note: The desktop app includes automatic background updates on startup using electron-updater. Please keep the update metadata files (.yml and .blockmap) uploaded to ensure auto-update continues to work smoothly.*`;
  
  fs.writeFileSync('release_notes.md', md);
  console.log('Successfully generated release_notes.md');
}

generateReleaseNotes();
