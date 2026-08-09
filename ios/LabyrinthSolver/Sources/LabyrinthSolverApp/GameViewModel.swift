import SwiftUI
import Combine
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Game View Model

/// Central observable state for the Labyrinth Solver app.
/// Manages board state, turn phases, undo/redo history, pawn management,
/// player hands, and the async solver.
@Observable
@MainActor
final class GameViewModel {

    // MARK: - Setup & App Settings State

    var setupTab: SetupTab = .tiles
    var gameMode: GameMode = .standard
    var looseTiles: [TileData] = []
    var selectedLooseTileId: String? = nil
    var setupGrid: [[TileData?]]? = nil

    var appColorScheme: AppColorScheme = .system
    var appAccentTheme: AppAccentTheme = .gold
    var enableSound: Bool = true
    var enableHaptics: Bool = true
    var solverDepth: Int = 2

    // MARK: - Board State

    var board: [[TileData]]
    var spareTile: TileData
    var pawnPositions: PawnPositions

    // MARK: - Turn Management

    var turnPhase: TurnPhase = .slide
    var activePawn: PawnColor = .red
    var lastArrowId: String? = nil    // For no-reverse rule
    var stagedArrowId: String? = nil  // Arrow highlighted but not yet committed
    var stagedRotation: TileRotation = .deg0
    var stagedAiMove: MoveOption? = nil // Stores the AI's full move to auto-execute pawn move

    // MARK: - Undo / Redo

    private var undoStack: [HistoryEntry] = []
    private var redoStack: [HistoryEntry] = []
    var canUndo: Bool { !undoStack.isEmpty }
    var canRedo: Bool { !redoStack.isEmpty }

    // MARK: - Player Hands & Treasure Tracking

    var playerHands: [PawnColor: PlayerHand] = [:]
    var activePlayers: [PawnColor] = PawnColor.allCases

    /// A simple one-shot target treasure ID used by the solver sheet (independent of card hands)
    var singleTargetId: String? = nil

    // Returns the current target treasure id — prefers singleTargetId over card hand
    var activeTargetId: String? { singleTargetId ?? playerHands[activePawn]?.currentTarget }

    // MARK: - Solver State

    var isSolving: Bool = false
    var solverMessage: String? = nil
    var solverOptions: [MoveOption] = [] // Store multiple options to show

    // MARK: - Reachable Positions Cache

    var reachablePositions: Set<PawnPositionKey> = []

    // MARK: - Game Control

    var isGameStarted: Bool = false
    var moveCount: Int = 0

    // MARK: - UI Feedback

    var toastMessage: String? = nil
    private var toastTask: Task<Void, Never>? = nil

    // MARK: - Init

    init() {
        let initial = GameConstants.createStandardFullBoard()
        self.board       = initial.grid
        self.spareTile   = initial.spareTile
        self.looseTiles  = [initial.spareTile]
        self.pawnPositions = PawnPositions()
        self.playerHands = [:]
        refreshReachable()
    }

    // MARK: - Reachable Refresh

    func refreshReachable() {
        let pos = pawnPositions[activePawn]
        reachablePositions = SolverEngine.findReachablePositions(grid: board, start: pos)
    }

    // MARK: - Slide (Commit)

    /// Stage an arrow — first tap highlights it; second tap (or commit button) executes.
    func stageOrRotateArrow(_ arrowId: String) {
        if stagedArrowId == arrowId {
            // Already staged: rotate spare one step
            spareTile.rotation = spareTile.rotation.nextClockwise
            stagedRotation = spareTile.rotation
        } else {
            stagedArrowId = arrowId
            stagedRotation = spareTile.rotation
        }
        stagedAiMove = nil // Manual staging clears AI move
    }

    /// Apply the staged slide and advance turn phase to .move. If an AI move is staged, auto-move the pawn.
    func commitSlide() {
        guard let arrowId = stagedArrowId else { return }
        // Enforce no-reverse rule
        if let last = lastArrowId,
           let opposite = GameConstants.oppositeArrowId(for: last),
           arrowId == opposite {
            showToast("You can't reverse the last slide!")
            return
        }
        pushHistory()
        var rotatedSpare = spareTile
        rotatedSpare.rotation = stagedRotation
        let (nextGrid, nextSpare, nextPawns) = SolverEngine.simulateSlide(
            grid: board,
            spareTile: rotatedSpare,
            arrowId: arrowId,
            pawnPositions: pawnPositions
        )
        board          = nextGrid
        spareTile      = nextSpare
        pawnPositions  = nextPawns
        lastArrowId    = arrowId
        stagedArrowId  = nil
        turnPhase      = .move
        solverMessage  = nil
        refreshReachable()

        // Auto-move pawn if this was an AI move
        if let aiMove = stagedAiMove {
            stagedAiMove = nil
            let key = PawnPositionKey(aiMove.targetPosition)
            if reachablePositions.contains(key) {
                // Short delay so the user sees the slide complete before the pawn moves
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self] in
                    self?.movePawn(to: aiMove.targetPosition.row, col: aiMove.targetPosition.col)
                }
            }
        }
    }

    /// Cancel a staged arrow without committing
    func cancelStage() {
        stagedArrowId = nil
    }

    /// Directly slide (bypass staging) — used by the solver's "apply best move"
    func applySlide(_ arrowId: String, rotation: TileRotation) {
        pushHistory()
        var rotatedSpare = spareTile
        rotatedSpare.rotation = rotation
        let (nextGrid, nextSpare, nextPawns) = SolverEngine.simulateSlide(
            grid: board,
            spareTile: rotatedSpare,
            arrowId: arrowId,
            pawnPositions: pawnPositions
        )
        board          = nextGrid
        spareTile      = nextSpare
        pawnPositions  = nextPawns
        lastArrowId    = arrowId
        turnPhase      = .move
        stagedAiMove   = nil
        refreshReachable()
    }

    // MARK: - Pawn Move

    /// Move the active pawn to (row, col) if it is reachable.
    @discardableResult
    func movePawn(to row: Int, col: Int) -> Bool {
        let key = PawnPositionKey(row: row, col: col)
        guard reachablePositions.contains(key) else { return false }

        pawnPositions[activePawn] = PawnPosition(row: row, col: col)
        moveCount += 1

        // Check if the pawn landed on its target treasure
        if let targetId = activeTargetId,
           board[row][col].treasure?.id == targetId {
            playerHands[activePawn]?.obtainedCards.append(targetId)
            showToast("🎉 \(activePawn.displayName) collected \(board[row][col].treasure?.name ?? targetId)!")
        }

        // Advance to next player / start new turn
        advanceTurn()
        return true
    }

    // MARK: - Spare Tile Rotation

    func rotateSpareTile() {
        spareTile.rotation = spareTile.rotation.nextClockwise
    }

    // MARK: - Turn Advancement

    private func advanceTurn() {
        let allCases = PawnColor.allCases
        let currentIdx = allCases.firstIndex(of: activePawn) ?? 0
        activePawn = allCases[(currentIdx + 1) % allCases.count]
        turnPhase  = .slide
        stagedArrowId = nil
        refreshReachable()
    }

    // MARK: - Arrow Validity

    /// Returns true if the given arrow can legally be used (not the reverse of last slide).
    func isArrowAllowed(_ arrowId: String) -> Bool {
        guard let last = lastArrowId,
              let opposite = GameConstants.oppositeArrowId(for: last)
        else { return true }
        return arrowId != opposite
    }

    // MARK: - Undo / Redo

    func undo() {
        guard let entry = undoStack.last else { return }
        undoStack.removeLast()
        redoStack.append(currentHistoryEntry())
        applyHistory(entry)
        showToast("↩ Undo")
    }

    func redo() {
        guard let entry = redoStack.last else { return }
        redoStack.removeLast()
        undoStack.append(currentHistoryEntry())
        applyHistory(entry)
        showToast("↪ Redo")
    }

    private func pushHistory() {
        undoStack.append(currentHistoryEntry())
        redoStack.removeAll()
        if undoStack.count > 30 { undoStack.removeFirst() }
    }

    private func currentHistoryEntry() -> HistoryEntry {
        HistoryEntry(
            board: board,
            spareTile: spareTile,
            pawnPositions: pawnPositions,
            lastArrowId: lastArrowId
        )
    }

    private func applyHistory(_ entry: HistoryEntry) {
        board          = entry.board
        spareTile      = entry.spareTile
        pawnPositions  = entry.pawnPositions
        lastArrowId    = entry.lastArrowId
        turnPhase      = .slide
        stagedArrowId  = nil
        stagedAiMove   = nil
        solverMessage  = nil
        refreshReachable()
    }

    // MARK: - Board Layout Setup Methods

    /// Current 7x7 grid for setup mode (contains optionals for unplaced tiles).
    var displaySetupGrid: [[TileData?]] {
        if let setupGrid {
            return setupGrid
        }
        return board.map { row in row.map { Optional($0) } }
    }

    /// Number of placed movable tiles on the board grid.
    var placedTilesCount: Int {
        var count = 0
        let grid = displaySetupGrid
        for r in 0..<7 {
            for c in 0..<7 {
                if let tile = grid[r][c], !tile.isFixed {
                    count += 1
                }
            }
        }
        return count
    }

    /// Whether setup condition is met to start the game (all 33 movable tiles placed).
    var canStartGame: Bool {
        placedTilesCount == 33 || looseTiles.count <= 1
    }

    /// Clear all 33 movable tiles from the grid back into the pool to start from scratch.
    func startFromScratch() {
        let scratch = GameConstants.createScratchBoardSetup()
        setupGrid  = scratch.grid
        looseTiles = scratch.looseTiles
        spareTile  = scratch.spareTile
        selectedLooseTileId = nil
        stagedAiMove = nil
        solverMessage = nil
        showToast("Board cleared! Start placing tiles from scratch.")
    }

    /// Fill remaining empty slots on the board randomly from the loose pool.
    func fillRemainingRandomly() {
        var grid = displaySetupGrid
        var pool = looseTiles.shuffled()
        let rotations: [TileRotation] = [.deg0, .deg90, .deg180, .deg270]

        for r in 0..<7 {
            for c in 0..<7 {
                if grid[r][c] == nil && !pool.isEmpty {
                    var tile = pool.removeFirst()
                    tile.rotation = rotations.randomElement() ?? .deg0
                    grid[r][c] = tile
                }
            }
        }

        setupGrid = grid
        looseTiles = pool
        if let last = pool.last {
            spareTile = last
        }
        showToast("Remaining slots filled randomly! ✨")
    }

    /// Randomize and shuffle all 33 movable tiles on the board plus 1 spare tile.
    func randomizeBoard() {
        let randomized = GameConstants.randomizeFullBoard()
        board          = randomized.grid
        spareTile      = randomized.spareTile
        looseTiles     = [randomized.spareTile]
        setupGrid      = nil
        selectedLooseTileId = nil
        stagedAiMove   = nil
        solverMessage  = nil
        refreshReachable()
        showToast("Board layout randomized ✨")
    }

    /// Reset board layout to the standard Ravensburger layout.
    func resetBoardLayout() {
        let fresh      = GameConstants.createStandardFullBoard()
        board          = fresh.grid
        spareTile      = fresh.spareTile
        looseTiles     = [fresh.spareTile]
        setupGrid      = nil
        selectedLooseTileId = nil
        stagedAiMove   = nil
        solverMessage  = nil
        refreshReachable()
        showToast("Board layout reset to standard ↺")
    }

    /// Reset all game settings, mode, active players, hands, and board layout to defaults.
    func resetAllDefaults() {
        resetBoardLayout()
        gameMode      = .standard
        activePlayers = PawnColor.allCases
        activePawn    = .red
        playerHands   = GameConstants.dealDefaultHands()
        setupTab      = .tiles
        showToast("All settings and layout reset to defaults!")
    }

    /// Select or rotate a loose tile from the setup pool.
    func selectLooseTile(id: String) {
        if selectedLooseTileId == id {
            // Tapping again rotates the selected loose tile
            rotateLooseTile(id: id)
        } else {
            selectedLooseTileId = id
        }
    }

    /// Rotate a loose tile in the pool clockwise.
    func rotateLooseTile(id: String) {
        if let idx = looseTiles.firstIndex(where: { $0.id == id }) {
            looseTiles[idx].rotation = looseTiles[idx].rotation.nextClockwise
        }
    }

    /// Rotate a placed movable tile on the board grid clockwise (during setup).
    func rotateBoardTile(row: Int, col: Int) {
        guard !board[row][col].isFixed else { return }
        board[row][col].rotation = board[row][col].rotation.nextClockwise
    }

    /// Handle setup cell tap: place, swap, remove, or rotate.
    func tapSetupCell(row: Int, col: Int) {
        var grid = displaySetupGrid

        // Check if fixed
        if let existing = grid[row][col], existing.isFixed {
            showToast("Fixed corner & T-junction tiles cannot be changed!")
            return
        }

        if let existing = grid[row][col] {
            // Cell is occupied by a movable tile
            if let selectedId = selectedLooseTileId,
               let looseIdx = looseTiles.firstIndex(where: { $0.id == selectedId }) {
                // Swap selected loose tile into cell
                let looseTile = looseTiles.remove(at: looseIdx)
                grid[row][col] = looseTile
                looseTiles.append(existing)
                selectedLooseTileId = nil
            } else {
                // Remove tile from cell back to loose tiles pool
                grid[row][col] = nil
                looseTiles.append(existing)
                showToast("Tile returned to pool")
            }
        } else {
            // Cell is empty (nil)
            if let selectedId = selectedLooseTileId,
               let looseIdx = looseTiles.firstIndex(where: { $0.id == selectedId }) {
                // Place selected loose tile into empty slot
                let looseTile = looseTiles.remove(at: looseIdx)
                grid[row][col] = looseTile
                selectedLooseTileId = nil
            } else if !looseTiles.isEmpty {
                // Place first loose tile if no specific tile was selected
                let looseTile = looseTiles.removeFirst()
                grid[row][col] = looseTile
            }
        }

        setupGrid = grid
        if let last = looseTiles.last {
            spareTile = last
        }
    }

    /// Toggle player active status.
    func togglePlayerActive(_ pawn: PawnColor) {
        if activePlayers.contains(pawn) {
            guard activePlayers.count > 1 else {
                showToast("At least one player must be active!")
                return
            }
            activePlayers.removeAll(where: { $0 == pawn })
        } else {
            activePlayers.append(pawn)
        }

        if !activePlayers.contains(activePawn), let first = activePlayers.first {
            activePawn = first
        }
    }

    /// Add a card to player's hand.
    func addCardToPlayerHand(pawn: PawnColor, treasureId: String) {
        var current = playerHands[pawn]?.cards ?? []
        if !current.contains(treasureId) {
            current.append(treasureId)
            playerHands[pawn] = PlayerHand(cards: current)
        }
    }

    /// Remove a card from player's hand.
    func removeCardFromPlayerHand(pawn: PawnColor, treasureId: String) {
        var current = playerHands[pawn]?.cards ?? []
        current.removeAll(where: { $0 == treasureId })
        playerHands[pawn] = PlayerHand(cards: current)
    }

    /// Add all unassigned treasure cards to player's hand.
    func addAllCardsToPlayerHand(pawn: PawnColor) {
        let assignedOther = playerHands
            .filter { $0.key != pawn }
            .flatMap { $0.value.cards }
        let available = GameConstants.treasures
            .map { $0.id }
            .filter { !assignedOther.contains($0) }
        playerHands[pawn] = PlayerHand(cards: available)
    }

    /// Clear all cards from player's hand.
    func clearPlayerHand(pawn: PawnColor) {
        playerHands[pawn] = PlayerHand(cards: [])
    }

    // MARK: - Reset

    func resetBoard() {
        resetBoardLayout()
        pawnPositions  = PawnPositions()
        activePawn     = .red
        turnPhase      = .slide
        lastArrowId    = nil
        stagedArrowId  = nil
        undoStack.removeAll()
        redoStack.removeAll()
        moveCount      = 0
        isGameStarted  = false
    }

    // MARK: - Start Game (Deal Cards & Launch)

    func startGame() {
        // Commit setupGrid if it was being modified
        if let grid = setupGrid {
            var fullGrid: [[TileData]] = []
            var pool = looseTiles
            let rotations: [TileRotation] = [.deg0, .deg90, .deg180, .deg270]

            for r in 0..<7 {
                var row: [TileData] = []
                for c in 0..<7 {
                    if let tile = grid[r][c] {
                        row.append(tile)
                    } else if !pool.isEmpty {
                        var tile = pool.removeFirst()
                        tile.rotation = rotations.randomElement() ?? .deg0
                        row.append(tile)
                    } else {
                        row.append(TileData(shape: .straight, isFixed: false))
                    }
                }
                fullGrid.append(row)
            }
            board = fullGrid
            if let last = pool.last {
                spareTile = last
            }
            setupGrid = nil
        }

        if playerHands.isEmpty || playerHands.values.allSatisfy({ $0.cards.isEmpty }) {
            playerHands = GameConstants.dealDefaultHands()
        }
        isGameStarted = true
        turnPhase     = .slide
        moveCount     = 0
        undoStack.removeAll()
        redoStack.removeAll()
        lastArrowId   = nil
        stagedArrowId = nil
        stagedAiMove  = nil
        solverMessage = nil
        refreshReachable()
        showToast("Game started! \(activePawn.displayName) goes first.")
    }

    // MARK: - Solver

    func runSolverAndStage() {
        guard !isSolving else { return }
        isSolving = true

        let board = self.board
        let spareTile = self.spareTile
        let activePawn = self.activePawn
        let targetId = self.activeTargetId
        let positions = self.pawnPositions
        let lastArrow = self.lastArrowId
        // Multi-depth solver doesn't currently exist in this engine so we'll just use the fast standard search.
        
        Task.detached(priority: .userInitiated) { [weak self] in
            let result = SolverEngine.findBestMove(
                grid: board,
                spareTile: spareTile,
                activePawn: activePawn,
                targetTreasureId: targetId,
                pawnPositions: positions,
                lastArrowId: lastArrow
            )
            await MainActor.run { [weak self] in
                guard let self else { return }
                self.isSolving = false
                if let move = result {
                    // Auto-stage the move on the board for instant preview!
                    self.spareTile.rotation = move.tileRotation
                    self.stagedArrowId = move.arrowId
                    self.stagedRotation = move.tileRotation
                    self.stagedAiMove = move
                    Haptics.notification(.success)
                    if move.isTargetReached {
                        self.showToast("AI found a path to target!")
                    }
                } else {
                    Haptics.notification(.error)
                    self.showToast("AI could not find a valid move.")
                }
            }
        }
    }



    // MARK: - Player Hand Setup

    func setPlayerHand(for pawn: PawnColor, treasureIds: [String]) {
        playerHands[pawn] = PlayerHand(cards: treasureIds)
    }

    func markTreasureObtained(for pawn: PawnColor, treasureId: String) {
        playerHands[pawn]?.obtainedCards.append(treasureId)
    }

    /// Set a quick solver target (used by SolverSheet treasure grid)
    func setActiveTarget(treasureId: String) {
        singleTargetId = treasureId
        stagedAiMove = nil
        solverMessage = nil
    }

    func clearActiveTarget() {
        singleTargetId = nil
        stagedAiMove = nil
        solverMessage = nil
    }

    /// Configure the game for N players and optionally deal treasure cards.
    func configureGame(playerCount: Int, withSolver: Bool) {
        let pawns = Array(PawnColor.allCases.prefix(playerCount))
        activePlayers = pawns
        activePawn = pawns[0]
        if withSolver {
            playerHands = GameConstants.dealDefaultHands()
        } else {
            playerHands = [:]
        }
        isGameStarted = true
        moveCount = 0
        undoStack.removeAll()
        redoStack.removeAll()
        turnPhase = .slide
        lastArrowId = nil
        stagedArrowId = nil
        stagedAiMove = nil
        solverMessage = nil
        singleTargetId = nil
        refreshReachable()
        showToast("Game started! \(activePawn.displayName) goes first 🎲")
    }

    // MARK: - Toast

    func showToast(_ message: String) {
        toastMessage = message
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(2.5))
            guard !Task.isCancelled else { return }
            self?.toastMessage = nil
        }
    }

    // MARK: - Preview (for staged move)

    /// Returns the board state and reachable positions after applying the staged arrow (for visual preview).
    var previewState: (grid: [[TileData]], reachable: Set<PawnPositionKey>)? {
        guard let arrowId = stagedArrowId else { return nil }
        var rotatedSpare = spareTile
        rotatedSpare.rotation = stagedRotation
        let (previewGrid, _, previewPawns) = SolverEngine.simulateSlide(
            grid: board,
            spareTile: rotatedSpare,
            arrowId: arrowId,
            pawnPositions: pawnPositions
        )
        let reachable = SolverEngine.findReachablePositions(grid: previewGrid, start: previewPawns[activePawn])
        return (previewGrid, reachable)
    }
}
