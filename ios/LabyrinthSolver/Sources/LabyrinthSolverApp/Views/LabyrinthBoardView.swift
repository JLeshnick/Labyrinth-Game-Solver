import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Arrow Button

struct ArrowButton: View {
    let arrowId: String
    let systemImage: String
    let isAllowed: Bool
    let isStaged: Bool
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            ZStack {
                RoundedRectangle(cornerRadius: 8)
                    .fill(isStaged
                          ? Color.amber
                          : isAllowed
                            ? Color.white.opacity(0.10)
                            : Color.clear)
                    .frame(width: 32, height: 32)

                Image(systemName: systemImage)
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(
                        isStaged ? .black :
                        isAllowed ? Color.amber : Color.white.opacity(0.12)
                    )
            }
        }
        .disabled(!isAllowed)
        .scaleEffect(isStaged ? 1.10 : 1.0)
        .animation(.spring(response: 0.2), value: isStaged)
    }
}

// MARK: - Spare Cell (shows the spare tile in the top-left corner of arrow layout)

struct SpareCell: View {
    let tile: TileData
    var size: CGFloat

    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.white.opacity(0.04))
                .overlay(
                    RoundedRectangle(cornerRadius: 8)
                        .strokeBorder(Color.amber.opacity(0.3), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
                )

            TileView(tile: tile)
                .padding(3)
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Labyrinth Board View

struct LabyrinthBoardView: View {
    @Bindable var vm: GameViewModel

    // Slide animation state
    @State private var slideOffset: CGSize = .zero
    @State private var animatingArrow: String? = nil

    private let arrowSize: CGFloat = 32
    private let gap: CGFloat = 3

    var body: some View {
        GeometryReader { geo in
            let totalWidth  = geo.size.width
            let totalHeight = geo.size.height
            let totalSize   = min(totalWidth, totalHeight)

            // tileSize: fit 9 slots (7 tiles + 2 arrows) into totalSize
            let tileSize = (totalSize - arrowSize * 2 - gap * 8) / 7.0

            ZStack {
                // Drop shadow backdrop
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.boardBg)
                    .shadow(color: .black.opacity(0.6), radius: 16, y: 6)

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
        let displayBoard = vm.previewBoard ?? vm.board

        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                HStack(spacing: gap) {
                    ForEach(0..<7, id: \.self) { c in
                        let tile = displayBoard[r][c]
                        let isReachable = vm.turnPhase == .move &&
                            vm.reachablePositions.contains(PawnPositionKey(row: r, col: c))
                        let isTarget = vm.activeTargetId != nil &&
                            tile.treasure?.id == vm.activeTargetId

                        ZStack {
                            TileView(
                                tile: tile,
                                isReachable: isReachable,
                                isCurrentTarget: isTarget
                            )

                            // Pawn overlay
                            pawnsOn(row: r, col: c, tileSize: tileSize)
                        }
                        .frame(width: tileSize, height: tileSize)
                        .contentShape(Rectangle())
                        .onTapGesture { handleCellTap(r, c) }
                    }
                }
            }
        }
        .background(Color.boardBg)
        .clipShape(RoundedRectangle(cornerRadius: 8))
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
                        size: tileSize * 0.38
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
            SpareCell(tile: vm.spareTile, size: arrowSize)

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
                    .frame(width: tileSize)
                } else {
                    Spacer().frame(width: tileSize, height: arrowSize)
                }
            }

            // Empty corner
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
                    .frame(width: tileSize)
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
                    .frame(height: tileSize)
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
                    .frame(height: tileSize)
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
            // Nothing — use arrow buttons to slide
            break
        case .move:
            let didMove = vm.movePawn(to: r, col: c)
            if !didMove {
                // Light haptic to indicate non-reachable tap
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
            }
        }
    }
}
