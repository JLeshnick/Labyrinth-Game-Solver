import SwiftUI
import UniformTypeIdentifiers
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Board Setup View (Modern Native iOS Setup Screen)

struct BoardSetupView: View {
    @Bindable var vm: GameViewModel
    let onStartGame: () -> Void

    @State private var showSettingsSheet = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.appGroupedBg
                .ignoresSafeArea()

            VStack(spacing: 0) {
                setupHeaderCard
                    .padding(.horizontal, 16)
                    .padding(.top, 12)
                    .padding(.bottom, 8)

                ScrollView(showsIndicators: false) {
                    VStack(spacing: 16) {
                        actionToolbar
                        SetupBoardGridView(vm: vm)
                            .frame(maxWidth: .infinity, alignment: .center)
                            .padding(.horizontal, 16)
                        LooseTilesPoolView(vm: vm)
                            .padding(.horizontal, 16)
                    }
                    .padding(.bottom, 80)
                }
            }

            // Settings button floating at bottom
            Button(action: { showSettingsSheet = true }) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.white)
                    .frame(width: 54, height: 54)
                    .background(Color.accentColor, in: Circle())
                    .shadow(color: Color.accentColor.opacity(0.4), radius: 8, y: 4)
            }
            .padding(.bottom, 16)
        }
        .sheet(isPresented: $showSettingsSheet) {
            SettingsView(vm: vm, onSetup: {}, onShowWelcome: {})
        }
    }

    // MARK: - Top Header & Wizard Card
    private var setupHeaderCard: some View {
        VStack(spacing: 12) {
            HStack(alignment: .center, spacing: 10) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Board Builder")
                        .font(.system(size: 22, weight: .heavy, design: .rounded))
                        .foregroundColor(.primary)

                    let statusText = vm.canStartGame ? "Ready! All movable tiles placed." : "Drag tiles or use auto-fill."
                    Text(statusText)
                        .font(.system(size: 13, design: .rounded))
                        .foregroundColor(.secondary)
                }

                Spacer()

                // Tile count indicator
                statusCapsule
            }

            startGameButton
        }
        .padding(16)
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
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(.primary)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.appTertiaryGroupedBg)
        .clipShape(Capsule())
    }

    private var startGameButton: some View {
        let btnText = vm.placedTilesCount < 33 ? "Auto-Fill & Start Solving" : "Start Solving"
        return Button(action: {
            if vm.placedTilesCount < 33 {
                vm.fillRemainingRandomly()
            }
            vm.startGame()
            onStartGame()
        }) {
            HStack(spacing: 8) {
                Image(systemName: "sparkles")
                    .font(.system(size: 16, weight: .bold))
                Text(btnText)
                    .font(.system(size: 16, weight: .bold, design: .rounded))
            }
            .frame(maxWidth: .infinity, minHeight: 48)
            .background(Color.accentColor)
            .foregroundColor(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .shadow(color: Color.accentColor.opacity(0.35), radius: 6, y: 3)
        }
    }

    // MARK: - Action Toolbar
    private var actionToolbar: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                Button(action: { vm.startFromScratch() }) {
                    Label("Clear Board", systemImage: "trash")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.red.opacity(0.12))
                        .foregroundColor(.red)
                        .clipShape(Capsule())
                }

                Button(action: { vm.randomizeBoard() }) {
                    Label("Randomize", systemImage: "shuffle")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.accentColor.opacity(0.15))
                        .foregroundColor(Color.accentColor)
                        .clipShape(Capsule())
                }

                Button(action: { vm.resetBoardLayout() }) {
                    Label("Standard Board", systemImage: "arrow.counterclockwise")
                        .font(.system(size: 13, weight: .semibold, design: .rounded))
                        .padding(.horizontal, 14)
                        .padding(.vertical, 10)
                        .background(Color.appSecondaryGroupedBg)
                        .foregroundColor(.primary)
                        .clipShape(Capsule())
                }
            }
            .padding(.horizontal, 16)
        }
    }
}

// MARK: - Setup Board Grid View

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
                            SetupGridCellView(
                                vm: vm, row: r, col: c, tile: grid[r][c], tileSize: tileSize
                            )
                        }
                    }
                }
            }
            .padding(4)
            .background(Color.black.opacity(0.8))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
            .frame(width: size, height: size)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
    }
}

struct SetupGridCellView: View {
    @Bindable var vm: GameViewModel
    let row: Int
    let col: Int
    let tile: TileData?
    let tileSize: CGFloat

    @State private var isTargeted: Bool = false

    var body: some View {
        ZStack {
            if let tile = tile {
                ZStack {
                    TileView(tile: tile)
                    if !tile.isFixed {
                        VStack {
                            HStack {
                                Spacer()
                                Button(action: { vm.tapSetupCell(row: row, col: col) }) {
                                    Image(systemName: "rotate.right")
                                        .font(.system(size: tileSize * 0.22, weight: .black))
                                        .foregroundColor(.white)
                                        .padding(3)
                                        .background(Circle().fill(Color.accentColor))
                                        .shadow(color: .black.opacity(0.4), radius: 2)
                                }
                            }
                            Spacer()
                        }
                        .padding(2)
                    }
                }
                .onDrag {
                    if !tile.isFixed {
                        vm.selectLooseTile(id: tile.id)
                        return NSItemProvider(object: tile.id as NSString)
                    }
                    return NSItemProvider()
                }
            } else {
                emptySlotPlaceholder
            }

            if isTargeted {
                RoundedRectangle(cornerRadius: tileSize * 0.14)
                    .fill(Color.accentColor.opacity(0.35))
                    .overlay(
                        RoundedRectangle(cornerRadius: tileSize * 0.14)
                            .strokeBorder(Color.accentColor, lineWidth: 2.5)
                    )
            }
        }
        .frame(width: tileSize, height: tileSize)
        .contentShape(Rectangle())
        .onTapGesture { vm.tapSetupCell(row: row, col: col) }
        .onDrop(of: [.text], isTargeted: $isTargeted) { providers in
            if let provider = providers.first {
                _ = provider.loadObject(ofClass: String.self) { id, _ in
                    if let tileId = id {
                        DispatchQueue.main.async {
                            vm.selectLooseTile(id: tileId)
                            vm.tapSetupCell(row: row, col: col)
                        }
                    }
                }
                return true
            }
            return false
        }
    }

    private var emptySlotPlaceholder: some View {
        RoundedRectangle(cornerRadius: tileSize * 0.14)
            .fill(Color.appSecondaryGroupedBg)
            .overlay(
                RoundedRectangle(cornerRadius: tileSize * 0.14)
                    .strokeBorder(Color.secondary.opacity(0.4), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
            )
            .overlay(
                Image(systemName: "plus")
                    .font(.system(size: tileSize * 0.25, weight: .bold))
                    .foregroundColor(Color.accentColor.opacity(0.5))
            )
    }
}

// MARK: - Loose Tiles Pool

struct LooseTilesPoolView: View {
    @Bindable var vm: GameViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Tile Pool")
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)

                Spacer()

                if vm.looseTiles.isEmpty {
                    Text("All placed!")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundColor(.green)
                } else {
                    Text("\(vm.looseTiles.count) remaining")
                        .font(.system(size: 12, design: .rounded))
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
                                    .frame(width: 50, height: 50)

                                if isSelected {
                                    RoundedRectangle(cornerRadius: 8)
                                        .strokeBorder(Color.accentColor, lineWidth: 3)
                                    Image(systemName: "rotate.right.circle.fill")
                                        .font(.system(size: 16))
                                        .foregroundColor(Color.accentColor)
                                        .background(Circle().fill(Color.white))
                                        .offset(x: 16, y: -16)
                                }
                            }
                        }
                        .onDrag {
                            vm.selectLooseTile(id: tile.id)
                            return NSItemProvider(object: tile.id as NSString)
                        }
                    }

                    if vm.looseTiles.isEmpty {
                        Text("All 33 movable tiles placed! Ready to solve.")
                            .font(.system(size: 13, weight: .medium, design: .rounded))
                            .foregroundColor(.green)
                            .padding(.vertical, 8)
                    }
                }
                .padding(.horizontal, 2)
            }
        }
        .padding(16)
        .background(Color.appSecondaryGroupedBg)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}
