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

    private struct SearchStep: Sendable {
        let arrowId: String
        let rotation: TileRotation
        let landingPosition: PawnPosition
        let reachableTreasures: [String]
        let reachableCount: Int
        let distanceToTarget: Int
        let safetyScore: Int
    }

    private struct SearchNode: Sendable {
        let grid: [[TileData]]
        let spareTile: TileData
        let pawnPosition: PawnPosition
        let firstStep: SearchStep
        let lastArrowId: String
        let turns: Int
    }

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
        targetPosition: PawnPosition? = nil,
        pawnPositions: PawnPositions,
        lastArrowId: String? = nil
    ) -> MoveOption? {
        findBestMoves(
            grid: grid,
            spareTile: spareTile,
            activePawn: activePawn,
            targetTreasureId: targetTreasureId,
            targetPosition: targetPosition,
            pawnPositions: pawnPositions,
            lastArrowId: lastArrowId,
            depth: 1,
            limit: 1
        ).first
    }

    /// Returns ranked first-turn suggestions. With a target and depth > 1 this searches
    /// future slide states, then recommends the first slide/walk that starts the shortest route.
    public static func findBestMoves(
        grid: [[TileData]],
        spareTile: TileData,
        activePawn: PawnColor,
        targetTreasureId: String?,
        targetPosition: PawnPosition? = nil,
        pawnPositions: PawnPositions,
        lastArrowId: String? = nil,
        depth: Int = 1,
        limit: Int = 5
    ) -> [MoveOption] {
        let boundedDepth = max(1, min(depth, 3))
        let startPos = pawnPositions[activePawn]
        let maxQueuedStates = 3_500

        guard targetTreasureId != nil || targetPosition != nil else {
            return fallbackMoves(
                grid: grid,
                spareTile: spareTile,
                startPos: startPos,
                targetTreasureId: nil,
                targetPosition: nil,
                pawnPositions: pawnPositions,
                activePawn: activePawn,
                lastArrowId: lastArrowId,
                limit: limit
            )
        }

        var solutions: [MoveOption] = []
        var queue: [SearchNode] = []
        var visited = Set<String>()

        for candidate in firstTurnCandidates(
            grid: grid,
            spareTile: spareTile,
            startPos: startPos,
            targetTreasureId: targetTreasureId,
            targetPosition: targetPosition,
            pawnPositions: pawnPositions,
            activePawn: activePawn,
            lastArrowId: lastArrowId
        ) {
            if candidate.reachesTarget {
                solutions.append(makeMoveOption(from: candidate.firstStep, turns: 1, reached: true))
            }

            guard boundedDepth > 1 else { continue }
            for key in candidate.reachable {
                guard queue.count < maxQueuedStates else { break }
                let stateKey = "\(boardHash(grid: candidate.grid, spareTile: candidate.spareTile))|\(key.row),\(key.col)"
                guard !visited.contains(stateKey) else { continue }
                visited.insert(stateKey)
                queue.append(SearchNode(
                    grid: candidate.grid,
                    spareTile: candidate.spareTile,
                    pawnPosition: PawnPosition(row: key.row, col: key.col),
                    firstStep: candidate.firstStep,
                    lastArrowId: candidate.firstStep.arrowId,
                    turns: 1
                ))
            }
        }

        if solutions.isEmpty {
            var index = 0
            while index < queue.count {
                let node = queue[index]
                index += 1
                guard node.turns < boundedDepth else { continue }

                for candidate in firstTurnCandidates(
                    grid: node.grid,
                    spareTile: node.spareTile,
                    startPos: node.pawnPosition,
                    targetTreasureId: targetTreasureId,
                    pawnPositions: pawnPositions,
                    activePawn: activePawn,
                    lastArrowId: node.lastArrowId,
                    includeMetrics: false
                ) {
                    if candidate.reachesTarget {
                        solutions.append(makeMoveOption(from: node.firstStep, turns: node.turns + 1, reached: true))
                    }

                    guard node.turns + 1 < boundedDepth else { continue }
                    for key in candidate.reachable {
                        guard queue.count < maxQueuedStates else { break }
                        let stateKey = "\(boardHash(grid: candidate.grid, spareTile: candidate.spareTile))|\(key.row),\(key.col)"
                        guard !visited.contains(stateKey) else { continue }
                        visited.insert(stateKey)
                        queue.append(SearchNode(
                            grid: candidate.grid,
                            spareTile: candidate.spareTile,
                            pawnPosition: PawnPosition(row: key.row, col: key.col),
                            firstStep: node.firstStep,
                            lastArrowId: candidate.firstStep.arrowId,
                            turns: node.turns + 1
                        ))
                    }
                }

                if !solutions.isEmpty,
                   index < queue.count,
                   queue[index].turns > node.turns {
                    break
                }
            }
        }

        if solutions.isEmpty {
            return fallbackMoves(
                grid: grid,
                spareTile: spareTile,
                startPos: startPos,
                targetTreasureId: targetTreasureId,
                pawnPositions: pawnPositions,
                activePawn: activePawn,
                lastArrowId: lastArrowId,
                limit: limit
            )
        }

        return dedupeAndRank(solutions).prefix(limit).map { $0 }
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
            let result = findBestMoves(
                grid: grid,
                spareTile: spareTile,
                activePawn: activePawn,
                targetTreasureId: targetTreasureId,
                pawnPositions: pawnPositions,
                lastArrowId: lastArrowId,
                depth: depth,
                limit: 1
            ).first
            await MainActor.run { completion(result) }
        }
    }

    // MARK: - Helpers

    private struct Candidate: Sendable {
        let grid: [[TileData]]
        let spareTile: TileData
        let firstStep: SearchStep
        let reachable: Set<PawnPositionKey>
        let reachesTarget: Bool
    }

    /// Calculates where coordinate (r, c) lands on the board after applying a slide along `arrowId`.
    public static func shiftedPosition(of pos: PawnPosition, under arrowId: String) -> PawnPosition {
        let parts = arrowId.split(separator: "_")
        guard parts.count == 2, let idx = Int(parts[1]) else { return pos }
        let dir = parts[0]
        var r = pos.row
        var c = pos.col

        switch dir {
        case "top":
            if c == idx { r = (r == 6) ? 0 : r + 1 }
        case "bottom":
            if c == idx { r = (r == 0) ? 6 : r - 1 }
        case "left":
            if r == idx { c = (c == 6) ? 0 : c + 1 }
        case "right":
            if r == idx { c = (c == 0) ? 6 : c - 1 }
        default:
            break
        }
        return PawnPosition(row: r, col: c)
    }

    /// Calculates the original coordinate (r, c) on the unslid board that shifted into `simPos` under `arrowId`.
    public static func unshiftedPosition(of simPos: PawnPosition, under arrowId: String) -> PawnPosition {
        let parts = arrowId.split(separator: "_")
        guard parts.count == 2, let idx = Int(parts[1]) else { return simPos }
        let dir = parts[0]
        var r = simPos.row
        var c = simPos.col

        switch dir {
        case "top":
            if c == idx { r = (r == 0) ? 6 : r - 1 }
        case "bottom":
            if c == idx { r = (r == 6) ? 0 : r + 1 }
        case "left":
            if r == idx { c = (c == 0) ? 6 : c - 1 }
        case "right":
            if r == idx { c = (c == 6) ? 0 : c + 1 }
        default:
            break
        }
        return PawnPosition(row: r, col: c)
    }

    private static func firstTurnCandidates(
        grid: [[TileData]],
        spareTile: TileData,
        startPos: PawnPosition,
        targetTreasureId: String?,
        targetPosition: PawnPosition? = nil,
        pawnPositions: PawnPositions,
        activePawn: PawnColor,
        lastArrowId: String?,
        includeMetrics: Bool = true
    ) -> [Candidate] {
        var candidates: [Candidate] = []

        for arrow in GameConstants.validArrowIds {
            if let last = lastArrowId,
               let opposite = GameConstants.oppositeArrowId(for: last),
               arrow == opposite {
                continue
            }

            for rotation in TileRotation.allCases {
                var rotatedSpare = spareTile
                rotatedSpare.rotation = rotation

                var simulatedPawns = pawnPositions
                simulatedPawns[activePawn] = startPos
                let (simGrid, simSpare, simPawns) = simulateSlide(
                    grid: grid,
                    spareTile: rotatedSpare,
                    arrowId: arrow,
                    pawnPositions: simulatedPawns
                )
                let shiftedStart = simPawns[activePawn]
                let reachable = findReachablePositions(grid: simGrid, start: shiftedStart)

                let targetPos: PawnPosition?
                if let targetTreasureId {
                    targetPos = findTargetPosition(targetTreasureId, in: simGrid)
                } else if let initialPos = targetPosition {
                    targetPos = shiftedPosition(of: initialPos, under: arrow)
                } else {
                    targetPos = nil
                }

                let bestLanding = bestLandingPosition(reachable: reachable, target: targetPos, fallback: shiftedStart)
                let distance = targetPos.map { manhattan(from: bestLanding, to: $0) } ?? max(0, 100 - reachable.count)
                let firstStep = SearchStep(
                    arrowId: arrow,
                    rotation: rotation,
                    landingPosition: bestLanding,
                    reachableTreasures: includeMetrics ? collectReachableTreasures(reachable: reachable, grid: simGrid) : [],
                    reachableCount: reachable.count,
                    distanceToTarget: distance,
                    safetyScore: includeMetrics ? calculateSafetyScore(grid: simGrid, spareTile: simSpare, pawnPos: bestLanding, lastArrowId: arrow) : 0
                )

                candidates.append(Candidate(
                    grid: simGrid,
                    spareTile: simSpare,
                    firstStep: firstStep,
                    reachable: reachable,
                    reachesTarget: targetPos.map { reachable.contains(PawnPositionKey($0)) } ?? false
                ))
            }
        }

        return candidates
    }

    private static func fallbackMoves(
        grid: [[TileData]],
        spareTile: TileData,
        startPos: PawnPosition,
        targetTreasureId: String?,
        targetPosition: PawnPosition? = nil,
        pawnPositions: PawnPositions,
        activePawn: PawnColor,
        lastArrowId: String?,
        limit: Int
    ) -> [MoveOption] {
        let candidates = firstTurnCandidates(
            grid: grid,
            spareTile: spareTile,
            startPos: startPos,
            targetTreasureId: targetTreasureId,
            targetPosition: targetPosition,
            pawnPositions: pawnPositions,
            activePawn: activePawn,
            lastArrowId: lastArrowId
        )

        let options = candidates.map {
            makeMoveOption(from: $0.firstStep, turns: 1, reached: $0.reachesTarget)
        }
        return dedupeAndRank(options).prefix(limit).map { $0 }
    }

    private static func makeMoveOption(from step: SearchStep, turns: Int, reached: Bool) -> MoveOption {
        let summary: String
        if reached && turns == 1 {
            summary = "Slide \(arrowDisplayName(step.arrowId)) · rotate spare \(step.rotation.rawValue)° · target reachable now"
        } else if reached {
            summary = "Slide \(arrowDisplayName(step.arrowId)) · rotate spare \(step.rotation.rawValue)° · sets up a \(turns)-turn route"
        } else {
            summary = "Slide \(arrowDisplayName(step.arrowId)) · rotate spare \(step.rotation.rawValue)° · move to (\(step.landingPosition.row), \(step.landingPosition.col)), \(step.distanceToTarget) spaces from target"
        }

        return MoveOption(
            arrowId: step.arrowId,
            tileRotation: step.rotation,
            targetPosition: step.landingPosition,
            reachableTreasures: step.reachableTreasures,
            distanceToTarget: step.distanceToTarget,
            isTargetReached: reached,
            turnsToTarget: turns,
            reachableCount: step.reachableCount,
            safetyScore: step.safetyScore,
            summaryText: summary
        )
    }

    private static func dedupeAndRank(_ options: [MoveOption]) -> [MoveOption] {
        let ranked = options.sorted {
            if $0.isTargetReached != $1.isTargetReached { return $0.isTargetReached && !$1.isTargetReached }
            if $0.turnsToTarget != $1.turnsToTarget { return $0.turnsToTarget < $1.turnsToTarget }
            if $0.distanceToTarget != $1.distanceToTarget { return $0.distanceToTarget < $1.distanceToTarget }
            if $0.safetyScore != $1.safetyScore { return $0.safetyScore > $1.safetyScore }
            return $0.reachableCount > $1.reachableCount
        }

        var seen = Set<String>()
        var unique: [MoveOption] = []
        for option in ranked {
            let key = "\(option.arrowId)_\(option.tileRotation.rawValue)"
            guard !seen.contains(key) else { continue }
            seen.insert(key)
            unique.append(option)
        }
        return unique
    }

    public static func findTargetPosition(_ targetTreasureId: String?, in grid: [[TileData]]) -> PawnPosition? {
        guard let targetTreasureId else { return nil }

        for r in 0..<grid.count {
            for c in 0..<grid[r].count {
                if grid[r][c].treasure?.id == targetTreasureId {
                    return PawnPosition(row: r, col: c)
                }
            }
        }

        return nil
    }

    private static func bestLandingPosition(
        reachable: Set<PawnPositionKey>,
        target: PawnPosition?,
        fallback: PawnPosition
    ) -> PawnPosition {
        guard let target else { return fallback }

        var best = fallback
        var bestDistance = Int.max
        for key in reachable {
            let pos = PawnPosition(row: key.row, col: key.col)
            let distance = manhattan(from: pos, to: target)
            if distance < bestDistance {
                bestDistance = distance
                best = pos
            }
        }
        return best
    }

    private static func manhattan(from lhs: PawnPosition, to rhs: PawnPosition) -> Int {
        abs(lhs.row - rhs.row) + abs(lhs.col - rhs.col)
    }

    private static func boardHash(grid: [[TileData]], spareTile: TileData) -> String {
        var parts: [String] = []
        for row in grid {
            for tile in row where !tile.isFixed {
                parts.append(tile.shape.rawValue)
                parts.append(String(tile.rotation.rawValue))
                parts.append(tile.treasure?.id ?? "")
            }
        }
        parts.append("|")
        parts.append(spareTile.shape.rawValue)
        parts.append(String(spareTile.rotation.rawValue))
        parts.append(spareTile.treasure?.id ?? "")
        return parts.joined(separator: ",")
    }

    private static func calculateSafetyScore(
        grid: [[TileData]],
        spareTile: TileData,
        pawnPos: PawnPosition,
        lastArrowId: String?
    ) -> Int {
        var totalReachable = 0
        var count = 0
        var wrapCount = 0

        for arrow in GameConstants.validArrowIds {
            if let lastArrowId,
               let opposite = GameConstants.oppositeArrowId(for: lastArrowId),
               arrow == opposite {
                continue
            }

            for rotation in TileRotation.allCases {
                var rotatedSpare = spareTile
                rotatedSpare.rotation = rotation
                let pawns = PawnPositions(red: pawnPos, blue: pawnPos, green: pawnPos, yellow: pawnPos)
                let (shiftedGrid, _, shiftedPawns) = simulateSlide(grid: grid, spareTile: rotatedSpare, arrowId: arrow, pawnPositions: pawns)
                let shiftedPos = shiftedPawns[.red]
                if shiftedPos != pawnPos && (abs(shiftedPos.row - pawnPos.row) > 1 || abs(shiftedPos.col - pawnPos.col) > 1) {
                    wrapCount += 1
                }
                totalReachable += findReachablePositions(grid: shiftedGrid, start: shiftedPos).count
                count += 1
            }
        }

        guard count > 0 else { return 0 }
        let averageReachable = Double(totalReachable) / Double(count)
        let reachabilityScore = min(50, Int((averageReachable / 15.0 * 50.0).rounded()))
        let fixedBonus = (pawnPos.row % 2 == 0 && pawnPos.col % 2 == 0) ? 15 : 0
        let tileExitsBonus = grid[pawnPos.row][pawnPos.col].shape == .tJunction ? 15 : 10
        let wrapPenalty = Int((Double(wrapCount) / Double(count) * 10.0).rounded())
        return max(0, min(100, reachabilityScore + fixedBonus + tileExitsBonus - wrapPenalty))
    }

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
    public static func arrowDisplayName(_ arrowId: String) -> String {
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
