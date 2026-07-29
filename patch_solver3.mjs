import fs from 'fs';

let content = fs.readFileSync('src/solver.js', 'utf-8');

content = content.replace(
  /\/\/ Enqueue states for Turn 2\+\s+if \(maxTurns > 1\) \{/,
  `// Enqueue states for Turn 2+\n      if (maxTurns > 1 && targetTreasure !== "__ALL_EMPTY__") {`
);

fs.writeFileSync('src/solver.js', content);
