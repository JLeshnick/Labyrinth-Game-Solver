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
}
