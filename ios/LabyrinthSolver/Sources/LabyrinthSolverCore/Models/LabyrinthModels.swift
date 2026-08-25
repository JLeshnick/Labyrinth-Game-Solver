import Foundation

// MARK: - Tile Shape

public enum TileShape: String, Codable, CaseIterable, Sendable {
    case straight = "straight"
    case corner = "corner"
    case tJunction = "t-junction"

    public var solverChar: Character {
        switch self {
        case .straight: return "I"
        case .corner: return "L"
        case .tJunction: return "T"
        }
    }
}

// MARK: - Game Mode

public enum GameMode: String, Codable, CaseIterable, Identifiable, Sendable {
    case standard = "standard"
    case coop = "coop"
    case auto = "auto"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .standard: return "Standard"
        case .coop:     return "Co-op"
        case .auto:     return "Auto"
        }
    }

    public var description: String {
        switch self {
        case .standard: return "Each player hunts their own cards independently"
        case .coop:     return "All players share a single treasure card pool"
        case .auto:     return "The AI solver plays turns automatically"
        }
    }

    public var iconName: String {
        switch self {
        case .standard: return "person.2.fill"
        case .coop:     return "hands.sparkles.fill"
        case .auto:     return "cpu.fill"
        }
    }
}

// MARK: - Setup Tab

public enum SetupTab: String, Codable, CaseIterable, Identifiable, Sendable {
    case tiles   = "tiles"
    case mode    = "mode"
    case players = "players"
    case cards   = "cards"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .tiles:   return "Tiles"
        case .mode:    return "Mode"
        case .players: return "Players"
        case .cards:   return "Cards"
        }
    }

    public var iconName: String {
        switch self {
        case .tiles:   return "square.grid.3x3.topleft.filled"
        case .mode:    return "compass.drawing"
        case .players: return "person.3.sequence.fill"
        case .cards:   return "sparkles.rectangle.stack.fill"
        }
    }
}

// MARK: - App Color Scheme & Accent Theme

public enum AppColorScheme: String, Codable, CaseIterable, Identifiable, Sendable {
    case system = "system"
    case light  = "light"
    case dark   = "dark"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .system: return "System Default"
        case .light:  return "Light Mode ☀️"
        case .dark:   return "Dark Mode 🌙"
        }
    }
}

public enum AppAccentTheme: String, Codable, CaseIterable, Identifiable, Sendable {
    case gold     = "gold"
    case sapphire = "sapphire"
    case emerald  = "emerald"
    case purple   = "purple"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .gold:     return "Amber Gold"
        case .sapphire: return "Sapphire Blue"
        case .emerald:  return "Emerald Green"
        case .purple:   return "Royal Purple"
        }
    }
}

// MARK: - Tile Rotation

public enum TileRotation: Int, Codable, CaseIterable, Sendable {
    case deg0 = 0
    case deg90 = 90
    case deg180 = 180
    case deg270 = 270

    public var solverIndex: Int {
        switch self {
        case .deg0: return 0
        case .deg90: return 1
        case .deg180: return 2
        case .deg270: return 3
        }
    }

    public var nextClockwise: TileRotation {
        switch self {
        case .deg0: return .deg90
        case .deg90: return .deg180
        case .deg180: return .deg270
        case .deg270: return .deg0
        }
    }
}

// MARK: - Pawn Color

public enum PawnColor: String, Codable, CaseIterable, Identifiable, Sendable {
    case red = "red"
    case blue = "blue"
    case green = "green"
    case yellow = "yellow"

    public var id: String { rawValue }

    /// Starting corner position on the 7×7 board (row, col) — matches web app constants.ts
    /// Red: (0,0), Blue: (6,6), Green: (6,0), Yellow: (0,6)
    public var startingPosition: PawnPosition {
        switch self {
        case .red:    return PawnPosition(row: 0, col: 0)
        case .blue:   return PawnPosition(row: 6, col: 6)
        case .green:  return PawnPosition(row: 6, col: 0)
        case .yellow: return PawnPosition(row: 0, col: 6)
        }
    }

    public var displayName: String { rawValue.capitalized }

    public var emoji: String {
        switch self {
        case .red:    return "🔴"
        case .blue:   return "🔵"
        case .green:  return "🟢"
        case .yellow: return "🟡"
        }
    }
}

// MARK: - Treasure

public struct Treasure: Codable, Equatable, Identifiable, Sendable, Hashable {
    public let id: String
    public let name: String
    public var shortName: String { name }

    public var emoji: String {
        switch id {
        case "book":        return "📖"
        case "coins":       return "🪙"
        case "map":         return "🗺️"
        case "crown":       return "👑"
        case "keys":        return "🗝️"
        case "skull":       return "💀"
        case "ring":        return "💍"
        case "chest":       return "📦"
        case "emerald":     return "💎"
        case "sword":       return "⚔️"
        case "menorah":     return "🕎"
        case "helmet":      return "⛑️"
        case "lizard":      return "🦎"
        case "moth":        return "🦋"
        case "owl":         return "🦉"
        case "scarab":      return "🪲"
        case "rat":         return "🐀"
        case "spider":      return "🕷️"
        case "bat":         return "🦇"
        case "dragon":      return "🐉"
        case "ghost_bottle": return "🧞"
        case "ghost_waving": return "👻"
        case "lady_pig":    return "🐷"
        case "sorceress":   return "🧙"
        default:            return "⭐"
        }
    }

    public init(id: String, name: String) {
        self.id = id
        self.name = name
    }
}

// MARK: - Tile Data

public struct TileData: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public var shape: TileShape
    public var treasure: Treasure?
    public var isFixed: Bool
    public var color: PawnColor?    // For starting corner tiles
    public var rotation: TileRotation

    public init(
        id: String = UUID().uuidString,
        shape: TileShape,
        treasure: Treasure? = nil,
        isFixed: Bool = false,
        color: PawnColor? = nil,
        rotation: TileRotation = .deg0
    ) {
        self.id = id
        self.shape = shape
        self.treasure = treasure
        self.isFixed = isFixed
        self.color = color
        self.rotation = rotation
    }
}

// MARK: - Pawn Position

public struct PawnPosition: Codable, Equatable, Sendable, Hashable {
    public var row: Int
    public var col: Int

    public init(row: Int, col: Int) {
        self.row = row
        self.col = col
    }
}

// MARK: - Pawn Position Key (for Set membership)

public struct PawnPositionKey: Hashable, Sendable {
    public let row: Int
    public let col: Int

    public init(_ pos: PawnPosition) {
        self.row = pos.row
        self.col = pos.col
    }

    public init(row: Int, col: Int) {
        self.row = row
        self.col = col
    }
}

// MARK: - Pawn Positions

public struct PawnPositions: Codable, Equatable, Sendable {
    public var red: PawnPosition
    public var blue: PawnPosition
    public var green: PawnPosition
    public var yellow: PawnPosition

    public init(
        red: PawnPosition    = PawnPosition(row: 0, col: 0),
        blue: PawnPosition   = PawnPosition(row: 6, col: 6),
        green: PawnPosition  = PawnPosition(row: 6, col: 0),
        yellow: PawnPosition = PawnPosition(row: 0, col: 6)
    ) {
        self.red    = red
        self.blue   = blue
        self.green  = green
        self.yellow = yellow
    }

    public subscript(color: PawnColor) -> PawnPosition {
        get {
            switch color {
            case .red:    return red
            case .blue:   return blue
            case .green:  return green
            case .yellow: return yellow
            }
        }
        set {
            switch color {
            case .red:    red    = newValue
            case .blue:   blue   = newValue
            case .green:  green  = newValue
            case .yellow: yellow = newValue
            }
        }
    }
}

// MARK: - Move Option

public struct MoveOption: Codable, Equatable, Sendable, Identifiable {
    public var id: String {
        "\(arrowId)_\(tileRotation.rawValue)_\(targetPosition.row)_\(targetPosition.col)"
    }
    public let arrowId: String
    public let tileRotation: TileRotation
    public let targetPosition: PawnPosition
    public let reachableTreasures: [String]
    public let distanceToTarget: Int
    public let isTargetReached: Bool
    public let turnsToTarget: Int
    public let reachableCount: Int
    public let safetyScore: Int
    public let summaryText: String

    public init(
        arrowId: String,
        tileRotation: TileRotation,
        targetPosition: PawnPosition,
        reachableTreasures: [String],
        distanceToTarget: Int,
        isTargetReached: Bool,
        turnsToTarget: Int = 1,
        reachableCount: Int = 0,
        safetyScore: Int = 0,
        summaryText: String
    ) {
        self.arrowId           = arrowId
        self.tileRotation      = tileRotation
        self.targetPosition    = targetPosition
        self.reachableTreasures = reachableTreasures
        self.distanceToTarget  = distanceToTarget
        self.isTargetReached   = isTargetReached
        self.turnsToTarget     = turnsToTarget
        self.reachableCount    = reachableCount
        self.safetyScore       = safetyScore
        self.summaryText       = summaryText
    }
}

// MARK: - Turn Phase

public enum TurnPhase: String, Codable, Sendable {
    case slide  // Player must slide a row/column first
    case move   // Player must move their pawn
}

// MARK: - History Entry (for Undo/Redo)

public struct HistoryEntry: Sendable {
    public let board: [[TileData]]
    public let spareTile: TileData
    public let pawnPositions: PawnPositions
    public let lastArrowId: String?
    public let currentPlayerIndex: Int
    public let activePlayers: [PawnColor]
    public let turnPhase: TurnPhase

    public init(
        board: [[TileData]],
        spareTile: TileData,
        pawnPositions: PawnPositions,
        lastArrowId: String?,
        currentPlayerIndex: Int = 0,
        activePlayers: [PawnColor] = PawnColor.allCases,
        turnPhase: TurnPhase = .slide
    ) {
        self.board              = board
        self.spareTile          = spareTile
        self.pawnPositions      = pawnPositions
        self.lastArrowId        = lastArrowId
        self.currentPlayerIndex = currentPlayerIndex
        self.activePlayers      = activePlayers
        self.turnPhase          = turnPhase
    }
}

// MARK: - Player Hand (Treasure Card Management)

public struct PlayerHand: Codable, Sendable {
    public var cards: [String]           // Treasure IDs in the player's hand
    public var obtainedCards: [String]   // IDs of treasures already collected

    public init(cards: [String] = [], obtainedCards: [String] = []) {
        self.cards         = cards
        self.obtainedCards = obtainedCards
    }

    public var currentTarget: String? { cards.first(where: { !obtainedCards.contains($0) }) }
    public var remainingCount: Int { cards.filter({ !obtainedCards.contains($0) }).count }
}
