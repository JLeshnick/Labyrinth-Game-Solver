import fs from 'fs';

let content = fs.readFileSync('src/solver.js', 'utf-8');

// Modify targetCell in Turn 2+ loop
content = content.replace(
  /const targetCell = reach\.cells\.find\(cell => {\s+if \(targetTreasure && targetTreasure\.startsWith\("home_"\)\) {\s+const color = targetTreasure\.substring\(5\);\s+const home = HOME_POSITIONS\[color\];\s+return home && cell\.r === home\.r && cell\.c === home\.c;\s+}\s+return nextBoard\[cell\.r\]\[cell\.c\]\.treasure === targetTreasure;\s+}\);/,
  `const targetCell = reach.cells.find(cell => {
          if (targetTreasure && targetTreasure.startsWith("home_")) {
            const color = targetTreasure.substring(5);
            const home = HOME_POSITIONS[color];
            return home && cell.r === home.r && cell.c === home.c;
          }
          if (targetTreasure && targetTreasure.startsWith("coord:")) {
            const [r, c] = targetTreasure.substring(6).split(",").map(Number);
            return cell.r === r && cell.c === c;
          }
          return nextBoard[cell.r][cell.c].treasure === targetTreasure;
        });`
);

fs.writeFileSync('src/solver.js', content);
