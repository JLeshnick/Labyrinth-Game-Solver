import fs from 'fs';

let content = fs.readFileSync('src/solver.js', 'utf-8');

// Modify the search logic for targetPos
content = content.replace(
  /for \(let r = 0; r < 7; r\+\+\) {\s+for \(let c = 0; c < 7; c\+\+\) {\s+if \(nextBoard\[r\]\[c\]\.treasure === targetTreasure\) {\s+targetPos = { r, c };\s+break;\s+}\s+}\s+}/,
  `if (targetTreasure && targetTreasure.startsWith("coord:")) {
        const [r, c] = targetTreasure.substring(6).split(",").map(Number);
        targetPos = { r, c };
      } else {
        for (let r = 0; r < 7; r++) {
          for (let c = 0; c < 7; c++) {
            if (nextBoard[r][c].treasure === targetTreasure) {
              targetPos = { r, c };
              break;
            }
          }
        }
      }`
);

// Modify the search logic for targetCell
content = content.replace(
  /const targetCell = reach\.cells\.find\(cell => {\s+return nextBoard\[cell\.r\]\[cell\.c\]\.treasure === targetTreasure;\s+}\);/,
  `const targetCell = reach.cells.find(cell => {
          if (targetTreasure && targetTreasure.startsWith("coord:")) {
            const [r, c] = targetTreasure.substring(6).split(",").map(Number);
            return cell.r === r && cell.c === c;
          }
          return nextBoard[cell.r][cell.c].treasure === targetTreasure;
        });`
);

// We also need to add logic for __ALL_EMPTY__ in First Turn Exploration
content = content.replace(
  /if \(targetCell\) {\s+solutions\.push\(\[\s+{\s+arrowId: arrowId,\s+rotation: rot,\s+pawnPath: reconstructPath\(reach\.parentMap, targetCell\),\s+startPos: { \.\.\.newPawnPos },\s+endPos: { r: targetCell\.r, c: targetCell\.c }\s+}\s+\]\);\s+}/,
  `if (targetTreasure === "__ALL_EMPTY__") {
        for (const cell of reach.cells) {
          if (!nextBoard[cell.r][cell.c].treasure) {
            solutions.push([
              {
                arrowId: arrowId,
                rotation: rot,
                pawnPath: reconstructPath(reach.parentMap, cell),
                startPos: { ...newPawnPos },
                endPos: { r: cell.r, c: cell.c }
              }
            ]);
          }
        }
      } else if (targetCell) {
        solutions.push([
          {
            arrowId: arrowId,
            rotation: rot,
            pawnPath: reconstructPath(reach.parentMap, targetCell),
            startPos: { ...newPawnPos },
            endPos: { r: targetCell.r, c: targetCell.c }
          }
        ]);
      }`
);

fs.writeFileSync('src/solver.js', content);
