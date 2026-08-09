import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Arrow Button (Liquid Glass Directional Controls)

struct ArrowButton: View {
    let arrowId: String
    let systemImage: String
    let isAllowed: Bool
    let isStaged: Bool
    let onTap: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Button(action: {
            if isAllowed {
                Haptics.impact(.light)
                onTap()
            } else {
                Haptics.notification(.warning)
            }
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(isStaged ? AnyShapeStyle(Color.accentColor.opacity(0.85)) : AnyShapeStyle(.ultraThinMaterial))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(
                                isStaged ? Color.white.opacity(0.6) : Color.white.opacity(colorScheme == .dark ? 0.1 : 0.5),
                                lineWidth: isStaged ? 1.5 : 1
                            )
                    )
                    .shadow(color: isStaged ? Color.accentColor.opacity(0.6) : .black.opacity(0.08), radius: isStaged ? 6 : 2, y: 1)
                    .opacity(isAllowed ? 1.0 : 0.3)

                Image(systemName: systemImage)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(
                        isStaged ? .white : (isAllowed ? .primary : .secondary)
                    )
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .disabled(!isAllowed)
        .scaleEffect(isStaged ? 1.1 : 1.0)
        .animation(.spring(response: 0.25, dampingFraction: 0.7), value: isStaged)
    }
}

// MARK: - Spare Cell (Interactive corner slot)

struct SpareCell: View {
    let tile: TileData
    var size: CGFloat
    let onTap: () -> Void

    var body: some View {
        Button(action: {
            Haptics.selection()
            onTap()
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 10, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay(
                        RoundedRectangle(cornerRadius: 10, style: .continuous)
                            .strokeBorder(Color.amberGold.opacity(0.5), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                    )

                TileView(tile: tile)
                    .padding(3)
            }
            .frame(width: size, height: size)
        }
    }
}

// MARK: - Labyrinth Board View

struct LabyrinthBoardView: View {
    @Bindable var vm: GameViewModel
    @Environment(\.colorScheme) private var colorScheme

    private let arrowSize: CGFloat = 34
    private let gap: CGFloat = 3

    var body: some View {
        GeometryReader { geo in
            let totalWidth  = geo.size.width
            let totalHeight = geo.size.height
            let totalSize   = min(totalWidth, totalHeight)

            // tileSize: fit 9 slots (7 tiles + 2 arrow margin slots) into totalSize
            let tileSize = (totalSize - arrowSize * 2 - gap * 8) / 7.0

            ZStack {
                // Board Backplate Container (Tactile Frame)
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(colorScheme == .dark ? Color.boardBg : Color(red: 0.90, green: 0.92, blue: 0.96))
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .strokeBorder(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.35), Color.black.opacity(0.20)],
                                    startPoint: .topLeading, endPoint: .bottomTrailing
                                ),
                                lineWidth: 1.5
                            )
                    )
                    .shadow(color: .black.opacity(0.40), radius: 18, x: 0, y: 8)

                VStack(spacing: gap) {
                    topArrowRow(tileSize: tileSize)
                    HStack(spacing: gap) {
                        leftArrowCol(tileSize: tileSize)
                        boardGrid(tileSize: tileSize)
                        rightArrowCol(tileSize: tileSize)
                    }
                    bottomArrowRow(tileSize: tileSize)
                }
                .padding(8)
            }
            .frame(width: totalSize, height: totalSize)
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    // MARK: - Board Grid

    @ViewBuilder
    private func boardGrid(tileSize: CGFloat) -> some View {
        let preview = vm.previewState
        let displayBoard = preview?.grid ?? vm.board
        let currentReachable = preview?.reachable ?? vm.reachablePositions

        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                HStack(spacing: gap) {
                    ForEach(0..<7, id: \.self) { c in
                        let tile = displayBoard[r][c]
                        // Highlight if reachable during move phase, OR if reachable during a staged preview
                        let isReachable = (vm.turnPhase == .move || vm.stagedArrowId != nil) &&
                            currentReachable.contains(PawnPositionKey(row: r, col: c))
                        let isTarget = vm.activeTargetId != nil &&
                            tile.treasure?.id == vm.activeTargetId

                        ZStack {
                            TileView(
                                tile: tile,
                                isReachable: isReachable,
                                isCurrentTarget: isTarget
                            )

                            // Pawns on this cell
                            pawnsOn(row: r, col: c, tileSize: tileSize)
                        }
                        .frame(width: tileSize, height: tileSize)
                        .contentShape(Rectangle())
                        .onTapGesture { handleCellTap(r, c) }
                    }
                }
            }
        }
        .background(colorScheme == .dark ? Color.boardBg : Color(red: 0.85, green: 0.87, blue: 0.92))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
    }

    // MARK: - Pawns on tile

    @ViewBuilder
    private func pawnsOn(row: Int, col: Int, tileSize: CGFloat) -> some View {
        let pawnsHere = PawnColor.allCases.filter {
            vm.pawnPositions[$0].row == row && vm.pawnPositions[$0].col == col
        }
        if !pawnsHere.isEmpty {
            HStack(spacing: 1) {
                ForEach(pawnsHere, id: \.id) { pawn in
                    PawnToken(
                        color: pawn,
                        isActive: pawn == vm.activePawn,
                        size: tileSize * 0.40
                    )
                }
            }
        }
    }

    // MARK: - Arrow Rows / Columns

    @ViewBuilder
    private func topArrowRow(tileSize: CGFloat) -> some View {
        HStack(spacing: gap) {
            // Spare tile in corner
            SpareCell(tile: vm.spareTile, size: arrowSize, onTap: { vm.rotateSpareTile() })

            ForEach(0..<7, id: \.self) { c in
                if [1, 3, 5].contains(c) {
                    let arrowId = "top_\(c)"
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.down",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        onTap: { vm.stageOrRotateArrow(arrowId) }
                    )
                    .frame(width: tileSize, height: arrowSize)
                } else {
                    Spacer().frame(width: tileSize, height: arrowSize)
                }
            }

            Spacer().frame(width: arrowSize, height: arrowSize)
        }
    }

    @ViewBuilder
    private func bottomArrowRow(tileSize: CGFloat) -> some View {
        HStack(spacing: gap) {
            Spacer().frame(width: arrowSize, height: arrowSize)

            ForEach(0..<7, id: \.self) { c in
                if [1, 3, 5].contains(c) {
                    let arrowId = "bottom_\(c)"
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.up",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        onTap: { vm.stageOrRotateArrow(arrowId) }
                    )
                    .frame(width: tileSize, height: arrowSize)
                } else {
                    Spacer().frame(width: tileSize, height: arrowSize)
                }
            }

            Spacer().frame(width: arrowSize, height: arrowSize)
        }
    }

    @ViewBuilder
    private func leftArrowCol(tileSize: CGFloat) -> some View {
        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                if [1, 3, 5].contains(r) {
                    let arrowId = "left_\(r)"
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.right",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        onTap: { vm.stageOrRotateArrow(arrowId) }
                    )
                    .frame(width: arrowSize, height: tileSize)
                } else {
                    Spacer().frame(width: arrowSize, height: tileSize)
                }
            }
        }
        .frame(width: arrowSize)
    }

    @ViewBuilder
    private func rightArrowCol(tileSize: CGFloat) -> some View {
        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                if [1, 3, 5].contains(r) {
                    let arrowId = "right_\(r)"
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.left",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        onTap: { vm.stageOrRotateArrow(arrowId) }
                    )
                    .frame(width: arrowSize, height: tileSize)
                } else {
                    Spacer().frame(width: arrowSize, height: tileSize)
                }
            }
        }
        .frame(width: arrowSize)
    }

    // MARK: - Cell Tap Handler

    private func handleCellTap(_ r: Int, _ c: Int) {
        switch vm.turnPhase {
        case .slide:
            if let treasure = vm.board[r][c].treasure {
                Haptics.selection()
                vm.setActiveTarget(treasureId: treasure.id)
                vm.showToast("Target set to \(treasure.name)")
            } else {
                Haptics.notification(.warning)
                vm.showToast("Choose a treasure target or slide a tile.")
            }
        case .move:
            let didMove = vm.movePawn(to: r, col: c)
            if didMove {
                Haptics.impact(.medium)
            } else {
                Haptics.notification(.error)
            }
        }
    }
}
