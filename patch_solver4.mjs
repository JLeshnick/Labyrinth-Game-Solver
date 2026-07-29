import fs from 'fs';

let content = fs.readFileSync('src/solver.js', 'utf-8');

content = content.replace(
  /let targetName = "Target";\s+if \(targetId && targetId\.startsWith\("home_"\)\) \{/,
  `let targetName = "Target";
  if (targetId === "__ALL_EMPTY__") {
    targetName = \`empty cell (\${path[path.length - 1].endPos.r}, \${path[path.length - 1].endPos.c})\`;
  } else if (targetId && targetId.startsWith("coord:")) {
    const [r, c] = targetId.substring(6).split(",");
    targetName = \`cell (\${r}, \${c})\`;
  } else if (targetId && targetId.startsWith("home_")) {`
);

fs.writeFileSync('src/solver.js', content);
