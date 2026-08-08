import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Board Setup View (Modern Native iOS Setup Screen)

struct BoardSetupView: View {
    @Bindable var vm: GameViewModel
    let onStartGame: () -> Void

    @Namespace private var setupTabNamespace

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.appGroupedBg
                .ignoresSafeArea()

            VStack(spacing: 0) {
                setupHeaderCard
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                ZStack {
                    switch vm.setupTab {
                    case .tiles:   tilesSetupTab
                    case .mode:    modeSetupTab
                    case .players: playersSetupTab
                    case .cards:   cardsSetupTab
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.horizontal, 16)

                Spacer(minLength: 72)
            }

            floatingBottomTabBar
                .padding(.horizontal, 20)
                .padding(.bottom, 10)
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: vm.setupTab)
    }

    // MARK: - Top Header & Wizard Card
    private var setupHeaderCard: some View {
        VStack(spacing: 12) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Board Layout & Game Setup")
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)

                    let statusText = vm.canStartGame ? "Ready to play! All 33 movable tiles placed." : "Place remaining movable tiles on the board."
                    Text(statusText)
                        .font(.system(size: 12, design: .rounded))
                        .foregroundColor(.secondary)
                }

                Spacer()

                statusCapsule
            }

            startGameButton
        }
        .padding(14)
        .background(Color.appSecondaryGroupedBg)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var statusCapsule: some View {
        let isReady = vm.canStartGame
        let countText = "\(vm.placedTilesCount)/33"
        return HStack(spacing: 6) {
            Circle()
                .fill(isReady ? Color.green : Color.orange)
                .frame(width: 8, height: 8)

            Text(countText)
                .font(.system(size: 12, weight: .bold, design: .monospaced))
                .foregroundColor(.primary)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 6)
        .background(Color.appTertiaryGroupedBg)
        .clipShape(Capsule())
    }

    private var startGameButton: some View {
        let btnText = vm.placedTilesCount < 33 ? "Auto-Fill & Start Game" : "Start Game"
        return Button(action: {
            vm.startGame()
            onStartGame()
        }) {
            HStack(spacing: 8) {
                Image(systemName: "play.fill")
                    .font(.system(size: 15, weight: .bold))
                Text(btnText)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
            }
            .frame(maxWidth: .infinity, minHeight: 46)
            .background(Color.accentColor)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: Color.accentColor.opacity(0.3), radius: 6, y: 3)
        }
    }

    // MARK: - Floating Liquid Navigation Bar
    private var floatingBottomTabBar: some View {
        HStack(spacing: 4) {
            ForEach(SetupTab.allCases) { tab in
                let isSelected = vm.setupTab == tab
                let isDisabled = tab == .cards && (vm.gameMode == .coop || vm.gameMode == .auto)

                Button(action: {
                    if !isDisabled {
                        vm.setupTab = tab
                    }
                }) {
                    VStack(spacing: 3) {
                        Image(systemName: tab.iconName)
                            .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                        Text(tab.displayName)
                            .font(.system(size: 10, weight: isSelected ? .bold : .medium, design: .rounded))
                    }
                    .frame(maxWidth: .infinity, minHeight: 48)
                    .foregroundColor(
                        isDisabled ? Color.secondary.opacity(0.3) :
                        isSelected ? Color.primary : Color.secondary
                    )
                    .background(
                        ZStack {
                            if isSelected {
                                RoundedRectangle(cornerRadius: 22, style: .continuous)
                                    .fill(.thinMaterial)
                                    .shadow(color: Color.black.opacity(0.12), radius: 4, y: 2)
                                    .matchedGeometryEffect(id: "liquidSetupTab", in: setupTabNamespace)
                            }
                        }
                    )
                }
                .disabled(isDisabled)
            }
        }
        .padding(4)
        .background(.ultraThinMaterial, in: Capsule())
        .shadow(color: Color.black.opacity(0.25), radius: 16, y: 6)
    }

    // MARK: - Tiles Setup Tab
    private var tilesSetupTab: some View {
        VStack(spacing: 10) {
            actionToolbar
            SetupBoardGridView(vm: vm)
            LooseTilesPoolView(vm: vm)
        }
    }

    private var actionToolbar: some View {
        let randomizeLabel = vm.placedTilesCount < 33 ? "Fill Remaining" : "Randomize All"
        return ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button(action: { vm.startFromScratch() }) {
                    Label("Clear (From Scratch)", systemImage: "square.dashed")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.red.opacity(0.12))
                        .foregroundColor(.red)
                        .clipShape(Capsule())
                }

                Button(action: {
                    if vm.placedTilesCount < 33 {
                        vm.fillRemainingRandomly()
                    } else {
                        vm.randomizeBoard()
                    }
                }) {
                    Label(randomizeLabel, systemImage: "sparkles")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.accentColor.opacity(0.15))
                        .foregroundColor(Color.accentColor)
                        .clipShape(Capsule())
                }

                Button(action: { vm.resetBoardLayout() }) {
                    Label("Standard Layout", systemImage: "arrow.counterclockwise")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.appTertiaryGroupedBg)
                        .foregroundColor(.primary)
                        .clipShape(Capsule())
                }

                Button(action: { vm.resetAllDefaults() }) {
                    Label("Reset Defaults", systemImage: "trash")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(Color.appTertiaryGroupedBg)
                        .foregroundColor(.secondary)
                        .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Mode Setup Tab
    private var modeSetupTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("GAME MODE")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)
                    .padding(.leading, 4)

                VStack(spacing: 0) {
                    ForEach(Array(GameMode.allCases.enumerated()), id: \.element.id) { index, mode in
                        let isSelected = vm.gameMode == mode
                        Button(action: {
                            vm.gameMode = mode
                            vm.showToast("Game mode set to \(mode.displayName)")
                        }) {
                            HStack(spacing: 14) {
                                Image(systemName: mode.iconName)
                                    .font(.system(size: 20, weight: .semibold))
                                    .foregroundColor(isSelected ? Color.accentColor : .secondary)
                                    .frame(width: 32)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(mode.displayName)
                                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                                        .foregroundColor(.primary)

                                    Text(mode.description)
                                        .font(.system(size: 12, design: .rounded))
                                        .foregroundColor(.secondary)
                                        .multilineTextAlignment(.leading)
                                }

                                Spacer()

                                if isSelected {
                                    Image(systemName: "checkmark")
                                        .font(.system(size: 14, weight: .bold))
                                        .foregroundColor(Color.accentColor)
                                }
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 14)
                        }

                        if index < GameMode.allCases.count - 1 {
                            Divider()
                                .padding(.leading, 62)
                        }
                    }
                }
                .background(Color.appSecondaryGroupedBg)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Players Setup Tab
    private var playersSetupTab: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                Text("PARTICIPATING PLAYERS")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)
                    .padding(.leading, 4)

                VStack(spacing: 0) {
                    ForEach(Array(PawnColor.allCases.enumerated()), id: \.element.id) { index, pawn in
                        let isActive = vm.activePlayers.contains(pawn)
                        HStack(spacing: 14) {
                            PawnToken(color: pawn, isActive: isActive, size: 28)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(pawn.displayName)
                                    .font(.system(size: 16, weight: .semibold, design: .rounded))
                                    .foregroundColor(.primary)

                                Text("Home Corner (\(pawn.startingPosition.row),\(pawn.startingPosition.col))")
                                    .font(.system(size: 12, design: .monospaced))
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            Toggle("", isOn: Binding(
                                get: { isActive },
                                set: { _ in vm.togglePlayerActive(pawn) }
                            ))
                            .labelsHidden()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)

                        if index < PawnColor.allCases.count - 1 {
                            Divider()
                                .padding(.leading, 58)
                        }
                    }
                }
                .background(Color.appSecondaryGroupedBg)
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            }
            .padding(.top, 4)
        }
    }

    // MARK: - Cards Setup Tab
    private var cardsSetupTab: some View {
        VStack(spacing: 12) {
            playerPawnSelectorRow
            playerHandSummaryCard
            treasureCardsGrid
        }
    }

    private var playerPawnSelectorRow: some View {
        HStack(spacing: 8) {
            ForEach(vm.activePlayers) { pawn in
                let isSelected = vm.activePawn == pawn
                Button(action: { vm.activePawn = pawn }) {
                    HStack(spacing: 6) {
                        PawnToken(color: pawn, isActive: isSelected, size: 18)
                        Text(pawn.displayName)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                    }
                    .frame(maxWidth: .infinity, minHeight: 36)
                    .background(isSelected ? Color.appSecondaryGroupedBg : Color.clear)
                    .foregroundColor(isSelected ? .primary : .secondary)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
            }
        }
        .padding(4)
        .background(Color.appTertiaryGroupedBg)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    private var playerHandSummaryCard: some View {
        let hand = vm.playerHands[vm.activePawn]?.cards ?? []
        return VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("\(vm.activePawn.displayName)'s Hand (\(hand.count) cards)")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)

                Spacer()

                Button("Add All") { vm.addAllCardsToPlayerHand(pawn: vm.activePawn) }
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(Color.accentColor)

                Text("•")
                    .foregroundColor(.secondary)

                Button("Clear") { vm.clearPlayerHand(pawn: vm.activePawn) }
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.red)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 6) {
                    ForEach(hand, id: \.self) { cardId in
                        let treasure = GameConstants.treasures.first(where: { $0.id == cardId })
                        HStack(spacing: 6) {
                            Text(treasure?.emoji ?? "⭐")
                                .font(.system(size: 14))
                            Text(treasure?.name ?? cardId)
                                .font(.system(size: 12, weight: .semibold, design: .rounded))
                                .foregroundColor(.primary)
                            Button(action: { vm.removeCardFromPlayerHand(pawn: vm.activePawn, treasureId: cardId) }) {
                                Image(systemName: "xmark.circle.fill")
                                    .font(.system(size: 14))
                                    .foregroundColor(.secondary)
                            }
                        }
                        .padding(.horizontal, 10)
                        .padding(.vertical, 6)
                        .background(Color.appTertiaryGroupedBg)
                        .clipShape(Capsule())
                    }
                    if hand.isEmpty {
                        Text("No cards assigned — tap treasures below to add.")
                            .font(.system(size: 12, design: .rounded))
                            .foregroundColor(.secondary)
                            .padding(.vertical, 4)
                    }
                }
            }
        }
        .padding(14)
        .background(Color.appSecondaryGroupedBg)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }

    private var treasureCardsGrid: some View {
        let hand = vm.playerHands[vm.activePawn]?.cards ?? []
        return ScrollView {
            LazyVGrid(columns: [GridItem(.adaptive(minimum: 100), spacing: 8)], spacing: 8) {
                ForEach(GameConstants.treasures) { t in
                    let inHand = hand.contains(t.id)
                    let assignedOther = vm.playerHands.contains(where: { $0.key != vm.activePawn && $0.value.cards.contains(t.id) })

                    Button(action: {
                        if inHand {
                            vm.removeCardFromPlayerHand(pawn: vm.activePawn, treasureId: t.id)
                        } else if !assignedOther {
                            vm.addCardToPlayerHand(pawn: vm.activePawn, treasureId: t.id)
                        }
                    }) {
                        VStack(spacing: 4) {
                            Text(t.emoji)
                                .font(.system(size: 22))
                            Text(t.name)
                                .font(.system(size: 11, weight: .semibold, design: .rounded))
                                .lineLimit(1)
                                .foregroundColor(inHand ? .white : assignedOther ? Color.secondary.opacity(0.4) : .primary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 56)
                        .background(
                            inHand ? Color.accentColor :
                            assignedOther ? Color.appTertiaryGroupedBg.opacity(0.5) :
                            Color.appSecondaryGroupedBg
                        )
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .disabled(assignedOther)
                }
            }
            .padding(.vertical, 4)
        }
    }
}

// MARK: - Setup Board Grid View (Interactive 7x7 Grid supporting Start From Scratch)

struct SetupBoardGridView: View {
    @Bindable var vm: GameViewModel

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let gap: CGFloat = 3
            let tileSize = (size - gap * 6) / 7.0
            let grid = vm.displaySetupGrid

            VStack(spacing: gap) {
                ForEach(0..<7, id: \.self) { r in
                    HStack(spacing: gap) {
                        ForEach(0..<7, id: \.self) { c in
                            let maybeTile = grid[r][c]

                            ZStack {
                                if let tile = maybeTile {
                                    TileView(tile: tile)
                                } else {
                                    // Empty slot placeholder (Start from scratch)
                                    emptySlotPlaceholder(tileSize: tileSize)
                                }
                            }
                            .frame(width: tileSize, height: tileSize)
                            .contentShape(Rectangle())
                            .onTapGesture {
                                vm.tapSetupCell(row: r, col: c)
                            }
                        }
                    }
                }
            }
            .padding(4)
            .background(Color.boardBg)
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .frame(width: size, height: size)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private func emptySlotPlaceholder(tileSize: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: tileSize * 0.14)
            .fill(Color.appSecondaryGroupedBg)
            .overlay(
                RoundedRectangle(cornerRadius: tileSize * 0.14)
                    .strokeBorder(Color.secondary.opacity(0.4), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
            )
            .overlay(
                VStack(spacing: 2) {
                    Image(systemName: "plus")
                        .font(.system(size: tileSize * 0.28, weight: .bold))
                        .foregroundColor(Color.accentColor)
                    Text("Place")
                        .font(.system(size: tileSize * 0.16, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                }
            )
    }
}

// MARK: - Loose Tiles Pool Drawer

struct LooseTilesPoolView: View {
    @Bindable var vm: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Movable Tiles Pool (\(vm.looseTiles.count) remaining)")
                    .font(.system(size: 12, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)

                Spacer()

                if vm.looseTiles.isEmpty {
                    Text("All placed!")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.green)
                } else {
                    Text("Tap to select tile")
                        .font(.system(size: 11, design: .rounded))
                        .foregroundColor(.secondary)
                }
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(vm.looseTiles) { tile in
                        let isSelected = vm.selectedLooseTileId == tile.id
                        Button(action: { vm.selectLooseTile(id: tile.id) }) {
                            ZStack {
                                TileView(tile: tile)
                                    .frame(width: 44, height: 44)

                                if isSelected {
                                    RoundedRectangle(cornerRadius: 8)
                                        .strokeBorder(Color.accentColor, lineWidth: 2.5)
                                    Image(systemName: "checkmark.circle.fill")
                                        .font(.system(size: 12))
                                        .foregroundColor(Color.accentColor)
                                        .background(Circle().fill(Color.white))
                                        .offset(x: 14, y: -14)
                                }
                            }
                        }
                    }

                    if vm.looseTiles.isEmpty {
                        Text("All 33 movable tiles placed! Tap Start Game to begin.")
                            .font(.system(size: 12, weight: .semibold, design: .rounded))
                            .foregroundColor(.green)
                            .padding(.vertical, 8)
                    }
                }
                .padding(.horizontal, 2)
            }
        }
        .padding(12)
        .background(Color.appSecondaryGroupedBg)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
