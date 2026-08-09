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
    var isExpelled: Bool = false
    let onTap: () -> Void

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Button(action: {
            if isAllowed {
                Haptics.selection()
                onTap()
            } else {
                Haptics.notification(.warning)
            }
        }) {
            ZStack {
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .fill(
                        isStaged ? AnyShapeStyle(Color.accentColor.opacity(0.90)) :
                        isExpelled ? AnyShapeStyle(Color.orange.opacity(0.85)) :
                        AnyShapeStyle(.ultraThinMaterial)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                            .strokeBorder(
                                isStaged ? Color.white : (isExpelled ? Color.orange : Color.white.opacity(colorScheme == .dark ? 0.1 : 0.4)),
                                lineWidth: (isStaged || isExpelled) ? 2 : 1
                            )
                    )
                    .shadow(
                        color: isStaged ? Color.accentColor.opacity(0.6) : (isExpelled ? Color.orange.opacity(0.6) : .black.opacity(0.05)),
                        radius: (isStaged || isExpelled) ? 6 : 2,
                        y: 1
                    )
                    .opacity(isAllowed ? 1.0 : 0.35)

                if isExpelled {
                    Image(systemName: "arrow.up.right.circle.fill")
                        .font(.system(size: 15, weight: .black))
                        .foregroundColor(.white)
                } else {
                    Image(systemName: systemImage)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(isStaged ? .white : (isAllowed ? .primary : .secondary))
                }
            }
        }
        .buttonStyle(.plain)
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

        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                HStack(spacing: gap) {
                    ForEach(0..<7, id: \.self) { c in
                        let tile = displayBoard[r][c]
                        let isTarget: Bool = {
                            if let targetId = vm.activeTargetId {
                                return tile.treasure?.id == targetId
                            } else if let origTargetPos = vm.activeTargetPosition {
                                if let stagedArrow = vm.stagedArrowId {
                                    let shiftedTargetPos = SolverEngine.shiftedPosition(of: origTargetPos, under: stagedArrow)
                                    return PawnPosition(row: r, col: c) == shiftedTargetPos
                                } else {
                                    return PawnPosition(row: r, col: c) == origTargetPos
                                }
                            }
                            return false
                        }()

                        let isObtained = tile.treasure.map { vm.obtainedTreasureIds.contains($0.id) } ?? false
                        let posKey = PawnPositionKey(row: r, col: c)
                        let isPreviewing = preview != nil
                        let isReachable = isPreviewing ? false : vm.reachablePositions.contains(posKey)
                        let isOneTurn = isPreviewing ? false : vm.oneTurnReachablePositions.contains(posKey)

                        ZStack {
                            TileView(
                                tile: tile,
                                isReachable: isReachable,
                                isOneTurnReachable: isOneTurn,
                                isCurrentTarget: isTarget,
                                isObtained: isObtained
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
            
            // Render all active pawns with multi-pawn offset fan-out
            ForEach(vm.activePlayers, id: \.id) { pawn in
                let pos = vm.pawnPositions[pawn]
                let offset = pawnOffset(for: pawn, tileSize: tileSize)
                let coCount = vm.activePlayers.filter { vm.pawnPositions[$0] == pos }.count
                let pawnSize = coCount > 1 ? tileSize * 0.42 : tileSize * 0.5

                PawnToken(color: pawn, isActive: pawn == vm.myColor, size: pawnSize)
                    .position(
                        x: CGFloat(pos.col) * (tileSize + gap) + tileSize / 2 + offset.x,
                        y: CGFloat(pos.row) * (tileSize + gap) + tileSize / 2 + offset.y
                    )
                    .animation(.easeInOut(duration: 0.15), value: pos)
            }
        }
    }

    private func pawnOffset(for pawn: PawnColor, tileSize: CGFloat) -> CGPoint {
        let pos = vm.pawnPositions[pawn]
        let coOccupants = vm.activePlayers.filter { vm.pawnPositions[$0] == pos }
        guard coOccupants.count > 1, let index = coOccupants.firstIndex(of: pawn) else {
            return .zero
        }
        let delta = tileSize * 0.18
        switch coOccupants.count {
        case 2:
            return index == 0 ? CGPoint(x: -delta, y: -delta * 0.5) : CGPoint(x: delta, y: delta * 0.5)
        case 3:
            switch index {
            case 0:  return CGPoint(x: -delta, y: -delta * 0.8)
            case 1:  return CGPoint(x: delta, y: -delta * 0.8)
            default: return CGPoint(x: 0, y: delta * 0.8)
            }
        default:
            switch index {
            case 0:  return CGPoint(x: -delta, y: -delta)
            case 1:  return CGPoint(x: delta, y: -delta)
            case 2:  return CGPoint(x: -delta, y: delta)
            default: return CGPoint(x: delta, y: delta)
            }
        }
    }

    // MARK: - Arrow Rows / Columns

    @ViewBuilder
    private func topArrowRow(tileSize: CGFloat) -> some View {
        HStack(spacing: gap) {
            Spacer().frame(width: arrowSize, height: arrowSize)

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
        let expelledId = vm.stagedArrowId.flatMap { GameConstants.oppositeArrowId(for: $0) }
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
                        isExpelled: expelledId == arrowId,
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
        let expelledId = vm.stagedArrowId.flatMap { GameConstants.oppositeArrowId(for: $0) }
        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                if [1, 3, 5].contains(r) {
                    let arrowId = "left_\(r)"
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.right",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        isExpelled: expelledId == arrowId,
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
        let expelledId = vm.stagedArrowId.flatMap { GameConstants.oppositeArrowId(for: $0) }
        VStack(spacing: gap) {
            ForEach(0..<7, id: \.self) { r in
                if [1, 3, 5].contains(r) {
                    let arrowId = "right_\(r)"
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.left",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        isExpelled: expelledId == arrowId,
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
        // Allow setting ANY tile (treasure or blank corridor) on the board as target destination!
        Haptics.selection()
        vm.setActiveTargetPosition(PawnPosition(row: r, col: c))
        if let treasure = vm.board[r][c].treasure {
            vm.showToast("Target set to \(treasure.name)")
        } else {
            vm.showToast("Target set to tile (\(r + 1), \(c + 1))")
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
