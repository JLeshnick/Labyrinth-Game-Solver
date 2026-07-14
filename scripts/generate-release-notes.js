import { execSync, execFileSync } from 'child_process';
import fs from 'fs';

async function getLatestGoodRelease() {
  const repo = 'JLeshnick/Labyrinth-Game-Solver';
  const url = `https://api.github.com/repos/${repo}/releases`;
  
  console.log(`[Release Notes] Fetching releases from GitHub API: ${url}`);
  try {
    const headers = {
      'User-Agent': 'release-notes-generator'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const response = await fetch(url, { headers });
    if (response.ok) {
      const releases = await response.json();
      // Resolve the current version tag to exclude it and perform version rollups
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const currentTag = process.env.TARGET_TAG || `v${pkg.version}`;
      
      // Find the latest release that was successfully published and is not a fallback/empty release
      const latestGoodRelease = releases.find(r => {
        console.log(`[Debug] Checking tag: ${r.tag_name} against currentTag: ${currentTag}`);
        
        // Exclude the current version being built (prevents race condition between runners)
        if (r.tag_name === currentTag) {
          console.log(`[Debug] Skipping ${r.tag_name} because it matches currentTag`);
          return false;
        }
        
        // If building a v2.0.x release, roll up all commits since the last v1 release (v1.2.0)
        // by excluding other v2.0.x tags from being baselines
        if (currentTag.startsWith('v2.0.') && r.tag_name.startsWith('v2.0.')) {
          console.log(`[Debug] Skipping ${r.tag_name} because both start with v2.0.`);
          return false;
        }
        
        const isValid = !r.draft && !r.prerelease && r.body && !r.body.includes('Initial release reference');
        console.log(`[Debug] isValid for ${r.tag_name}: ${isValid}`);
        return isValid;
      });
      if (latestGoodRelease) {
        console.log(`[Release Notes] Found latest successfully published release tag on GitHub: ${latestGoodRelease.tag_name} (published at ${latestGoodRelease.published_at})`);
        return latestGoodRelease;
      }
    }
  } catch (err) {
    console.log('[Release Notes] Failed to fetch releases from GitHub API:', err.message);
  }
  return null;
}

async function getLatestMergedPR() {
  const repo = 'JLeshnick/Labyrinth-Game-Solver';
  const url = `https://api.github.com/repos/${repo}/pulls?state=closed&base=main&sort=updated&direction=desc&per_page=10`;
  
  console.log(`[Release Notes] Fetching closed pulls from GitHub API: ${url}`);
  try {
    const headers = {
      'User-Agent': 'release-notes-generator'
    };
    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const response = await fetch(url, { headers });
    if (response.ok) {
      const prs = await response.json();
      const latestMerged = prs.find(p => p.merged_at !== null);
      if (latestMerged) {
        console.log(`[Release Notes] Found latest merged PR: #${latestMerged.number} - ${latestMerged.title} (merged at ${latestMerged.merged_at})`);
        return latestMerged;
      }
    }
  } catch (err) {
    console.log('[Release Notes] Failed to fetch PRs from GitHub API:', err.message);
  }
  return null;
}

function getCommitLogs(prevTag) {
  try {
    const range = prevTag ? `${prevTag}..HEAD` : 'HEAD~10..HEAD'; // Fallback to last 10 commits if no previous tag
    console.log(`[Release Notes] Fetching commit logs for range: ${range}`);
    const logOutput = execFileSync('git', ['log', range, '--pretty=format:%s%n%b%n---COMMIT---'], { encoding: 'utf8' });
    
    const rawCommits = logOutput
      .split('---COMMIT---')
      .map(c => c.trim())
      .filter(Boolean);
      
    console.log(`[Release Notes] Raw git log returned ${rawCommits.length} commits.`);
    return rawCommits.map(c => {
      const lines = c.split('\n');
      const subject = lines[0];
      const body = lines.slice(1).join('\n');
      return { subject, body };
    });
  } catch (err) {
    console.error('[Release Notes] Error getting commit logs:', err.message);
    return [];
  }
}

async function generateReleaseNotes() {
  const latestGoodRelease = await getLatestGoodRelease();
  const latestMergedPR = await getLatestMergedPR();
  
  // Resolve previous tag for git log commit diffing
  let prevTag = null;
  if (latestGoodRelease) {
    prevTag = latestGoodRelease.tag_name;
  } else {
    try {
      console.log('[Release Notes] No good release in API, running git describe to find baseline tag...');
      prevTag = execFileSync('git', ['describe', '--tags', '--abbrev=0', 'HEAD^'], { encoding: 'utf8' }).trim();
    } catch (err) {
      console.log('[Release Notes] git describe failed:', err.message);
    }
  }
  
  console.log(`[Release Notes] Git commit diff baseline tag: ${prevTag}`);
  const commits = getCommitLogs(prevTag);
  
  const features = [];
  const fixes = [];
  const perf = [];
  const maintenance = [];
  const breaking = [];
  
  commits.forEach(({ subject, body }) => {
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
      maintenance.push(formattedCommit);
    }
  });
  
  let md = '';
  
  // Title / Tag
  let currentTag = process.env.TARGET_TAG || '';
  if (!currentTag || currentTag === 'main' || currentTag === 'master') {
    try {
      const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      currentTag = `v${pkg.version}`;
    } catch {
      currentTag = 'Release';
    }
  }
  md += `# Labyrinth Game Solver ${currentTag}\n\n`;
  
  md += `## 🚀 What's New\n\n`;
  
  let hasEmbedPR = false;
  if (latestMergedPR) {
    // If there is no previous good release, or if the PR was merged AFTER the last successful release
    const isNewPR = !latestGoodRelease || (new Date(latestMergedPR.merged_at) > new Date(latestGoodRelease.published_at));
    if (isNewPR) {
      console.log(`[Release Notes] Prepending description from PR #${latestMergedPR.number}`);
      md += `### 📝 Release Details (from PR #${latestMergedPR.number}: ${latestMergedPR.title})\n\n`;
      if (latestMergedPR.body) {
        md += `${latestMergedPR.body}\n\n`;
      } else {
        md += `*No description provided in PR #${latestMergedPR.number}.*\n\n`;
      }
      md += `---\n\n`;
      hasEmbedPR = true;
    }
  }
  
  // Append detailed changelog of individual commits
  md += `### 🔍 Detailed Changelog\n\n`;
  let hasUpdates = false;
  
  if (breaking.length > 0) {
    md += `#### ⚠️ Breaking Changes\n`;
    breaking.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (features.length > 0) {
    md += `#### ✨ New Features\n`;
    features.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (fixes.length > 0) {
    md += `#### 🐛 Bug Fixes\n`;
    fixes.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (perf.length > 0) {
    md += `#### ⚡ Performance Improvements\n`;
    perf.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (maintenance.length > 0) {
    md += `#### ⚙️ Maintenance & Tooling\n`;
    maintenance.forEach(c => md += `${c}\n`);
    md += `\n`;
    hasUpdates = true;
  }
  
  if (!hasUpdates && !hasEmbedPR) {
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
  console.log('[Release Notes] Successfully generated release_notes.md');
}

generateReleaseNotes().catch(err => {
  console.error('Error generating release notes:', err);
  process.exit(1);
});
