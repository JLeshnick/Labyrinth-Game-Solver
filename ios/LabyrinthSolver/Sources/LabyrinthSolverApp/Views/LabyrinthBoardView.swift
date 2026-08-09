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

// MARK: - Spare Cell

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
                            .strokeBorder(Color.accentColor.opacity(0.5), style: StrokeStyle(lineWidth: 1.5, dash: [4, 3]))
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

            let tileSize = (totalSize - arrowSize * 2 - gap * 8) / 7.0

            ZStack {
                RoundedRectangle(cornerRadius: 22, style: .continuous)
                    .fill(Color.appTertiaryGroupedBg)
                    .overlay(
                        RoundedRectangle(cornerRadius: 22, style: .continuous)
                            .strokeBorder(
                                LinearGradient(
                                    colors: [Color.white.opacity(0.3), Color.clear],
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
                        let isReachable = currentReachable.contains(PawnPositionKey(row: r, col: c))
                        let isTarget = vm.activeTargetId != nil && tile.treasure?.id == vm.activeTargetId

                        ZStack {
                            TileView(
                                tile: tile,
                                isReachable: isReachable,
                                isCurrentTarget: isTarget
                            )
                        }
                        .frame(width: tileSize, height: tileSize)
                        .contentShape(Rectangle())
                        .onTapGesture { handleCellTap(r, c) }
                    }
                }
            }
        }
        .background(colorScheme == .dark ? Color.black : Color.appSystemGray4)
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay {
            if !vm.projectedRoute.isEmpty {
                RouteOverlayView(
                    route: vm.projectedRoute,
                    tileSize: tileSize,
                    gap: gap,
                    appAccentTheme: vm.appAccentTheme
                )
            }
            
            // Render all active pawns in an overlay so their position changes animate smoothly
            ForEach(vm.activePlayers, id: \.id) { pawn in
                let pos = vm.pawnPositions[pawn]
                PawnToken(color: pawn, isActive: pawn == vm.myColor, size: tileSize * 0.5)
                    .position(
                        x: CGFloat(pos.col) * (tileSize + gap) + tileSize / 2,
                        y: CGFloat(pos.row) * (tileSize + gap) + tileSize / 2
                    )
                    .animation(.easeInOut(duration: 0.15), value: pos)
            }
        }
    }

    // MARK: - Arrow Rows / Columns

    @ViewBuilder
    private func topArrowRow(tileSize: CGFloat) -> some View {
        HStack(spacing: gap) {
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
        if vm.turnPhase == .move {
            let didMove = vm.movePawn(to: r, col: c)
            if didMove {
                Haptics.impact(.soft)
                return
            }
        }
        // If not move phase or move was invalid, allow setting as target
        if let treasure = vm.board[r][c].treasure {
            Haptics.selection()
            vm.setActiveTarget(treasureId: treasure.id)
            vm.showToast("Target set to \(treasure.name)")
        } else {
            Haptics.notification(.warning)
            vm.showToast("Choose a treasure target or slide a tile.")
        }
    }
}

// MARK: - Route Overlay View

struct RouteOverlayView: View {
    let route: [PawnPosition]
    let tileSize: CGFloat
    let gap: CGFloat
    let appAccentTheme: AppAccentTheme
    
    @State private var dashPhase: CGFloat = 0
    
    var body: some View {
        RoutePathShape(route: route, tileSize: tileSize, gap: gap)
            .stroke(
                Color.accentForTheme(appAccentTheme),
                style: StrokeStyle(
                    lineWidth: max(4, tileSize * 0.1),
                    lineCap: .round,
                    lineJoin: .round,
                    dash: [tileSize * 0.25, tileSize * 0.25],
                    dashPhase: dashPhase
                )
            )
            .shadow(color: Color.accentForTheme(appAccentTheme).opacity(0.8), radius: 6)
            .allowsHitTesting(false)
            .onAppear {
                withAnimation(.linear(duration: 0.8).repeatForever(autoreverses: false)) {
                    dashPhase -= tileSize * 0.5
                }
            }
    }
}

struct RoutePathShape: Shape {
    let route: [PawnPosition]
    let tileSize: CGFloat
    let gap: CGFloat
    
    func path(in rect: CGRect) -> Path {
        var p = Path()
        guard route.count > 1 else { return p }
        p.move(to: point(for: route[0]))
        for i in 1..<route.count {
            p.addLine(to: point(for: route[i]))
        }
        return p
    }
    
    private func point(for pos: PawnPosition) -> CGPoint {
        CGPoint(
            x: CGFloat(pos.col) * (tileSize + gap) + tileSize / 2,
            y: CGFloat(pos.row) * (tileSize + gap) + tileSize / 2
        )
    }
}
