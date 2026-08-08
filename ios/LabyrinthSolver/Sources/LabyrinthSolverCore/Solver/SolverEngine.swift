import Foundation

// MARK: - Solver Engine

/// Pure, value-type solver for the Labyrinth board game.
/// Handles tile connectivity, BFS reachability, slide simulation, and best-move search.
public struct SolverEngine {

    // MARK: - Tile Openings

    /// Returns which sides of a tile are open given its shape and rotation.
    /// Array order: [top, right, bottom, left]
    /// Base orientations (deg0):
    ///   straight:   [top, -, bottom, -]       → corridor runs N-S
    ///   corner:     [top, right, -, -]         → corridor opens to top and right
    ///   tJunction:  [top, right, -, left]      → T opens to top, right, left (closed bottom)
    public static func getTileOpenings(shape: TileShape, rotation: TileRotation) -> (top: Bool, right: Bool, bottom: Bool, left: Bool) {
        let base: [Bool]
        switch shape {
        case .straight:   base = [true, false, true, false]
        case .corner:     base = [true, true, false, false]
        case .tJunction:  base = [true, true, false, true]
        }
        let shift = rotation.solverIndex
        let rotated = (0..<4).map { base[($0 - shift + 4) % 4] }
        return (rotated[0], rotated[1], rotated[2], rotated[3])
    }

    // MARK: - Connectivity

    public enum Direction { case up, right, down, left }

    /// Returns true when tileA and tileB are path-connected across the given direction from A to B.
    public static func canConnect(from tileA: TileData, to tileB: TileData, direction: Direction) -> Bool {
        let a = getTileOpenings(shape: tileA.shape, rotation: tileA.rotation)
        let b = getTileOpenings(shape: tileB.shape, rotation: tileB.rotation)
        switch direction {
        case .up:    return a.top    && b.bottom
        case .right: return a.right  && b.left
        case .down:  return a.bottom && b.top
        case .left:  return a.left   && b.right
        }
    }

    // MARK: - BFS Reachability

    /// BFS from `start` returning all positions reachable by the active pawn.
    public static func findReachablePositions(grid: [[TileData]], start: PawnPosition) -> Set<PawnPositionKey> {
        var visited = Set<PawnPositionKey>()
        let numRows = grid.count
        guard numRows > 0 else { return visited }
        let numCols = grid[0].count

        guard start.row >= 0 && start.row < numRows &&
              start.col >= 0 && start.col < numCols else {
            return visited
        }

        var queue = [start]
        visited.insert(PawnPositionKey(start))

        while !queue.isEmpty {
            let current = queue.removeFirst()
            let r = current.row
            let c = current.col
            guard r >= 0 && r < numRows && c >= 0 && c < numCols else { continue }
            let tile = grid[r][c]

            let neighbors: [(r: Int, c: Int, dir: Direction)] = [
                (r - 1, c, .up),
                (r + 1, c, .down),
                (r, c - 1, .left),
                (r, c + 1, .right),
            ]

            for n in neighbors {
                guard n.r >= 0 && n.r < numRows && n.c >= 0 && n.c < numCols else { continue }
                let key = PawnPositionKey(row: n.r, col: n.c)
                guard !visited.contains(key) else { continue }
                if canConnect(from: tile, to: grid[n.r][n.c], direction: n.dir) {
                    visited.insert(key)
                    queue.append(PawnPosition(row: n.r, col: n.c))
                }
            }
        }
        return visited
    }

    // MARK: - Slide Simulation

    /// Applies one slide operation and returns the resulting (grid, spareTile, pawnPositions).
    /// Arrow ID format: "<side>_<index>" e.g. "top_1", "left_3", "bottom_5", "right_1".
    /// - top_N    → column N slides downward  (spare enters at row 0)
    /// - bottom_N → column N slides upward    (spare enters at row 6)
    /// - left_N   → row N slides rightward    (spare enters at col 0)
    /// - right_N  → row N slides leftward     (spare enters at col 6)
    public static func simulateSlide(
        grid: [[TileData]],
        spareTile: TileData,
        arrowId: String,
        pawnPositions: PawnPositions
    ) -> (grid: [[TileData]], spareTile: TileData, pawnPositions: PawnPositions) {

        var nextGrid  = grid
        var nextSpare = spareTile
        var nextPawns = pawnPositions

        let parts = arrowId.split(separator: "_")
        guard parts.count == 2,
              let idx = Int(parts[1]),
              [1, 3, 5].contains(idx)
        else { return (grid, spareTile, pawnPositions) }

        let side = String(parts[0])
        let size = grid.count

        switch side {
        case "top":      // Column idx slides DOWN — spare enters at row 0, expelled from row (size-1)
            nextSpare = grid[size - 1][idx]
            for r in stride(from: size - 1, through: 1, by: -1) {
                nextGrid[r][idx] = grid[r - 1][idx]
            }
            nextGrid[0][idx] = spareTile
            // Wrap pawns: those in col idx move down; if at bottom they wrap to top
            for color in PawnColor.allCases where nextPawns[color].col == idx {
                nextPawns[color].row = nextPawns[color].row == size - 1 ? 0 : nextPawns[color].row + 1
            }

        case "bottom":   // Column idx slides UP — spare enters at row (size-1), expelled from row 0
            nextSpare = grid[0][idx]
            for r in 0..<(size - 1) {
                nextGrid[r][idx] = grid[r + 1][idx]
            }
            nextGrid[size - 1][idx] = spareTile
            for color in PawnColor.allCases where nextPawns[color].col == idx {
                nextPawns[color].row = nextPawns[color].row == 0 ? size - 1 : nextPawns[color].row - 1
            }

        case "left":     // Row idx slides RIGHT — spare enters at col 0, expelled from col (size-1)
            nextSpare = grid[idx][size - 1]
            for c in stride(from: size - 1, through: 1, by: -1) {
                nextGrid[idx][c] = grid[idx][c - 1]
            }
            nextGrid[idx][0] = spareTile
            for color in PawnColor.allCases where nextPawns[color].row == idx {
                nextPawns[color].col = nextPawns[color].col == size - 1 ? 0 : nextPawns[color].col + 1
            }

        case "right":    // Row idx slides LEFT — spare enters at col (size-1), expelled from col 0
            nextSpare = grid[idx][0]
            for c in 0..<(size - 1) {
                nextGrid[idx][c] = grid[idx][c + 1]
            }
            nextGrid[idx][size - 1] = spareTile
            for color in PawnColor.allCases where nextPawns[color].row == idx {
                nextPawns[color].col = nextPawns[color].col == 0 ? size - 1 : nextPawns[color].col - 1
            }

        default:
            break
        }

        return (nextGrid, nextSpare, nextPawns)
    }

    // MARK: - Best Move Search

    /// Finds the single best slide + spare rotation combination that gets `activePawn`
    /// closest to the tile holding `targetTreasureId`.
    ///
    /// Returns immediately if a slide that makes the target reachable this turn is found.
    /// Otherwise returns the slide that minimises Manhattan distance to the target.
    ///
    /// Pass `lastArrowId` to enforce the no-reverse-slide rule.
    public static func findBestMove(
        grid: [[TileData]],
        spareTile: TileData,
        activePawn: PawnColor,
        targetTreasureId: String?,
        pawnPositions: PawnPositions,
        lastArrowId: String? = nil
    ) -> MoveOption? {

        var bestOption: MoveOption?
        var minDistance = Int.max

        for arrow in GameConstants.validArrowIds {
            // Enforce the no-reverse-slide rule
            if let last = lastArrowId,
               let opposite = GameConstants.oppositeArrowId(for: last),
               arrow == opposite {
                continue
            }

            for rotation in TileRotation.allCases {
                var rotatedSpare = spareTile
                rotatedSpare.rotation = rotation

                let (simGrid, _, simPawns) = simulateSlide(
                    grid: grid,
                    spareTile: rotatedSpare,
                    arrowId: arrow,
                    pawnPositions: pawnPositions
                )
                let startPos  = simPawns[activePawn]
                let reachable = findReachablePositions(grid: simGrid, start: startPos)

                // Locate the target treasure on the post-slide board
                var targetPos: PawnPosition?
                if let targetId = targetTreasureId {
                    outer: for r in 0..<7 {
                        for c in 0..<7 {
                            if simGrid[r][c].treasure?.id == targetId {
                                targetPos = PawnPosition(row: r, col: c)
                                break outer
                            }
                        }
                    }
                }

                var isReached = false
                var dist = 999

                if let target = targetPos {
                    let key = PawnPositionKey(target)
                    if reachable.contains(key) {
                        isReached = true
                        dist = 0
                    } else {
                        for posKey in reachable {
                            let d = abs(posKey.row - target.row) + abs(posKey.col - target.col)
                            if d < dist { dist = d }
                        }
                    }
                } else if targetTreasureId == nil {
                    // No target — just maximise reachable area
                    dist = 100 - reachable.count
                }

                if isReached {
                    return MoveOption(
                        arrowId: arrow,
                        tileRotation: rotation,
                        targetPosition: targetPos ?? startPos,
                        reachableTreasures: collectReachableTreasures(reachable: reachable, grid: simGrid),
                        distanceToTarget: 0,
                        isTargetReached: true,
                        summaryText: "Slide \(arrowDisplayName(arrow)) · rotate spare \(rotation.rawValue)° · TARGET REACHABLE! 🎯"
                    )
                }

                if dist < minDistance {
                    minDistance = dist
                    bestOption = MoveOption(
                        arrowId: arrow,
                        tileRotation: rotation,
                        targetPosition: targetPos ?? startPos,
                        reachableTreasures: collectReachableTreasures(reachable: reachable, grid: simGrid),
                        distanceToTarget: dist,
                        isTargetReached: false,
                        summaryText: "Slide \(arrowDisplayName(arrow)) · rotate spare \(rotation.rawValue)° · \(dist) moves to target"
                    )
                }
            }
        }

        return bestOption
    }

    // MARK: - Multi-Turn Lookahead

    /// Async wrapper so the solver never blocks the main thread.
    public static func findBestMoveAsync(
        grid: [[TileData]],
        spareTile: TileData,
        activePawn: PawnColor,
        targetTreasureId: String?,
        pawnPositions: PawnPositions,
        lastArrowId: String?,
        depth: Int = 1,
        completion: @escaping @Sendable (MoveOption?) -> Void
    ) {
        Task.detached(priority: .userInitiated) {
            let result = findBestMove(
                grid: grid,
                spareTile: spareTile,
                activePawn: activePawn,
                targetTreasureId: targetTreasureId,
                pawnPositions: pawnPositions,
                lastArrowId: lastArrowId
            )
            await MainActor.run { completion(result) }
        }
    }

    // MARK: - Helpers

    /// Collect IDs of all treasures reachable from the given BFS result set.
    static func collectReachableTreasures(reachable: Set<PawnPositionKey>, grid: [[TileData]]) -> [String] {
        var ids: [String] = []
        for key in reachable {
            if let t = grid[key.row][key.col].treasure {
                ids.append(t.id)
            }
        }
        return ids
    }

    /// Human-readable arrow label.
    static func arrowDisplayName(_ arrowId: String) -> String {
        let parts = arrowId.split(separator: "_")
        guard parts.count == 2, let idx = Int(parts[1]) else { return arrowId }
        let side = String(parts[0])
        switch side {
        case "top":    return "↓ col \(idx)"
        case "bottom": return "↑ col \(idx)"
        case "left":   return "→ row \(idx)"
        case "right":  return "← row \(idx)"
        default:       return arrowId
        }
    }
}
