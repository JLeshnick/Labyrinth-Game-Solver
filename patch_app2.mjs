import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

content = content.replace(
  /const handCards = game\.customTargetCoords\s+\?\s+\[\`coord:\$\{game\.customTargetCoords\.r\},\$\{game\.customTargetCoords\.c\}\`\]\s+:\s+game\.showEmptyTiles\s+\?\s+\["__ALL_EMPTY__"\]\s+:\s+game\.playerHands\[game\.activePawn\] \|\| \[\];/,
  `const handCards = game.customTargetCoords
      ? [\`coord:\${game.customTargetCoords.r},\${game.customTargetCoords.c}\`]
      : [
          ...(game.playerHands[game.activePawn] || []),
          ...(game.showEmptyTiles ? ["__ALL_EMPTY__"] : [])
        ];`
);

fs.writeFileSync('src/App.tsx', content);
