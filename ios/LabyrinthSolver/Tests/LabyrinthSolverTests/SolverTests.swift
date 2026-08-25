import XCTest
@testable import LabyrinthSolverCore

final class SolverTests: XCTestCase {
    func testTileOpenings() {
        // Straight 0 deg should open top & bottom
        let straight0 = SolverEngine.getTileOpenings(shape: .straight, rotation: .deg0)
        XCTAssertTrue(straight0.top)
        XCTAssertFalse(straight0.right)
        XCTAssertTrue(straight0.bottom)
        XCTAssertFalse(straight0.left)

        // Straight 90 deg should open right & left
        let straight90 = SolverEngine.getTileOpenings(shape: .straight, rotation: .deg90)
        XCTAssertFalse(straight90.top)
        XCTAssertTrue(straight90.right)
        XCTAssertFalse(straight90.bottom)
        XCTAssertTrue(straight90.left)
    }

    func testTileConnectivity() {
        let tileTop = TileData(shape: .straight, rotation: .deg0)
        let tileBottom = TileData(shape: .straight, rotation: .deg0)

        // Moving down from top tile to bottom tile should connect
        let connects = SolverEngine.canConnect(from: tileTop, to: tileBottom, direction: .down)
        XCTAssertTrue(connects)
    }

    func testFixedBoardInitialization() {
        let initial = GameConstants.createStandardFullBoard()
        let board = initial.grid
        XCTAssertEqual(board.count, 7)
        XCTAssertEqual(board[0].count, 7)
        XCTAssertEqual(board[0][0].color, .red)
        XCTAssertEqual(board[6][6].color, .blue)
    }

    func testRankedSolverOptionsRespectNoReverseRule() {
        let initial = GameConstants.createStandardFullBoard()

        let options = SolverEngine.findBestMoves(
            grid: initial.grid,
            spareTile: initial.spareTile,
            activePawn: .red,
            targetTreasureId: "book",
            pawnPositions: PawnPositions(),
            lastArrowId: "top_1",
            depth: 2,
            limit: 5
        )

        XCTAssertFalse(options.isEmpty)
        XCTAssertFalse(options.contains { $0.arrowId == "bottom_1" })
    }

    func testRankedSolverOptionsIncludeRouteMetadata() {
        let initial = GameConstants.createStandardFullBoard()

        let option = SolverEngine.findBestMoves(
            grid: initial.grid,
            spareTile: initial.spareTile,
            activePawn: .red,
            targetTreasureId: "book",
            pawnPositions: PawnPositions(),
            depth: 3,
            limit: 1
        ).first

        XCTAssertNotNil(option)
        XCTAssertGreaterThanOrEqual(option?.turnsToTarget ?? 0, 1)
        XCTAssertGreaterThan(option?.reachableCount ?? 0, 0)
        XCTAssertGreaterThanOrEqual(option?.safetyScore ?? -1, 0)
        XCTAssertLessThanOrEqual(option?.safetyScore ?? 101, 100)
    }

    func testUnreachablePositionPathfinding() {
        // Disconnected grid: straight tiles horizontal at (0,0) and (0,1) with vertical alignment
        let tileA = TileData(shape: .straight, rotation: .deg90)
        let tileB = TileData(shape: .straight, rotation: .deg0)
        var grid = Array(repeating: Array(repeating: TileData(shape: .straight, rotation: .deg0), count: 7), count: 7)
        grid[0][0] = tileA
        grid[0][1] = tileB

        let reachable = SolverEngine.findReachablePositions(grid: grid, start: PawnPosition(row: 0, col: 0))
        XCTAssertFalse(reachable.contains(PawnPositionKey(row: 0, col: 1)))
    }
}
