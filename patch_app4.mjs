import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const handCards = game\.customTargetCoords\n      \? \[\`coord:\$\{game\.customTargetCoords\.r\},\$\{game\.customTargetCoords\.c\}\`\]\n      : \[\n          \.\.\.\(game\.playerHands\[game\.activePawn\] \|\| \[\]\),\n          \.\.\.\(game\.showEmptyTiles \? \["__ALL_EMPTY__"\] : \[\]\)\n        \];/,
  `const handCards = game.customTargetCoords
      ? [\`coord:\${game.customTargetCoords.r},\${game.customTargetCoords.c}\`]
      : game.showEmptyTiles 
        ? ["__ALL_EMPTY__"]
        : game.playerHands[game.activePawn] || [];`
);

fs.writeFileSync('src/App.tsx', content);
