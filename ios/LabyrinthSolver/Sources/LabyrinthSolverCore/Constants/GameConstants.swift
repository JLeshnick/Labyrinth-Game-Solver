import Foundation

/// Single source of truth for board layout — matches web app `constants.ts` exactly.
/// The board uses (row, col) coordinates where row 0 is the top and col 0 is the left.
/// Fixed tiles are at positions where BOTH row and col are even (0, 2, 4, 6).
public struct GameConstants {
    public static let boardSize = 7

    // MARK: - 24 Official Treasures

    public static let treasures: [Treasure] = [
        // ── Fixed T-Junction Treasures (12, indices 0–11) ──
        Treasure(id: "book",    name: "Book"),
        Treasure(id: "coins",   name: "Coins"),
        Treasure(id: "map",     name: "Map"),
        Treasure(id: "crown",   name: "Crown"),
        Treasure(id: "keys",    name: "Keys"),
        Treasure(id: "skull",   name: "Skull"),
        Treasure(id: "ring",    name: "Ring"),
        Treasure(id: "chest",   name: "Chest"),
        Treasure(id: "emerald", name: "Jewel"),
        Treasure(id: "sword",   name: "Sword"),
        Treasure(id: "menorah", name: "Menorah"),
        Treasure(id: "helmet",  name: "Helmet"),

        // ── Movable Corner Treasures (6, indices 12–17) ──
        Treasure(id: "lizard",  name: "Lizard"),
        Treasure(id: "moth",    name: "Moth"),
        Treasure(id: "owl",     name: "Owl"),
        Treasure(id: "scarab",  name: "Scarab"),
        Treasure(id: "rat",     name: "Rat"),
        Treasure(id: "spider",  name: "Spider"),

        // ── Movable Straight/T-Junction Treasures (6, indices 18–23) ──
        Treasure(id: "bat",          name: "Bat"),
        Treasure(id: "dragon",       name: "Dragon"),
        Treasure(id: "ghost_bottle", name: "Genie"),
        Treasure(id: "ghost_waving", name: "Ghost"),
        Treasure(id: "lady_pig",     name: "Lady Pig"),
        Treasure(id: "sorceress",    name: "Witch"),
    ]

    // MARK: - Board State Container

    public struct InitialBoardState {
        public var grid: [[TileData]]
        public var spareTile: TileData

        public init(grid: [[TileData]], spareTile: TileData) {
            self.grid      = grid
            self.spareTile = spareTile
        }
    }

    // MARK: - Standard Board Setup

    /// Creates the standard Ravensburger Labyrinth board layout, matching the web app exactly.
    /// Fixed tile coordinates use (row, col) format:
    ///   - Corner pawns: (0,0)=Red, (6,6)=Blue, (6,0)=Green, (0,6)=Yellow
    ///   - T-junctions along even-indexed positions with their canonical treasures
    ///   - 33 movable tiles fill the remaining spaces; 1 tile becomes the spare
    public static func createStandardFullBoard() -> InitialBoardState {
        // 7×7 optional grid to hold fixed tiles
        var fixedGrid: [[TileData?]] = Array(repeating: Array(repeating: nil, count: boardSize), count: boardSize)

        // ── 4 Corner Pawns (row, col) ──
        // Matches GEMINI.md: Red=(0,0), Blue=(6,6), Green=(6,0), Yellow=(0,6)
        fixedGrid[0][0] = TileData(id: "fixed_0_0", shape: .corner, isFixed: true, color: .red,    rotation: .deg90)
        fixedGrid[6][6] = TileData(id: "fixed_6_6", shape: .corner, isFixed: true, color: .blue,   rotation: .deg270)
        fixedGrid[6][0] = TileData(id: "fixed_6_0", shape: .corner, isFixed: true, color: .green,  rotation: .deg0)
        fixedGrid[0][6] = TileData(id: "fixed_0_6", shape: .corner, isFixed: true, color: .yellow, rotation: .deg180)

        // ── 12 Fixed T-Junctions (matching web constants.ts exactly) ──
        // Column 0 (left edge)
        fixedGrid[2][0] = TileData(id: "fixed_2_0", shape: .tJunction, treasure: treasures[0],  isFixed: true, rotation: .deg180)  // Book
        fixedGrid[4][0] = TileData(id: "fixed_4_0", shape: .tJunction, treasure: treasures[1],  isFixed: true, rotation: .deg180)  // Coins

        // Column 2
        fixedGrid[0][2] = TileData(id: "fixed_0_2", shape: .tJunction, treasure: treasures[2],  isFixed: true, rotation: .deg90)   // Map
        fixedGrid[2][2] = TileData(id: "fixed_2_2", shape: .tJunction, treasure: treasures[3],  isFixed: true, rotation: .deg90)   // Crown
        fixedGrid[4][2] = TileData(id: "fixed_4_2", shape: .tJunction, treasure: treasures[4],  isFixed: true, rotation: .deg180)  // Keys
        fixedGrid[6][2] = TileData(id: "fixed_6_2", shape: .tJunction, treasure: treasures[5],  isFixed: true, rotation: .deg270)  // Skull

        // Column 4
        fixedGrid[0][4] = TileData(id: "fixed_0_4", shape: .tJunction, treasure: treasures[6],  isFixed: true, rotation: .deg90)   // Ring
        fixedGrid[2][4] = TileData(id: "fixed_2_4", shape: .tJunction, treasure: treasures[7],  isFixed: true, rotation: .deg0)    // Chest
        fixedGrid[4][4] = TileData(id: "fixed_4_4", shape: .tJunction, treasure: treasures[8],  isFixed: true, rotation: .deg270)  // Jewel
        fixedGrid[6][4] = TileData(id: "fixed_6_4", shape: .tJunction, treasure: treasures[9],  isFixed: true, rotation: .deg270)  // Sword

        // Column 6 (right edge)
        fixedGrid[2][6] = TileData(id: "fixed_2_6", shape: .tJunction, treasure: treasures[10], isFixed: true, rotation: .deg0)    // Menorah
        fixedGrid[4][6] = TileData(id: "fixed_4_6", shape: .tJunction, treasure: treasures[11], isFixed: true, rotation: .deg0)    // Helmet

        // ── Movable Pool (34 tiles: 33 on board + 1 spare) ──
        // Composition: 12 corners, 12 straights, 10 T-junctions (all movable)
        var movablePool: [TileData] = []

        // 6 Corner tiles with creature treasures (lizard, moth, owl, scarab, rat, spider)
        for i in 0..<6 {
            movablePool.append(TileData(
                id: "movable_corner_t_\(i)",
                shape: .corner,
                treasure: treasures[12 + i],
                isFixed: false,
                rotation: .deg0
            ))
        }

        // 6 Plain corner tiles
        for i in 0..<6 {
            movablePool.append(TileData(
                id: "movable_corner_\(i)",
                shape: .corner,
                isFixed: false,
                rotation: .deg90
            ))
        }

        // 6 Straight tiles with creature treasures (bat, dragon, genie, ghost, lady pig, witch)
        for i in 0..<6 {
            movablePool.append(TileData(
                id: "movable_straight_t_\(i)",
                shape: .straight,
                treasure: treasures[18 + i],
                isFixed: false,
                rotation: .deg0
            ))
        }

        // 6 Plain straight tiles
        for i in 0..<6 {
            movablePool.append(TileData(
                id: "movable_straight_\(i)",
                shape: .straight,
                isFixed: false,
                rotation: .deg90
            ))
        }

        // 10 Plain T-junction tiles
        for i in 0..<10 {
            movablePool.append(TileData(
                id: "movable_t_\(i)",
                shape: .tJunction,
                isFixed: false,
                rotation: .deg0
            ))
        }

        // Fill the 33 non-fixed positions in reading order, then spare = pool[33]
        var fullGrid: [[TileData]] = []
        var poolIndex = 0

        for r in 0..<boardSize {
            var row: [TileData] = []
            for c in 0..<boardSize {
                if let fixed = fixedGrid[r][c] {
                    row.append(fixed)
                } else {
                    row.append(movablePool[poolIndex])
                    poolIndex += 1
                }
            }
            fullGrid.append(row)
        }

        let spare = movablePool[poolIndex]   // The 34th movable tile is the spare

        return InitialBoardState(grid: fullGrid, spareTile: spare)
    }

    /// Generates the standard 34 movable tiles pool (12 corners, 12 straights, 10 T-junctions).
    public static func createMovablePool() -> [TileData] {
        var pool: [TileData] = []
        for i in 0..<6 {
            pool.append(TileData(id: "movable_corner_t_\(i)", shape: .corner, treasure: treasures[12 + i], isFixed: false, rotation: .deg0))
        }
        for i in 0..<6 {
            pool.append(TileData(id: "movable_corner_\(i)", shape: .corner, isFixed: false, rotation: .deg90))
        }
        for i in 0..<6 {
            pool.append(TileData(id: "movable_straight_t_\(i)", shape: .straight, treasure: treasures[18 + i], isFixed: false, rotation: .deg0))
        }
        for i in 0..<6 {
            pool.append(TileData(id: "movable_straight_\(i)", shape: .straight, isFixed: false, rotation: .deg90))
        }
        for i in 0..<10 {
            pool.append(TileData(id: "movable_t_\(i)", shape: .tJunction, isFixed: false, rotation: .deg0))
        }
        return pool
    }

    /// Randomly shuffles and rotates the 33 movable tiles on the board plus 1 spare tile.
    public static func randomizeFullBoard() -> InitialBoardState {
        var fixedGrid: [[TileData?]] = Array(repeating: Array(repeating: nil, count: boardSize), count: boardSize)

        fixedGrid[0][0] = TileData(id: "fixed_0_0", shape: .corner, isFixed: true, color: .red,    rotation: .deg90)
        fixedGrid[6][6] = TileData(id: "fixed_6_6", shape: .corner, isFixed: true, color: .blue,   rotation: .deg270)
        fixedGrid[6][0] = TileData(id: "fixed_6_0", shape: .corner, isFixed: true, color: .green,  rotation: .deg0)
        fixedGrid[0][6] = TileData(id: "fixed_0_6", shape: .corner, isFixed: true, color: .yellow, rotation: .deg180)

        fixedGrid[2][0] = TileData(id: "fixed_2_0", shape: .tJunction, treasure: treasures[0],  isFixed: true, rotation: .deg180)
        fixedGrid[4][0] = TileData(id: "fixed_4_0", shape: .tJunction, treasure: treasures[1],  isFixed: true, rotation: .deg180)
        fixedGrid[0][2] = TileData(id: "fixed_0_2", shape: .tJunction, treasure: treasures[2],  isFixed: true, rotation: .deg90)
        fixedGrid[2][2] = TileData(id: "fixed_2_2", shape: .tJunction, treasure: treasures[3],  isFixed: true, rotation: .deg90)
        fixedGrid[4][2] = TileData(id: "fixed_4_2", shape: .tJunction, treasure: treasures[4],  isFixed: true, rotation: .deg180)
        fixedGrid[6][2] = TileData(id: "fixed_6_2", shape: .tJunction, treasure: treasures[5],  isFixed: true, rotation: .deg270)
        fixedGrid[0][4] = TileData(id: "fixed_0_4", shape: .tJunction, treasure: treasures[6],  isFixed: true, rotation: .deg90)
        fixedGrid[2][4] = TileData(id: "fixed_2_4", shape: .tJunction, treasure: treasures[7],  isFixed: true, rotation: .deg0)
        fixedGrid[4][4] = TileData(id: "fixed_4_4", shape: .tJunction, treasure: treasures[8],  isFixed: true, rotation: .deg270)
        fixedGrid[6][4] = TileData(id: "fixed_6_4", shape: .tJunction, treasure: treasures[9],  isFixed: true, rotation: .deg270)
        fixedGrid[2][6] = TileData(id: "fixed_2_6", shape: .tJunction, treasure: treasures[10], isFixed: true, rotation: .deg0)
        fixedGrid[4][6] = TileData(id: "fixed_4_6", shape: .tJunction, treasure: treasures[11], isFixed: true, rotation: .deg0)

        var shuffledPool = createMovablePool().shuffled()
        let rotations: [TileRotation] = [.deg0, .deg90, .deg180, .deg270]

        for i in 0..<shuffledPool.count {
            shuffledPool[i].rotation = rotations.randomElement() ?? .deg0
        }

        var fullGrid: [[TileData]] = []
        var poolIndex = 0

        for r in 0..<boardSize {
            var row: [TileData] = []
            for c in 0..<boardSize {
                if let fixed = fixedGrid[r][c] {
                    row.append(fixed)
                } else {
                    row.append(shuffledPool[poolIndex])
                    poolIndex += 1
                }
            }
            fullGrid.append(row)
        }

        let spare = shuffledPool[poolIndex]
        return InitialBoardState(grid: fullGrid, spareTile: spare)
    }

    /// Container for scratch board setup (empty movable grid + full movable pool)
    public struct ScratchBoardState {
        public var grid: [[TileData?]]
        public var looseTiles: [TileData]
        public var spareTile: TileData

        public init(grid: [[TileData?]], looseTiles: [TileData], spareTile: TileData) {
            self.grid = grid
            self.looseTiles = looseTiles
            self.spareTile = spareTile
        }
    }

    /// Creates a scratch board setup: 16 fixed tiles on grid, 33 empty movable slots (nil), and all 34 movable tiles in looseTiles.
    public static func createScratchBoardSetup() -> ScratchBoardState {
        var scratchGrid: [[TileData?]] = Array(repeating: Array(repeating: nil, count: boardSize), count: boardSize)

        scratchGrid[0][0] = TileData(id: "fixed_0_0", shape: .corner, isFixed: true, color: .red,    rotation: .deg90)
        scratchGrid[6][6] = TileData(id: "fixed_6_6", shape: .corner, isFixed: true, color: .blue,   rotation: .deg270)
        scratchGrid[6][0] = TileData(id: "fixed_6_0", shape: .corner, isFixed: true, color: .green,  rotation: .deg0)
        scratchGrid[0][6] = TileData(id: "fixed_0_6", shape: .corner, isFixed: true, color: .yellow, rotation: .deg180)

        scratchGrid[2][0] = TileData(id: "fixed_2_0", shape: .tJunction, treasure: treasures[0],  isFixed: true, rotation: .deg180)
        scratchGrid[4][0] = TileData(id: "fixed_4_0", shape: .tJunction, treasure: treasures[1],  isFixed: true, rotation: .deg180)
        scratchGrid[0][2] = TileData(id: "fixed_0_2", shape: .tJunction, treasure: treasures[2],  isFixed: true, rotation: .deg90)
        scratchGrid[2][2] = TileData(id: "fixed_2_2", shape: .tJunction, treasure: treasures[3],  isFixed: true, rotation: .deg90)
        scratchGrid[4][2] = TileData(id: "fixed_4_2", shape: .tJunction, treasure: treasures[4],  isFixed: true, rotation: .deg180)
        scratchGrid[6][2] = TileData(id: "fixed_6_2", shape: .tJunction, treasure: treasures[5],  isFixed: true, rotation: .deg270)
        scratchGrid[0][4] = TileData(id: "fixed_0_4", shape: .tJunction, treasure: treasures[6],  isFixed: true, rotation: .deg90)
        scratchGrid[2][4] = TileData(id: "fixed_2_4", shape: .tJunction, treasure: treasures[7],  isFixed: true, rotation: .deg0)
        scratchGrid[4][4] = TileData(id: "fixed_4_4", shape: .tJunction, treasure: treasures[8],  isFixed: true, rotation: .deg270)
        scratchGrid[6][4] = TileData(id: "fixed_6_4", shape: .tJunction, treasure: treasures[9],  isFixed: true, rotation: .deg270)
        scratchGrid[2][6] = TileData(id: "fixed_2_6", shape: .tJunction, treasure: treasures[10], isFixed: true, rotation: .deg0)
        scratchGrid[4][6] = TileData(id: "fixed_4_6", shape: .tJunction, treasure: treasures[11], isFixed: true, rotation: .deg0)

        let pool = createMovablePool()
        let spare = pool.last ?? TileData(shape: .straight, isFixed: false)
        return ScratchBoardState(grid: scratchGrid, looseTiles: pool, spareTile: spare)
    }

    // MARK: - Arrow IDs

    /// All valid slide arrow identifiers.
    /// Format: "<side>_<index>" where side ∈ {top,bottom,left,right} and index ∈ {1,3,5}
    public static let validArrowIds: [String] = [
        "top_1", "top_3", "top_5",
        "bottom_1", "bottom_3", "bottom_5",
        "left_1", "left_3", "left_5",
        "right_1", "right_3", "right_5",
    ]

    /// Returns the "opposite" arrow ID to restrict a repeat-reverse slide.
    public static func oppositeArrowId(for arrowId: String) -> String? {
        let parts = arrowId.split(separator: "_")
        guard parts.count == 2, let idx = Int(parts[1]) else { return nil }
        let side = String(parts[0])
        let opposite: String
        switch side {
        case "top":    opposite = "bottom"
        case "bottom": opposite = "top"
        case "left":   opposite = "right"
        case "right":  opposite = "left"
        default:       return nil
        }
        return "\(opposite)_\(idx)"
    }

    // MARK: - Default Treasure Card Hands

    /// Generate a balanced deal of 6 cards per player from the 24 treasures.
    public static func dealDefaultHands() -> [PawnColor: PlayerHand] {
        var hands: [PawnColor: PlayerHand] = [:]
        let allIds = treasures.map { $0.id }
        let shuffled = allIds.shuffled()
        let perPlayer = 6
        for (i, color) in PawnColor.allCases.enumerated() {
            let start = i * perPlayer
            let end   = min(start + perPlayer, shuffled.count)
            hands[color] = PlayerHand(cards: Array(shuffled[start..<end]))
        }
        return hands
    }
}
