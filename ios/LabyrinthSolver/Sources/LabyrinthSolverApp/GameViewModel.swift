import SwiftUI
import Combine
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

@Observable
@MainActor
final class GameViewModel {

    // MARK: - Setup & App Settings State
    var isSetupMode: Bool = true
    var looseTiles: [TileData] = []
    var selectedLooseTileId: String? = nil
    var setupGrid: [[TileData?]]? = nil

    var appColorScheme: AppColorScheme = .system
    var appAccentTheme: AppAccentTheme = .sapphire
    var enableSound: Bool = true
    var enableHaptics: Bool = true
    var solverDepth: Int = 2

    // MARK: - Board State
    var board: [[TileData]]
    var spareTile: TileData
    
    // Multi-player tracking
    var currentPlayerIndex: Int = 0
    var gameMode: GameMode = .standard
    var activePlayers: [PawnColor] = PawnColor.allCases
    
    var myColor: PawnColor {
        activePlayers[currentPlayerIndex]
    }
    
    var pawnPositions: PawnPositions

    // MARK: - Turn Management
    var turnPhase: TurnPhase = .slide
    var lastArrowId: String? = nil
    var stagedArrowId: String? = nil
    var stagedRotation: TileRotation = .deg0
    var stagedSolverMove: MoveOption? = nil

    // MARK: - Player Hands
    var playerHands: [PawnColor: PlayerHand] = GameConstants.dealDefaultHands()

    // MARK: - Undo / Redo
    private(set) var undoStack: [HistoryEntry] = []
    private(set) var redoStack: [HistoryEntry] = []
    var canUndo: Bool { !undoStack.isEmpty }
    var canRedo: Bool { !redoStack.isEmpty }

    // MARK: - Targets
    var activeTargetId: String? = nil
    var activeTargetPosition: PawnPosition? = nil

    // MARK: - Solver State
    var isSolving: Bool = false
    var solverOptions: [MoveOption] = []
    var reachablePositions: Set<PawnPositionKey> = []
    var oneTurnReachablePositions: Set<PawnPositionKey> = []
    
    // Treasures reachable right now on the board (if rules allowed no slide)
    var reachableTreasures: [Treasure] = []
    
    // Treasures reachable in exactly 1 turn (after a slide)
    var oneTurnReachableTreasures: [Treasure] = []
    
    // Projected Route
    var projectedRoute: [PawnPosition] = []

    // MARK: - Game Control
    var isGameStarted: Bool = false
    var moveCount: Int = 0
    var toastMessage: String? = nil
    private var toastTask: Task<Void, Never>? = nil

    init() {
        let scratch = GameConstants.createScratchBoardSetup()
        self.board = scratch.grid.map { row in row.map { $0 ?? TileData(shape: .straight, isFixed: false) } }
        self.setupGrid = scratch.grid
        self.spareTile = scratch.spareTile
        self.looseTiles = scratch.looseTiles
        self.isSetupMode = true
        self.pawnPositions = PawnPositions(red: .init(row: 0, col: 0))
        refreshReachable()
    }

    // MARK: - Game Stopwatch / Timer
    var elapsedSeconds: Int = 0
    private var gameTimerTask: Task<Void, Never>? = nil

    var formattedTime: String {
        let mins = elapsedSeconds / 60
        let secs = elapsedSeconds % 60
        return String(format: "%02d:%02d", mins, secs)
    }

    func startTimer() {
        gameTimerTask?.cancel()
        gameTimerTask = Task { @MainActor [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(nanoseconds: 1_000_000_000)
                guard let self = self, self.isGameStarted && !self.isSetupMode else { continue }
                self.elapsedSeconds += 1
            }
        }
    }

    func stopTimer() {
        gameTimerTask?.cancel()
        gameTimerTask = nil
    }

    func resetTimer() {
        stopTimer()
        elapsedSeconds = 0
    }

    // MARK: - Reachable Refresh
    func refreshReachable() {
        let pos = pawnPositions[myColor]
        reachablePositions = SolverEngine.findReachablePositions(grid: board, start: pos)
        
        var treasures: [Treasure] = []
        for r in 0..<7 {
            for c in 0..<7 {
                if reachablePositions.contains(PawnPositionKey(row: r, col: c)) {
                    if let t = board[r][c].treasure {
                        treasures.append(t)
                    }
                }
            }
        }
        reachableTreasures = treasures.sorted { $0.name < $1.name }
        
        // Compute 1-turn reachable treasures & position keys
        var oneTurnTreasures = Set<String>()
        var oneTurnKeys = Set<PawnPositionKey>()

        for arrow in GameConstants.validArrowIds {
            if isArrowAllowed(arrow) {
                for rotation in TileRotation.allCases {
                    var rotatedSpare = spareTile
                    rotatedSpare.rotation = rotation
                    let (simGrid, _, simPawns) = SolverEngine.simulateSlide(grid: board, spareTile: rotatedSpare, arrowId: arrow, pawnPositions: pawnPositions)
                    let reachable = SolverEngine.findReachablePositions(grid: simGrid, start: simPawns[myColor])
                    for key in reachable {
                        oneTurnKeys.insert(key)
                        if let t = simGrid[key.row][key.col].treasure {
                            oneTurnTreasures.insert(t.id)
                        }
                    }
                }
            }
        }
        
        self.oneTurnReachableTreasures = GameConstants.treasures.filter { oneTurnTreasures.contains($0.id) }
        self.oneTurnReachablePositions = oneTurnKeys
        self.projectedRoute = []
    }

    // MARK: - Staging & Sliding
    func stageOrRotateArrow(_ arrowId: String) {
        if stagedArrowId == arrowId {
            spareTile.rotation = spareTile.rotation.nextClockwise
            stagedRotation = spareTile.rotation
        } else {
            stagedArrowId = arrowId
            stagedRotation = spareTile.rotation
        }
        stagedSolverMove = nil
    }

    func commitSlide() {
        guard let arrowId = stagedArrowId else { return }
        if let last = lastArrowId, let opposite = GameConstants.oppositeArrowId(for: last), arrowId == opposite {
            showToast("You can't reverse the last slide!")
            return
        }
        pushHistory()
        var rotatedSpare = spareTile
        rotatedSpare.rotation = stagedRotation
        let (nextGrid, nextSpare, nextPawns) = SolverEngine.simulateSlide(
            grid: board, spareTile: rotatedSpare, arrowId: arrowId, pawnPositions: pawnPositions
        )
        board = nextGrid
        spareTile = nextSpare
        pawnPositions = nextPawns
        lastArrowId = arrowId
        stagedArrowId = nil
        turnPhase = .move
        solverOptions.removeAll()
        refreshReachable()

        if let targetPos = activeTargetPosition ?? stagedSolverMove?.targetPosition {
            stagedSolverMove = nil
            let key = PawnPositionKey(targetPos)
            if reachablePositions.contains(key) {
                let route = findRoute(grid: board, start: pawnPositions[myColor], end: targetPos)
                self.projectedRoute = []
                if route.count > 1 {
                    self.moveCount += 1
                    self.animatePawn(along: route)
                } else {
                    // Pawn is already at targetPos
                    nextTurn()
                }
            } else {
                self.projectedRoute = []
            }
        }
    }
    
    // MARK: - Pawn Move
    @discardableResult
    func movePawn(to row: Int, col: Int) -> Bool {
        guard turnPhase == .move else { return false }
        let key = PawnPositionKey(row: row, col: col)
        guard reachablePositions.contains(key) else { return false }

        let destPos = PawnPosition(row: row, col: col)
        let currentPos = pawnPositions[myColor]
        if currentPos == destPos {
            // Player taps current tile to stay in place & complete turn
            showToast("\(myColor.displayName) stays in place.")
            nextTurn()
            return true
        }

        let route = findRoute(grid: board, start: currentPos, end: destPos)
        if route.count > 1 {
            moveCount += 1
            animatePawn(along: route)
            return true
        } else {
            pawnPositions[myColor] = destPos
            moveCount += 1

            if let targetId = activeTargetId, board[row][col].treasure?.id == targetId {
                showToast("🎉 Reached \(board[row][col].treasure?.name ?? targetId)!")
                activeTargetId = nil
            }
            
            nextTurn()
            return true
        }
    }

    func passMoveTurn() {
        guard turnPhase == .move else { return }
        showToast("\(myColor.displayName) ends turn.")
        nextTurn()
    }
    
    private func animatePawn(along route: [PawnPosition], currentIndex: Int = 0) {
        guard currentIndex < route.count else {
            if let targetId = activeTargetId, let last = route.last, board[last.row][last.col].treasure?.id == targetId {
                showToast("🎉 Reached \(board[last.row][last.col].treasure?.name ?? targetId)!")
                activeTargetId = nil
            }
            SoundManager.shared.play(.pawnStep, enabled: enableSound)
            nextTurn()
            return
        }
        
        let pos = route[currentIndex]
        
        withAnimation(.spring(response: 0.22, dampingFraction: 0.8)) {
            pawnPositions[myColor] = PawnPosition(row: pos.row, col: pos.col)
        }
        SoundManager.shared.play(.pawnStep, enabled: enableSound)
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.16) { [weak self] in
            self?.animatePawn(along: route, currentIndex: currentIndex + 1)
        }
    }

    func cancelStage() {
        stagedArrowId = nil
        stagedSolverMove = nil
        projectedRoute = []
    }

    func stageSolverOption(_ move: MoveOption) {
        spareTile.rotation = move.tileRotation
        stagedArrowId = move.arrowId
        stagedRotation = move.tileRotation
        stagedSolverMove = move
        
        // Compute route path
        if let preview = previewState {
            let start = preview.pawns[myColor]
            let dest = activeTargetPosition ?? move.targetPosition
            projectedRoute = findRoute(grid: preview.grid, start: start, end: dest)
        }
    }
    
    // BFS to find the shortest path between start and end on a given grid
    func findRoute(grid: [[TileData]], start: PawnPosition, end: PawnPosition) -> [PawnPosition] {
        var queue = [[start]]
        var visited = Set<PawnPositionKey>([PawnPositionKey(start)])
        
        while !queue.isEmpty {
            let path = queue.removeFirst()
            let current = path.last!
            
            if current == end { return path }
            
            let r = current.row
            let c = current.col
            let tile = grid[r][c]
            
            let neighbors: [(r: Int, c: Int, dir: SolverEngine.Direction)] = [
                (r - 1, c, .up), (r + 1, c, .down), (r, c - 1, .left), (r, c + 1, .right)
            ]
            
            for n in neighbors {
                guard n.r >= 0 && n.r < 7 && n.c >= 0 && n.c < 7 else { continue }
                let key = PawnPositionKey(row: n.r, col: n.c)
                if !visited.contains(key) {
                    if SolverEngine.canConnect(from: tile, to: grid[n.r][n.c], direction: n.dir) {
                        visited.insert(key)
                        queue.append(path + [PawnPosition(row: n.r, col: n.c)])
                    }
                }
            }
        }
        return []
    }

    private func nextTurn() {
        currentPlayerIndex = (currentPlayerIndex + 1) % activePlayers.count
        turnPhase = .slide
        stagedArrowId = nil
        stagedSolverMove = nil
        projectedRoute = []
        solverOptions.removeAll()
        activeTargetId = nil
        activeTargetPosition = nil
        refreshReachable()
    }

    func rotateSpareTile() {
        spareTile.rotation = spareTile.rotation.nextClockwise
    }

    func isArrowAllowed(_ arrowId: String) -> Bool {
        guard let last = lastArrowId, let opposite = GameConstants.oppositeArrowId(for: last) else { return true }
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

    func revertToHistoryState(_ index: Int) {
        guard index >= 0 && index < undoStack.count else { return }
        let entry = undoStack[index]
        let keptUndo = Array(undoStack[0...index])
        let movedRedo = Array(undoStack[(index + 1)...].reversed())
        undoStack = keptUndo
        redoStack = movedRedo
        applyHistory(entry)
        showToast("↺ Reverted to turn #\(index + 1)")
    }

    private func pushHistory() {
        undoStack.append(currentHistoryEntry())
        redoStack.removeAll()
        if undoStack.count > 30 { undoStack.removeFirst() }
    }

    private func currentHistoryEntry() -> HistoryEntry {
        HistoryEntry(board: board, spareTile: spareTile, pawnPositions: pawnPositions, lastArrowId: lastArrowId)
    }

    private func applyHistory(_ entry: HistoryEntry) {
        board = entry.board
        spareTile = entry.spareTile
        pawnPositions = entry.pawnPositions
        lastArrowId = entry.lastArrowId
        turnPhase = .slide
        stagedArrowId = nil
        stagedSolverMove = nil
        refreshReachable()
    }

    // MARK: - Session Control
    func resetGameSession() {
        moveCount = 0
        undoStack.removeAll()
        redoStack.removeAll()
        turnPhase = .slide
        lastArrowId = nil
        stagedArrowId = nil
        stagedSolverMove = nil
        stagedRotation = .deg0
        projectedRoute = []
        activeTargetId = nil
        solverOptions.removeAll()
        currentPlayerIndex = 0
        playerHands = GameConstants.dealDefaultHands()
        pawnPositions = PawnPositions(red: .init(row: 0, col: 0), blue: .init(row: 6, col: 6), green: .init(row: 6, col: 0), yellow: .init(row: 0, col: 6))
        resetTimer()
    }

    // MARK: - Setup Mode Methods
    var displaySetupGrid: [[TileData?]] {
        setupGrid ?? board.map { row in row.map { Optional($0) } }
    }

    var placedTilesCount: Int {
        var count = 0
        let grid = displaySetupGrid
        for r in 0..<7 {
            for c in 0..<7 {
                if let tile = grid[r][c], !tile.isFixed { count += 1 }
            }
        }
        return count
    }

    var canStartGame: Bool {
        placedTilesCount == 33 || looseTiles.count <= 1
    }

    func startFromScratch() {
        let scratch = GameConstants.createScratchBoardSetup()
        setupGrid = scratch.grid
        looseTiles = scratch.looseTiles
        spareTile = scratch.spareTile
        selectedLooseTileId = nil
        resetGameSession()
        showToast("Board cleared! Start placing tiles from scratch.")
    }

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
        if let last = pool.last { spareTile = last }
        resetGameSession()
        showToast("Remaining slots filled randomly! ✨")
    }

    func randomizeBoard() {
        let randomized = GameConstants.randomizeFullBoard()
        board = randomized.grid
        spareTile = randomized.spareTile
        looseTiles = [randomized.spareTile]
        setupGrid = nil
        selectedLooseTileId = nil
        resetGameSession()
        refreshReachable()
        showToast("Board layout randomized ✨")
    }

    func resetBoardLayout() {
        let fresh = GameConstants.createStandardFullBoard()
        board = fresh.grid
        spareTile = fresh.spareTile
        looseTiles = [fresh.spareTile]
        setupGrid = nil
        selectedLooseTileId = nil
        stagedSolverMove = nil
        solverOptions.removeAll()
        refreshReachable()
        showToast("Board layout reset to standard ↺")
    }

    func selectLooseTile(id: String) {
        if selectedLooseTileId == id {
            if let idx = looseTiles.firstIndex(where: { $0.id == id }) {
                looseTiles[idx].rotation = looseTiles[idx].rotation.nextClockwise
            }
        } else {
            selectedLooseTileId = id
        }
    }

    func tapSetupCell(row: Int, col: Int) {
        var grid = displaySetupGrid
        if let existing = grid[row][col], existing.isFixed {
            showToast("Fixed corner & T-junction tiles cannot be changed!")
            return
        }

        if var existing = grid[row][col] {
            if let selectedId = selectedLooseTileId, let looseIdx = looseTiles.firstIndex(where: { $0.id == selectedId }) {
                let looseTile = looseTiles.remove(at: looseIdx)
                grid[row][col] = looseTile
                looseTiles.append(existing)
                selectedLooseTileId = nil
                Haptics.selection()
                SoundManager.shared.play(.slideIn, enabled: enableSound)
            } else {
                // Tapping an existing tile on the board ROTATES it 90° clockwise!
                existing.rotation = existing.rotation.nextClockwise
                grid[row][col] = existing
                Haptics.selection()
                SoundManager.shared.play(.rotateTile, enabled: enableSound)
            }
        } else {
            if let selectedId = selectedLooseTileId, let looseIdx = looseTiles.firstIndex(where: { $0.id == selectedId }) {
                let looseTile = looseTiles.remove(at: looseIdx)
                grid[row][col] = looseTile
                selectedLooseTileId = nil
                Haptics.selection()
                SoundManager.shared.play(.slideIn, enabled: enableSound)
            } else if !looseTiles.isEmpty {
                let looseTile = looseTiles.removeFirst()
                grid[row][col] = looseTile
                Haptics.selection()
                SoundManager.shared.play(.slideIn, enabled: enableSound)
            }
        }

        setupGrid = grid
        if let last = looseTiles.last { spareTile = last }
        resetGameSession()
    }

    func removePlacedTile(row: Int, col: Int) {
        var grid = displaySetupGrid
        if let existing = grid[row][col], !existing.isFixed {
            grid[row][col] = nil
            looseTiles.append(existing)
            setupGrid = grid
            resetGameSession()
            Haptics.selection()
            showToast("Tile returned to pool")
        }
    }

    func resetBoard() {
        resetBoardLayout()
        pawnPositions = PawnPositions()
        currentPlayerIndex = 0
        turnPhase = .slide
        lastArrowId = nil
        stagedArrowId = nil
        projectedRoute = []
        undoStack.removeAll()
        redoStack.removeAll()
        moveCount = 0
        isGameStarted = false
    }

    func startGame() {
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
            if let last = pool.last { spareTile = last }
            setupGrid = nil
        }
        
        isGameStarted = true
        isSetupMode = false
        turnPhase = .slide
        moveCount = 0
        undoStack.removeAll()
        redoStack.removeAll()
        lastArrowId = nil
        stagedArrowId = nil
        stagedSolverMove = nil
        solverOptions.removeAll()
        refreshReachable()
        resetTimer()
        startTimer()
        showToast("Board ready! Solver initialized.")
    }

    // MARK: - Solver Target
    func setActiveTarget(treasureId: String) {
        activeTargetId = treasureId
        stagedSolverMove = nil
        solverOptions.removeAll()
        
        // Find position of this treasure on current board grid
        for r in 0..<7 {
            for c in 0..<7 {
                if board[r][c].treasure?.id == treasureId {
                    activeTargetPosition = PawnPosition(row: r, col: c)
                    return
                }
            }
        }
    }

    func setActiveTargetPosition(_ pos: PawnPosition) {
        activeTargetPosition = pos
        activeTargetId = board[pos.row][pos.col].treasure?.id
        stagedSolverMove = nil
        solverOptions.removeAll()
    }

    func clearActiveTarget() {
        activeTargetId = nil
        activeTargetPosition = nil
        stagedSolverMove = nil
        solverOptions.removeAll()
    }

    // MARK: - Solver
    func runSolverAndStage() {
        guard !isSolving else { return }
        isSolving = true

        let board = self.board
        let spareTile = self.spareTile
        let myColor = self.myColor
        let targetId = self.activeTargetId
        let targetPos = self.activeTargetPosition
        let positions = self.pawnPositions
        let lastArrow = self.lastArrowId
        let depth = self.solverDepth
        
        Task.detached(priority: .userInitiated) { [weak self] in
            let options = SolverEngine.findBestMoves(
                grid: board,
                spareTile: spareTile,
                activePawn: myColor,
                targetTreasureId: targetId,
                targetPosition: targetPos,
                pawnPositions: positions,
                lastArrowId: lastArrow,
                depth: depth,
                limit: 5
            )
            await MainActor.run { [weak self] in
                guard let self else { return }
                self.isSolving = false
                self.solverOptions = options
                if let move = options.first {
                    self.stageSolverOption(move)
                    Haptics.notification(.success)
                } else {
                    Haptics.notification(.error)
                    self.showToast("Solver could not find a valid route.")
                }
            }
        }
    }

    func showToast(_ message: String) {
        toastMessage = message
        toastTask?.cancel()
        toastTask = Task { [weak self] in
            try? await Task.sleep(for: .seconds(2.5))
            guard !Task.isCancelled else { return }
            self?.toastMessage = nil
        }
    }

    var previewState: (grid: [[TileData]], reachable: Set<PawnPositionKey>, pawns: PawnPositions)? {
        guard let arrowId = stagedArrowId else { return nil }
        var rotatedSpare = spareTile
        rotatedSpare.rotation = stagedRotation
        let (previewGrid, _, previewPawns) = SolverEngine.simulateSlide(
            grid: board, spareTile: rotatedSpare, arrowId: arrowId, pawnPositions: pawnPositions
        )
        let reachable = SolverEngine.findReachablePositions(grid: previewGrid, start: previewPawns[myColor])
        return (previewGrid, reachable, previewPawns)
    }
}
