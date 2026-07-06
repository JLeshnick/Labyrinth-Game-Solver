/**
 * Labyrinth Strategist Solver
 * Contains the pure mathematical and search functions for grid connectivity,
 * board state shifts, BFS reachability, and multi-turn optimization.
 */

// Directions: 0 = North, 1 = East, 2 = South, 3 = West
const DIRECTIONS = {
  NORTH: 0,
  EAST: 1,
  SOUTH: 2,
  WEST: 3
};

const DELTAS = [
  { r: -1, c: 0 }, // 0: North
  { r: 0, c: 1 },  // 1: East
  { r: 1, c: 0 },  // 2: South
  { r: 0, c: -1 }  // 3: West
];

/**
 * Returns the open exits for a given tile type and rotation.
 * @param {string} shape - 'I' (straight), 'L' (corner), 'T' (junction)
 * @param {number} dir - rotation index (0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°)
 * @returns {number[]} array of open directions (0-3)
 */
function getOpenDirections(shape, dir) {
  if (shape === 'I') {
    // Default vertical (connects North & South)
    return [(0 + dir) % 4, (2 + dir) % 4];
  } else if (shape === 'L') {
    // Default corner pointing North-East
    return [(0 + dir) % 4, (1 + dir) % 4];
  } else if (shape === 'T') {
    // Default T-junction pointing Left, Up, Right (West, North, East)
    return [(3 + dir) % 4, (0 + dir) % 4, (1 + dir) % 4];
  }
  return [];
}

/**
 * Checks if a connection exists from cell (r1, c1) to cell (r2, c2).
 */
function areConnected(board, r1, c1, r2, c2) {
  // Bound check
  if (r1 < 0 || r1 >= 7 || c1 < 0 || c1 >= 7 || r2 < 0 || r2 >= 7 || c2 < 0 || c2 >= 7) {
    return false;
  }
  
  const dr = r2 - r1;
  const dc = c2 - c1;
  
  // Adjacency check
  if (Math.abs(dr) + Math.abs(dc) !== 1) {
    return false;
  }
  
  const tileA = board[r1][c1];
  const tileB = board[r2][c2];
  if (!tileA || !tileB) return false;
  
  // Get movement direction from A to B
  let d;
  if (dr === -1 && dc === 0) d = DIRECTIONS.NORTH;
  else if (dr === 0 && dc === 1) d = DIRECTIONS.EAST;
  else if (dr === 1 && dc === 0) d = DIRECTIONS.SOUTH;
  else if (dr === 0 && dc === -1) d = DIRECTIONS.WEST;
  
  const d_opp = (d + 2) % 4; // Opposing direction (from B to A)
  
  const openA = getOpenDirections(tileA.shape, tileA.dir);
  const openB = getOpenDirections(tileB.shape, tileB.dir);
  
  return openA.includes(d) && openB.includes(d_opp);
}

/**
 * Creates a deep clone of the board using fast nested loops.
 */
function cloneBoard(board) {
  const len = board.length;
  const nextBoard = new Array(len);
  for (let r = 0; r < len; r++) {
    const row = board[r];
    const rowLen = row.length;
    const nextRow = new Array(rowLen);
    for (let c = 0; c < rowLen; c++) {
      const tile = row[c];
      nextRow[c] = {
        r: tile.r,
        c: tile.c,
        shape: tile.shape,
        dir: tile.dir,
        treasure: tile.treasure,
        isFixed: tile.isFixed,
        pawns: tile.pawns ? [...tile.pawns] : []
      };
    }
    nextBoard[r] = nextRow;
  }
  return nextBoard;
}

/**
 * Helper to parse arrow ID strings like "row-1-left"
 */
function parseArrowId(arrowId) {
  const parts = arrowId.split('-');
  return {
    type: parts[0],             // "row" or "col"
    index: parseInt(parts[1], 10), // 1, 3, or 5
    dir: parts[2]               // "left", "right", "top", "bottom"
  };
}

/**
 * Verifies if arrowId1 is the exact reverse action of arrowId2.
 */
function isOppositeArrow(arrowId1, arrowId2) {
  if (!arrowId1 || !arrowId2) return false;
  const a1 = parseArrowId(arrowId1);
  const a2 = parseArrowId(arrowId2);
  
  if (a1.type !== a2.type || a1.index !== a2.index) return false;
  
  if (a1.dir === 'left' && a2.dir === 'right') return true;
  if (a1.dir === 'right' && a2.dir === 'left') return true;
  if (a1.dir === 'top' && a2.dir === 'bottom') return true;
  if (a1.dir === 'bottom' && a2.dir === 'top') return true;
  
  return false;
}

/**
 * Executes a maze shift on the board. Modifies board in place.
 * Returns the new spare tile that fell off.
 */
function executeSlideInGrid(board, spareTile, type, index, dir) {
  let fallenTile;
  
  if (type === 'row') {
    const r = index;
    if (dir === 'left') {
      // Shift right: spare inserts at (r,0), pushes out at (r,6)
      fallenTile = { ...board[r][6], pawns: [...(board[r][6].pawns || [])] };
      for (let c = 6; c > 0; c--) {
        board[r][c] = board[r][c - 1];
      }
      board[r][0] = { ...spareTile, pawns: [] };
      if (fallenTile.pawns && fallenTile.pawns.length > 0) {
        board[r][0].pawns.push(...fallenTile.pawns);
      }
    } else {
      // Shift left: spare inserts at (r,6), pushes out at (r,0)
      fallenTile = { ...board[r][0], pawns: [...(board[r][0].pawns || [])] };
      for (let c = 0; c < 6; c++) {
        board[r][c] = board[r][c + 1];
      }
      board[r][6] = { ...spareTile, pawns: [] };
      if (fallenTile.pawns && fallenTile.pawns.length > 0) {
        board[r][6].pawns.push(...fallenTile.pawns);
      }
    }
  } else if (type === 'col') {
    const c = index;
    if (dir === 'top') {
      // Shift down: spare inserts at (0,c), pushes out at (6,c)
      fallenTile = { ...board[6][c], pawns: [...(board[6][c].pawns || [])] };
      for (let r = 6; r > 0; r--) {
        board[r][c] = board[r - 1][c];
      }
      board[0][c] = { ...spareTile, pawns: [] };
      if (fallenTile.pawns && fallenTile.pawns.length > 0) {
        board[0][c].pawns.push(...fallenTile.pawns);
      }
    } else {
      // Shift up: spare inserts at (6,c), pushes out at (0,c)
      fallenTile = { ...board[0][c], pawns: [...(board[0][c].pawns || [])] };
      for (let r = 0; r < 6; r++) {
        board[r][c] = board[r + 1][c];
      }
      board[6][c] = { ...spareTile, pawns: [] };
      if (fallenTile.pawns && fallenTile.pawns.length > 0) {
        board[6][c].pawns.push(...fallenTile.pawns);
      }
    }
  }
  
  // Clone fallen tile to create the new spare, and strip pawns
  const newSpare = {
    ...fallenTile,
    pawns: [],
    isFixed: false
  };
  
  return {
    newSpare: newSpare,
    fallenTile: fallenTile
  };
}

/**
 * Standard BFS to find all reachable cells from a start position.
 */
function getReachableCells(board, sr, sc) {
  const queue = [{ r: sr, c: sc }];
  const visited = new Set();
  visited.add(`${sr},${sc}`);
  const parentMap = {};
  
  let head = 0;
  while (head < queue.length) {
    const curr = queue[head++];
    const r = curr.r;
    const c = curr.c;
    
    for (let d = 0; d < 4; d++) {
      const delta = DELTAS[d];
      const nr = r + delta.r;
      const nc = c + delta.c;
      
      if (nr >= 0 && nr < 7 && nc >= 0 && nc < 7) {
        const key = `${nr},${nc}`;
        if (!visited.has(key)) {
          if (areConnected(board, r, c, nr, nc)) {
            visited.add(key);
            queue.push({ r: nr, c: nc });
            parentMap[key] = { r, c };
          }
        }
      }
    }
  }
  
  return {
    cells: queue,
    parentMap: parentMap
  };
}

/**
 * Reconstructs the grid traversal path.
 */
function reconstructPath(parentMap, target) {
  const path = [];
  let curr = target;
  while (curr) {
    path.push({ r: curr.r, c: curr.c });
    const key = `${curr.r},${curr.c}`;
    curr = parentMap[key];
  }
  return path.reverse();
}

/**
 * Hashes the configurations of all movable tiles plus the spare tile efficiently.
 */
function hashBoard(board, spareTile) {
  const parts = [];
  for (let r = 0; r < 7; r++) {
    for (let c = 0; c < 7; c++) {
      const t = board[r][c];
      if (!t.isFixed) {
        parts.push(t.shape, t.dir, t.treasure || '');
      }
    }
  }
  parts.push('|', spareTile.shape, spareTile.dir, spareTile.treasure || '');
  return parts.join('');
}

/**
 * Searches for paths to the target treasure.
 * Performs a BFS search over the possible board shift options.
 * Returns an array of paths, where each path is a list of steps.
 */
function solveLabyrinth(board, spareTile, startPawnPos, targetTreasure, lastShiftArrowId = null, maxTurns = 3) {
  const solutions = [];
  const queue = [];
  const visited = new Set();
  
  const ARROWS = [
    'row-1-left', 'row-1-right', 'row-3-left', 'row-3-right', 'row-5-left', 'row-5-right',
    'col-1-top', 'col-1-bottom', 'col-3-top', 'col-3-bottom', 'col-5-top', 'col-5-bottom'
  ];
  
  // First Turn Exploration
  for (const arrowId of ARROWS) {
    if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
      continue; // Skip immediate reversal
    }
    
    const { type, index, dir } = parseArrowId(arrowId);
    
    for (let rot = 0; rot < 4; rot++) {
      const nextBoard = cloneBoard(board);
      const rotatedSpare = { ...spareTile, dir: rot };
      
      const slideResult = executeSlideInGrid(nextBoard, rotatedSpare, type, index, dir);
      const nextSpare = slideResult.newSpare;
      
      // Update active pawn coordinate due to slide
      let newPawnPos = { ...startPawnPos };
      if (type === 'row' && index === startPawnPos.r) {
        if (dir === 'left') newPawnPos.c = (startPawnPos.c === 6) ? 0 : startPawnPos.c + 1;
        else newPawnPos.c = (startPawnPos.c === 0) ? 6 : startPawnPos.c - 1;
      } else if (type === 'col' && index === startPawnPos.c) {
        if (dir === 'top') newPawnPos.r = (startPawnPos.r === 6) ? 0 : startPawnPos.r + 1;
        else newPawnPos.r = (startPawnPos.r === 0) ? 6 : startPawnPos.r - 1;
      }
      
      const reach = getReachableCells(nextBoard, newPawnPos.r, newPawnPos.c);
      
      // Verify if target is reachable
      const targetCell = reach.cells.find(cell => nextBoard[cell.r][cell.c].treasure === targetTreasure);
      if (targetCell) {
        solutions.push([
          {
            arrowId: arrowId,
            rotation: rot,
            pawnPath: reconstructPath(reach.parentMap, targetCell),
            startPos: { ...newPawnPos },
            endPos: { r: targetCell.r, c: targetCell.c }
          }
        ]);
      }
      
      // Enqueue states for Turn 2+
      if (maxTurns > 1) {
        const boardHash = hashBoard(nextBoard, nextSpare);
        for (const cell of reach.cells) {
          const stateKey = `${boardHash}|${cell.r},${cell.c}`;
          if (!visited.has(stateKey)) {
            visited.add(stateKey);
            queue.push({
              board: nextBoard,
              spareTile: nextSpare,
              pawnPos: { r: cell.r, c: cell.c },
              path: [
                {
                  arrowId: arrowId,
                  rotation: rot,
                  pawnPath: reconstructPath(reach.parentMap, cell),
                  startPos: { ...newPawnPos },
                  endPos: { r: cell.r, c: cell.c }
                }
              ],
              lastShift: arrowId
            });
          }
        }
      }
    }
  }
  
  // If we already have 1-turn solutions, return them
  if (solutions.length > 0) {
    return solutions;
  }
  
  // Depth-based BFS for multi-turn paths
  let head = 0;
  while (head < queue.length) {
    const currNode = queue[head++];
    const currentTurns = currNode.path.length;
    
    if (currentTurns >= maxTurns) {
      continue;
    }
    
    for (const arrowId of ARROWS) {
      if (isOppositeArrow(arrowId, currNode.lastShift)) {
        continue;
      }
      
      const { type, index, dir } = parseArrowId(arrowId);
      
      for (let rot = 0; rot < 4; rot++) {
        const nextBoard = cloneBoard(currNode.board);
        const rotatedSpare = { ...currNode.spareTile, dir: rot };
        
        const slideResult = executeSlideInGrid(nextBoard, rotatedSpare, type, index, dir);
        const nextSpare = slideResult.newSpare;
        
        // Update active pawn coordinate
        let newPawnPos = { ...currNode.pawnPos };
        if (type === 'row' && index === currNode.pawnPos.r) {
          if (dir === 'left') newPawnPos.c = (currNode.pawnPos.c === 6) ? 0 : currNode.pawnPos.c + 1;
          else newPawnPos.c = (currNode.pawnPos.c === 0) ? 6 : currNode.pawnPos.c - 1;
        } else if (type === 'col' && index === currNode.pawnPos.c) {
          if (dir === 'top') newPawnPos.r = (currNode.pawnPos.r === 6) ? 0 : currNode.pawnPos.r + 1;
          else newPawnPos.r = (currNode.pawnPos.r === 0) ? 6 : currNode.pawnPos.r - 1;
        }
        
        const reach = getReachableCells(nextBoard, newPawnPos.r, newPawnPos.c);
        
        const targetCell = reach.cells.find(cell => nextBoard[cell.r][cell.c].treasure === targetTreasure);
        if (targetCell) {
          const pathSteps = [
            ...currNode.path,
            {
              arrowId: arrowId,
              rotation: rot,
              pawnPath: reconstructPath(reach.parentMap, targetCell),
              startPos: { ...newPawnPos },
              endPos: { r: targetCell.r, c: targetCell.c }
            }
          ];
          solutions.push(pathSteps);
        }
        
        // Continue queueing if we are below maxTurns - 1
        if (currentTurns + 1 < maxTurns) {
          const boardHash = hashBoard(nextBoard, nextSpare);
          for (const cell of reach.cells) {
            const stateKey = `${boardHash}|${cell.r},${cell.c}`;
            if (!visited.has(stateKey)) {
              visited.add(stateKey);
              queue.push({
                board: nextBoard,
                spareTile: nextSpare,
                pawnPos: { r: cell.r, c: cell.c },
                path: [
                  ...currNode.path,
                  {
                    arrowId: arrowId,
                    rotation: rot,
                    pawnPath: reconstructPath(reach.parentMap, cell),
                    startPos: { ...newPawnPos },
                    endPos: { r: cell.r, c: cell.c }
                  }
                ],
                lastShift: arrowId
              });
            }
          }
        }
      }
    }
    
    // Stop early once we finish exploring the current shortest turn-depth level that has solutions
    if (solutions.length > 0 && queue[head] && queue[head].path.length > currentTurns) {
      break;
    }
  }
  
  return solutions;
}

/**
 * Calculates a fallback recommendation when no path to the target is found.
 * Ranks moves by:
 * 1. Physical proximity to target tile (if target exists on board)
 * 2. Number of reachable tiles (freedom of movement)
 */
function getFallbackSuggestions(board, spareTile, startPawnPos, targetTreasure, lastShiftArrowId = null) {
  const suggestions = [];
  const ARROWS = [
    'row-1-left', 'row-1-right', 'row-3-left', 'row-3-right', 'row-5-left', 'row-5-right',
    'col-1-top', 'col-1-bottom', 'col-3-top', 'col-3-bottom', 'col-5-top', 'col-5-bottom'
  ];

  for (const arrowId of ARROWS) {
    if (lastShiftArrowId && isOppositeArrow(arrowId, lastShiftArrowId)) {
      continue;
    }
    
    const { type, index, dir } = parseArrowId(arrowId);
    
    for (let rot = 0; rot < 4; rot++) {
      const nextBoard = cloneBoard(board);
      const rotatedSpare = { ...spareTile, dir: rot };
      
      executeSlideInGrid(nextBoard, rotatedSpare, type, index, dir);
      
      // Find current pawn position after slide
      let newPawnPos = { ...startPawnPos };
      if (type === 'row' && index === startPawnPos.r) {
        if (dir === 'left') newPawnPos.c = (startPawnPos.c === 6) ? 0 : startPawnPos.c + 1;
        else newPawnPos.c = (startPawnPos.c === 0) ? 6 : startPawnPos.c - 1;
      } else if (type === 'col' && index === startPawnPos.c) {
        if (dir === 'top') newPawnPos.r = (startPawnPos.r === 6) ? 0 : startPawnPos.r + 1;
        else newPawnPos.r = (startPawnPos.r === 0) ? 6 : startPawnPos.r - 1;
      }
      
      const reach = getReachableCells(nextBoard, newPawnPos.r, newPawnPos.c);
      
      // Locate target treasure on the new board
      let targetPos = null;
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (nextBoard[r][c].treasure === targetTreasure) {
            targetPos = { r, c };
            break;
          }
        }
      }
      
      // Calculate min distance from any reachable cell to target
      let minDistance = 999;
      let closestPawnPos = null;
      let closestPawnPath = [];
      
      if (targetPos) {
        for (const cell of reach.cells) {
          const dist = Math.abs(cell.r - targetPos.r) + Math.abs(cell.c - targetPos.c);
          if (dist < minDistance) {
            minDistance = dist;
            closestPawnPos = cell;
          }
        }
        if (closestPawnPos) {
          closestPawnPath = reconstructPath(reach.parentMap, closestPawnPos);
        }
      } else {
        // Target is not on board (must be on the spare tile)
        minDistance = 999; // Set distance high
        closestPawnPos = newPawnPos;
        closestPawnPath = [newPawnPos];
      }
      
      suggestions.push({
        arrowId: arrowId,
        rotation: rot,
        pawnPath: closestPawnPath,
        startPos: { ...newPawnPos },
        endPos: closestPawnPos || newPawnPos,
        minDistance: minDistance,
        reachableCount: reach.cells.length
      });
    }
  }
  
  // Sort suggestions: closest distance first, then most reachable cells as a tie breaker
  suggestions.sort((a, b) => {
    if (a.minDistance !== b.minDistance) {
      return a.minDistance - b.minDistance;
    }
    return b.reachableCount - a.reachableCount;
  });
  
  return suggestions.slice(0, 5).map(s => [
    {
      arrowId: s.arrowId,
      rotation: s.rotation,
      pawnPath: s.pawnPath,
      startPos: s.startPos,
      endPos: s.endPos,
      isFallback: true,
      minDistance: s.minDistance,
      reachableCount: s.reachableCount
    }
  ]);
}

const TREASURE_NAMES = {
  book: "Book with Clasp",
  coins: "Bag of Gold Coins",
  map: "Treasure Map",
  crown: "Gold Crown",
  keys: "Set of Keys",
  skull: "Skull",
  ring: "Gold Ring",
  chest: "Treasure Chest",
  emerald: "Jewel",
  sword: "Sword",
  menorah: "Gold Menorah",
  helmet: "Helmet (armor)",
  lizard: "Lizard",
  moth: "Moth",
  owl: "Owl",
  scarab: "Scarab",
  rat: "Rat",
  spider: "Spider on Web",
  bat: "Bat",
  dragon: "Dragon",
  ghost_bottle: "Ghost (in bottle)",
  ghost_waving: "Ghost (waving)",
  lady_pig: "Lady Pig",
  sorceress: "Sorceress",
  custom_target: "Custom Target"
};

function generateActionExplanation(board, spareTile, path) {
  if (path.length === 0) return { slide: "", walk: "", safety: "" };
  const step1 = path[0];
  const { type, index, dir } = parseArrowId(step1.arrowId);
  const targetId = path.cardId;
  const targetName = TREASURE_NAMES[targetId] || "Target";
  
  const insertFrom = dir === 'left' ? 'Left' : dir === 'right' ? 'Right' : dir === 'top' ? 'Top' : 'Bottom';
  const label = type === 'row' ? `Row ${index + 1}` : `Column ${index + 1}`;
  const rotDegrees = step1.rotation * 90;
  
  const slideDesc = `Rotate spare to ${rotDegrees}° and slide into ${insertFrom} of ${label}`;
  
  let walkDesc = "";
  if (path.isFallback) {
    const endPos = step1.endPos;
    const finalDist = path[path.length - 1].minDistance;
    walkDesc = `Walks to (${endPos.r}, ${endPos.c}) getting you within ${finalDist} spaces of ${targetName}`;
  } else {
    if (path.length === 1) {
      walkDesc = `Walks ${step1.pawnPath.length - 1} spaces to land directly on ${targetName}!`;
    } else {
      walkDesc = `Prepares a route that reaches ${targetName} in ${path.length} turns`;
    }
  }

  // Safety explanation
  const safety = path.safetyScore;
  let safetyDesc = `${safety}% (`;
  if (safety >= 75) {
    safetyDesc += "Highly secure, ";
  } else if (safety >= 45) {
    safetyDesc += "Moderate safety, ";
  } else {
    safetyDesc += "Vulnerable, ";
  }

  const isFixed = step1.endPos.r % 2 === 0 && step1.endPos.c % 2 === 0;
  if (isFixed) {
    safetyDesc += "lands on a fixed tile immune to shifts)";
  } else {
    safetyDesc += "lands on a movable tile)";
  }

  return {
    slide: slideDesc,
    walk: walkDesc,
    safety: safetyDesc
  };
}

function calculateSafetyScore(board, spareTile, pawnPos, playerShiftArrowId = null) {
  const ARROWS = [
    'row-1-left', 'row-1-right', 'row-3-left', 'row-3-right', 'row-5-left', 'row-5-right',
    'col-1-top', 'col-1-bottom', 'col-3-top', 'col-3-bottom', 'col-5-top', 'col-5-bottom'
  ];
  
  let totalReachable = 0;
  let count = 0;
  let wrapsCount = 0;
  
  for (const arrowId of ARROWS) {
    if (playerShiftArrowId && isOppositeArrow(arrowId, playerShiftArrowId)) {
      continue; // Opponent cannot reverse the player's shift immediately
    }
    
    const { type, index, dir } = parseArrowId(arrowId);
    for (let rot = 0; rot < 4; rot++) {
      const nextBoard = cloneBoard(board);
      const rotatedSpare = { ...spareTile, dir: rot };
      
      executeSlideInGrid(nextBoard, rotatedSpare, type, index, dir);

      let newPawnPos = { ...pawnPos };
      let wrapped = false;
      if (type === 'row' && index === pawnPos.r) {
        if (dir === 'left') {
          if (pawnPos.c === 6) wrapped = true;
          newPawnPos.c = (pawnPos.c === 6) ? 0 : pawnPos.c + 1;
        } else {
          if (pawnPos.c === 0) wrapped = true;
          newPawnPos.c = (pawnPos.c === 0) ? 6 : pawnPos.c - 1;
        }
      } else if (type === 'col' && index === pawnPos.c) {
        if (dir === 'top') {
          if (pawnPos.r === 6) wrapped = true;
          newPawnPos.r = (pawnPos.r === 6) ? 0 : pawnPos.r + 1;
        } else {
          if (pawnPos.r === 0) wrapped = true;
          newPawnPos.r = (pawnPos.r === 0) ? 6 : pawnPos.r - 1;
        }
      }
      
      if (wrapped) {
        wrapsCount++;
      }
      
      const reach = getReachableCells(nextBoard, newPawnPos.r, newPawnPos.c);
      totalReachable += reach.cells.length;
      count++;
    }
  }
  
  const average = totalReachable / count;
  // Heuristic 1: Reachability size (up to 70 points)
  let score = Math.min(70, Math.round((average / 15) * 70));
  
  // Heuristic 2: Fixed space bonus (up to 15 points)
  const isFixedSpace = pawnPos.r % 2 === 0 && pawnPos.c % 2 === 0;
  if (isFixedSpace) {
    score += 15;
  }
  
  // Heuristic 3: Exits of the landing tile (up to 15 points)
  const landingTile = board[pawnPos.r]?.[pawnPos.c];
  if (landingTile) {
    let exits = 2;
    if (landingTile.shape === 'T') exits = 3;
    else if (landingTile.shape === 'I' || landingTile.shape === 'L') exits = 2;
    score += (exits === 3) ? 15 : 10;
  }
  
  // Heuristic 4: Wrap penalty (if opponent slides often push us off)
  const wrapRate = wrapsCount / count;
  score -= Math.round(wrapRate * 10);
  
  return Math.max(0, Math.min(100, score));
}

function solveAllHand(board, spareTile, startPawnPos, handCards, lastShiftArrowId = null, maxTurns = 3) {
  let allPaths = [];
  
  if (!handCards || handCards.length === 0) {
    return [];
  }
  
  for (const cardId of handCards) {
    let paths = solveLabyrinth(board, spareTile, startPawnPos, cardId, lastShiftArrowId, maxTurns);
    let isFallback = false;
    
    if (paths.length === 0) {
      paths = getFallbackSuggestions(board, spareTile, startPawnPos, cardId, lastShiftArrowId);
      isFallback = true;
    }
    
    for (const path of paths) {
      if (path.length > 0) {
        const step1 = path[0];
        const { type, index, dir } = parseArrowId(step1.arrowId);
        
        const tempBoard = cloneBoard(board);
        const tempSpare = { ...spareTile, dir: step1.rotation };
        
        const slideResult = executeSlideInGrid(tempBoard, tempSpare, type, index, dir);
        const nextSpare = slideResult.newSpare;
        
        const safety = calculateSafetyScore(tempBoard, nextSpare, step1.endPos, step1.arrowId);
        
        path.safetyScore = safety;
        path.cardId = cardId;
        path.isFallback = isFallback;
      }
    }
    
    allPaths.push(...paths);
  }
  
  // Sort aggregated solutions across all hand cards
  allPaths.sort((a, b) => {
    if (a.isFallback !== b.isFallback) {
      return a.isFallback ? 1 : -1;
    }
    
    if (a.length !== b.length) {
      return a.length - b.length;
    }
    
    if (a.isFallback && b.isFallback) {
      const aDist = a[a.length - 1].minDistance;
      const bDist = b[b.length - 1].minDistance;
      if (aDist !== bDist) {
        return aDist - bDist;
      }
    }
    
    return b.safetyScore - a.safetyScore;
  });
  
  // Deduplicate sorted suggestions by keeping only the best suggestion for each unique first-turn action (arrowId, rotation)
  const uniquePaths = [];
  const seenAction = new Set();
  for (const path of allPaths) {
    if (path.length > 0) {
      const step1 = path[0];
      const actionKey = `${step1.arrowId}-${step1.rotation}`;
      if (!seenAction.has(actionKey)) {
        seenAction.add(actionKey);
        uniquePaths.push(path);
      }
    }
  }
  
  // Generate natural language explanations for top suggestions
  for (const path of uniquePaths) {
    if (path.length > 0) {
      path.explanation = generateActionExplanation(board, spareTile, path);
    }
  }
  
  return uniquePaths;
}

export { 
  cloneBoard, 
  parseArrowId, 
  isOppositeArrow, 
  executeSlideInGrid,
  solveAllHand,
  getReachableCells,
  areConnected,
  DIRECTIONS,
  DELTAS,
  hashBoard,
  getOpenDirections
};
