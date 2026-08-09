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
    var expelledTile: TileData? = nil
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
                if isExpelled, let tile = expelledTile {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color.orange.opacity(0.20))
                        .overlay(
                            RoundedRectangle(cornerRadius: 10, style: .continuous)
                                .strokeBorder(Color.orange, lineWidth: 2)
                        )
                        .shadow(color: Color.orange.opacity(0.6), radius: 6)

                    TileView(tile: tile)
                        .padding(2)
                        .overlay(
                            Image(systemName: "arrow.up.right.circle.fill")
                                .font(.system(size: 13, weight: .black))
                                .foregroundColor(.orange)
                                .shadow(color: .black, radius: 3)
                                .padding(2),
                            alignment: .topTrailing
                        )
                } else {
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
                        .shadow(color: isStaged ? Color.accentColor.opacity(0.6) : (isExpelled ? Color.orange.opacity(0.6) : .black.opacity(0.05)),
                            radius: (isStaged || isExpelled) ? 6 : 2,
                            y: 1
                        )
                        .opacity(isAllowed ? 1.0 : 0.35)

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
                                    if let shiftedTargetPos = SolverEngine.shiftedPosition(of: origTargetPos, under: stagedArrow) {
                                        return PawnPosition(row: r, col: c) == shiftedTargetPos
                                    }
                                    return false
                                } else {
                                    return PawnPosition(row: r, col: c) == origTargetPos
                                }
                            }
                            return false
                        }()

                        let isObtained = tile.treasure.map { vm.obtainedTreasureIds.contains($0.id) } ?? false
                        let posKey = PawnPositionKey(row: r, col: c)
                        let isReachable = vm.reachablePositions.contains(posKey)
                        let isOneTurn = vm.oneTurnReachablePositions.contains(posKey)

                        let pawnsHere = vm.activePlayers.filter { vm.pawnPositions[$0].row == r && vm.pawnPositions[$0].col == c }

                        ZStack {
                            TileView(
                                tile: tile,
                                pawnColor: vm.myColor,
                                isReachable: isReachable,
                                isOneTurnReachable: isOneTurn,
                                isCurrentTarget: isTarget,
                                isObtained: isObtained,
                                treasureLabelStyle: vm.treasureLabelStyle,
                                pawnsOnTile: pawnsHere
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
                    pawnColor: vm.myColor,
                    appAccentTheme: vm.appAccentTheme
                )
            }
            
            // Render all active pawns with multi-pawn offset fan-out (using simulated preview positions when staging a move)
            let displayPawns = preview?.pawns ?? vm.pawnPositions
            ForEach(vm.activePlayers, id: \.id) { pawn in
                let pos = displayPawns[pawn]
                let offset = pawnOffset(for: pawn, positions: displayPawns, tileSize: tileSize)
                let coCount = vm.activePlayers.filter { displayPawns[$0] == pos }.count
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

    private func pawnOffset(for pawn: PawnColor, positions: PawnPositions, tileSize: CGFloat) -> CGPoint {
        let pos = positions[pawn]
        let coOccupants = vm.activePlayers.filter { positions[$0] == pos }
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
        let expelledId = vm.stagedArrowId.flatMap { GameConstants.oppositeArrowId(for: $0) }
        HStack(spacing: gap) {
            Spacer().frame(width: arrowSize, height: arrowSize)

            ForEach(0..<7, id: \.self) { c in
                if [1, 3, 5].contains(c) {
                    let arrowId = "top_\(c)"
                    let isExpelled = expelledId == arrowId
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.down",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        isExpelled: isExpelled,
                        expelledTile: isExpelled ? vm.previewState?.spareTile : nil,
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
                    let isExpelled = expelledId == arrowId
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.up",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        isExpelled: isExpelled,
                        expelledTile: isExpelled ? vm.previewState?.spareTile : nil,
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
                    let isExpelled = expelledId == arrowId
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.right",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        isExpelled: isExpelled,
                        expelledTile: isExpelled ? vm.previewState?.spareTile : nil,
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
                    let isExpelled = expelledId == arrowId
                    ArrowButton(
                        arrowId: arrowId,
                        systemImage: "chevron.left",
                        isAllowed: vm.isArrowAllowed(arrowId) && vm.turnPhase == .slide,
                        isStaged: vm.stagedArrowId == arrowId,
                        isExpelled: isExpelled,
                        expelledTile: isExpelled ? vm.previewState?.spareTile : nil,
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
        Haptics.selection()
        if vm.turnPhase == .move {
            let didMove = vm.movePawn(to: r, col: c)
            if didMove {
                Haptics.impact(.soft)
                return
            }
        }
        // Set target destination (supports both treasure and corridor tiles)
        vm.setActiveTargetPosition(PawnPosition(row: r, col: c))
    }
}

// MARK: - Route Overlay View

struct RouteOverlayView: View {
    let route: [PawnPosition]
    let tileSize: CGFloat
    let gap: CGFloat
    var pawnColor: PawnColor = .red
    let appAccentTheme: AppAccentTheme
    
    @State private var dashPhase: CGFloat = 0

    private var routeColor: Color {
        switch pawnColor {
        case .red:    return Color(red: 0.96, green: 0.26, blue: 0.26)
        case .blue:   return Color(red: 0.24, green: 0.55, blue: 0.98)
        case .green:  return Color(red: 0.22, green: 0.85, blue: 0.45)
        case .yellow: return Color(red: 0.98, green: 0.82, blue: 0.12)
        }
    }
    
    var body: some View {
        RoutePathShape(route: route, tileSize: tileSize, gap: gap)
            .stroke(
                routeColor,
                style: StrokeStyle(
                    lineWidth: max(4, tileSize * 0.12),
                    lineCap: .round,
                    lineJoin: .round,
                    dash: [tileSize * 0.25, tileSize * 0.25],
                    dashPhase: dashPhase
                )
            )
            .shadow(color: routeColor.opacity(0.85), radius: 6)
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
