import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Design Tokens

extension Color {
    static let amber        = Color(red: 0.96, green: 0.78, blue: 0.25)
    static let boardBg      = Color(red: 0.07, green: 0.08, blue: 0.11)
    static let tileBg       = Color(red: 0.17, green: 0.20, blue: 0.27)
    static let tileFixed    = Color(red: 0.12, green: 0.14, blue: 0.21)
}

// MARK: - Tile View

struct TileView: View {
    let tile: TileData
    var isReachable: Bool = false
    var isOneTurnReachable: Bool = false
    var isCurrentTarget: Bool = false
    var isStagedTarget: Bool = false
    var isObtained: Bool = false

    @State private var dashPhase: CGFloat = 0
    @Environment(\.colorScheme) private var colorScheme

    private func pawnColor(_ p: PawnColor) -> Color {
        switch p {
        case .red:    return Color(red: 0.96, green: 0.26, blue: 0.26)
        case .blue:   return Color(red: 0.24, green: 0.55, blue: 0.98)
        case .green:  return Color(red: 0.22, green: 0.85, blue: 0.45)
        case .yellow: return Color(red: 0.98, green: 0.82, blue: 0.12)
        }
    }

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let cornerRadius = size * 0.16

            ZStack {
                // Base Tile Card Background with bevel border & drop shadow
                tileCardBackground(size: size, cornerRadius: cornerRadius)

                // High Contrast 3D Pathway Canvas
                PathCanvas(shape: tile.shape, rotation: tile.rotation, size: size, isFixed: tile.isFixed)
                    .padding(size * 0.03)

                // 1-Turn Slide Reachable Highlight (continuous animated marching dashed neon emerald outline)
                if !isReachable && isOneTurnReachable {
                    TimelineView(.animation) { timeline in
                        let dashLength = size * 0.16
                        let gapLength = size * 0.12
                        let period = dashLength + gapLength
                        let time = timeline.date.timeIntervalSinceReferenceDate
                        let phase = CGFloat(time.truncatingRemainder(dividingBy: 1.5)) * (period / 1.5)

                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .strokeBorder(
                                Color.neonGreen.opacity(0.88),
                                style: StrokeStyle(
                                    lineWidth: max(2.2, size * 0.065),
                                    dash: [dashLength, gapLength],
                                    dashPhase: phase
                                )
                            )
                            .shadow(color: Color.neonGreen.opacity(0.45), radius: 4)
                    }
                }

                // Reachable Highlight Overlay (glowing neon emerald)
                if isReachable {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color.neonGreen.opacity(colorScheme == .dark ? 0.24 : 0.30))
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(Color.neonGreen, lineWidth: max(2.5, size * 0.07))
                        .shadow(color: Color.neonGreen.opacity(0.8), radius: 6)
                }

                // Current Target Treasure Highlight (pulsing golden starburst)
                if isCurrentTarget {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(
                            LinearGradient(
                                colors: [Color.amber, Color(red: 1.0, green: 0.9, blue: 0.4)],
                                startPoint: .topLeading, endPoint: .bottomTrailing
                            ),
                            lineWidth: max(3.0, size * 0.08)
                        )
                        .shadow(color: Color.amber.opacity(0.85), radius: 8)
                        .overlay(
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .fill(Color.amber.opacity(0.16))
                        )
                }

                // Staged Target Highlight
                if isStagedTarget {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color.blue.opacity(0.25))
                        .overlay(
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .strokeBorder(Color.blue, lineWidth: 2)
                        )
                }

                // Fixed Tile Golden Corner Lock & Emblem
                if tile.isFixed {
                    fixedTileBrackets(size: size)
                }

                // Starting Pawn Home Corner Dot
                if let pawn = tile.color {
                    VStack {
                        HStack {
                            Circle()
                                .fill(pawnColor(pawn))
                                .frame(width: size * 0.22, height: size * 0.22)
                                .overlay(Circle().strokeBorder(Color.white, lineWidth: 1.5))
                                .shadow(color: pawnColor(pawn).opacity(0.9), radius: 4)
                            Spacer()
                        }
                        Spacer()
                    }
                    .padding(size * 0.06)
                }

                // Treasure badge — tiny emoji in bottom-right corner so it never
                // obstructs corridor paths on any tile shape or rotation.
                // Full name shown only when this tile is the active gold target.
                if let treasure = tile.treasure {
                    VStack {
                        // Full name label floats at top-center ONLY when actively targeted,
                        // where the golden ring already draws attention to the tile shape.
                        if isCurrentTarget {
                            HStack(spacing: 2) {
                                Text(treasure.emoji)
                                    .font(.system(size: size * 0.13))
                                Text(treasure.shortName)
                                    .font(.system(size: size * 0.13, weight: .bold, design: .rounded))
                                    .foregroundColor(Color.amber)
                                    .lineLimit(1)
                                    .minimumScaleFactor(0.5)
                            }
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(Color.black.opacity(0.70), in: Capsule())
                            .shadow(color: Color.amber.opacity(0.8), radius: 6)
                            .padding(.top, size * 0.06)
                        }
                        Spacer()
                        // Small corner badge — always visible, never covers paths
                        HStack {
                            Spacer()
                            ZStack {
                                if isObtained {
                                    Circle()
                                        .fill(Color.green.opacity(0.85))
                                        .frame(width: size * 0.22, height: size * 0.22)
                                    Image(systemName: "checkmark")
                                        .font(.system(size: size * 0.11, weight: .black))
                                        .foregroundColor(.white)
                                } else {
                                    Text(treasure.emoji)
                                        .font(.system(size: size * 0.18))
                                        .opacity(isObtained ? 0.4 : 0.9)
                                }
                            }
                            .shadow(color: .black.opacity(0.5), radius: 2, y: 1)
                        }
                        .padding(.trailing, size * 0.05)
                        .padding(.bottom, size * 0.05)
                    }
                }

            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func tileCardBackground(size: CGFloat, cornerRadius: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(
                    colorScheme == .dark
                    ? LinearGradient(colors: [Color(white: 0.20), Color(white: 0.14)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    : LinearGradient(colors: [Color.white, Color(white: 0.96)], startPoint: .topLeading, endPoint: .bottomTrailing)
                )
                .shadow(color: .black.opacity(colorScheme == .dark ? 0.5 : 0.15), radius: 4, y: 2)

            // Glassy border highlight
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(
                    LinearGradient(
                        colors: [Color.white.opacity(colorScheme == .dark ? 0.15 : 0.8), Color.white.opacity(0.0)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ),
                    lineWidth: 1
                )
        }
    }

    private func fixedTileBrackets(size: CGFloat) -> some View {
        EmptyView() // Removed to declutter UI
    }
}

// MARK: - Path Canvas (Rich Tactile Corridors)

struct PathCanvas: View {
    let shape: TileShape
    let rotation: TileRotation
    let size: CGFloat
    var isFixed: Bool = false

    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        Canvas { context, cSize in
            let w = cSize.width
            let h = cSize.height
            let mid = CGPoint(x: w * 0.5, y: h * 0.5)
            let corridorWidth: CGFloat = w * 0.42

            var fillPath = Path()
            var strokePaths: [Path] = []

            switch shape {
            case .straight:
                let x0 = mid.x - corridorWidth * 0.5
                let x1 = mid.x + corridorWidth * 0.5
                fillPath.addRect(CGRect(x: x0, y: -4, width: corridorWidth, height: h + 8))
                var lp = Path(); lp.move(to: CGPoint(x: x0, y: -4)); lp.addLine(to: CGPoint(x: x0, y: h + 4))
                var rp = Path(); rp.move(to: CGPoint(x: x1, y: -4)); rp.addLine(to: CGPoint(x: x1, y: h + 4))
                strokePaths = [lp, rp]

            case .corner:
                let inR  = (w - corridorWidth) * 0.5
                let outR = inR + corridorWidth
                let arcCenter = CGPoint(x: w, y: 0)
                
                fillPath.move(to: CGPoint(x: mid.x - corridorWidth * 0.5, y: -4))
                fillPath.addLine(to: CGPoint(x: mid.x - corridorWidth * 0.5, y: 0))
                fillPath.addArc(center: arcCenter, radius: outR, startAngle: .degrees(180), endAngle: .degrees(90), clockwise: true)
                fillPath.addLine(to: CGPoint(x: w + 4, y: mid.y + corridorWidth * 0.5))
                
                fillPath.addLine(to: CGPoint(x: w + 4, y: mid.y - corridorWidth * 0.5))
                fillPath.addLine(to: CGPoint(x: w, y: mid.y - corridorWidth * 0.5))
                fillPath.addArc(center: arcCenter, radius: inR, startAngle: .degrees(90), endAngle: .degrees(180), clockwise: false)
                fillPath.addLine(to: CGPoint(x: mid.x + corridorWidth * 0.5, y: -4))
                fillPath.closeSubpath()

                var outerArc = Path()
                outerArc.move(to: CGPoint(x: mid.x - corridorWidth * 0.5, y: -4))
                outerArc.addLine(to: CGPoint(x: mid.x - corridorWidth * 0.5, y: 0))
                outerArc.addArc(center: arcCenter, radius: outR, startAngle: .degrees(180), endAngle: .degrees(90), clockwise: true)
                outerArc.addLine(to: CGPoint(x: w + 4, y: mid.y + corridorWidth * 0.5))

                var innerArc = Path()
                innerArc.move(to: CGPoint(x: mid.x + corridorWidth * 0.5, y: -4))
                innerArc.addLine(to: CGPoint(x: mid.x + corridorWidth * 0.5, y: 0))
                innerArc.addArc(center: arcCenter, radius: inR, startAngle: .degrees(180), endAngle: .degrees(90), clockwise: true)
                innerArc.addLine(to: CGPoint(x: w + 4, y: mid.y - corridorWidth * 0.5))
                
                strokePaths = [outerArc, innerArc]

            case .tJunction:
                let x0 = mid.x - corridorWidth * 0.5
                let x1 = mid.x + corridorWidth * 0.5
                let y0 = mid.y - corridorWidth * 0.5
                let y1 = mid.y + corridorWidth * 0.5
                
                // T-Junction opens Top, Left, Right. Bottom is closed.
                fillPath.move(to: CGPoint(x: -4, y: y0))
                fillPath.addLine(to: CGPoint(x: -4, y: y1))
                fillPath.addLine(to: CGPoint(x: w + 4, y: y1))
                fillPath.addLine(to: CGPoint(x: w + 4, y: y0))
                fillPath.addLine(to: CGPoint(x: x1, y: y0))
                fillPath.addLine(to: CGPoint(x: x1, y: -4))
                fillPath.addLine(to: CGPoint(x: x0, y: -4))
                fillPath.addLine(to: CGPoint(x: x0, y: y0))
                fillPath.closeSubpath()

                var topWallL = Path()
                topWallL.move(to: CGPoint(x: -4, y: y0))
                topWallL.addLine(to: CGPoint(x: x0, y: y0))
                topWallL.addLine(to: CGPoint(x: x0, y: -4))
                
                var topWallR = Path()
                topWallR.move(to: CGPoint(x: w + 4, y: y0))
                topWallR.addLine(to: CGPoint(x: x1, y: y0))
                topWallR.addLine(to: CGPoint(x: x1, y: -4))
                
                var bottomCap = Path()
                bottomCap.move(to: CGPoint(x: -4, y: y1))
                bottomCap.addLine(to: CGPoint(x: w + 4, y: y1))
                
                strokePaths = [topWallL, topWallR, bottomCap]
            }

            let angle = Double(rotation.rawValue) * .pi / 180
            let t = CGAffineTransform(translationX: mid.x, y: mid.y)
                .rotated(by: angle)
                .translatedBy(x: -mid.x, y: -mid.y)

            // Cut-out Corridor Path Color (matches board background for depth)
            let pathColor: Color = colorScheme == .dark
                ? Color(red: 0.08, green: 0.10, blue: 0.14)
                : Color(red: 0.88, green: 0.90, blue: 0.94)

            // Corridor path fill
            let rotatedFill = fillPath.applying(t)
            context.fill(rotatedFill, with: .color(pathColor))

            // Corridor 3D Wall Stroke (inner shadow effect)
            let wallColor: Color = colorScheme == .dark
                ? Color.black.opacity(0.8)
                : Color.black.opacity(0.12)

            let lineWidth: CGFloat = max(2.5, w * 0.06)
            for sp in strokePaths {
                let rotated = sp.applying(t)
                context.stroke(rotated,
                                with: .color(wallColor),
                                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round))
            }
        }
    }
}

// MARK: - 3D Tactile Pawn Token

struct PawnToken: View {
    let color: PawnColor
    let isActive: Bool
    var size: CGFloat = 24

    private var pawnGradient: [Color] {
        switch color {
        case .red:
            return [Color(red: 1.0, green: 0.40, blue: 0.40), Color(red: 0.80, green: 0.10, blue: 0.10)]
        case .blue:
            return [Color(red: 0.40, green: 0.70, blue: 1.0), Color(red: 0.10, green: 0.35, blue: 0.85)]
        case .green:
            return [Color(red: 0.35, green: 0.90, blue: 0.55), Color(red: 0.10, green: 0.65, blue: 0.25)]
        case .yellow:
            return [Color(red: 1.0, green: 0.90, blue: 0.30), Color(red: 0.85, green: 0.65, blue: 0.05)]
        }
    }

    private var pawnShadowColor: Color {
        switch color {
        case .red:    return .red
        case .blue:   return .blue
        case .green:  return .green
        case .yellow: return .orange
        }
    }

    var body: some View {
        ZStack {
            // Glow aura when active
            if isActive {
                Circle()
                    .fill(pawnShadowColor.opacity(0.5))
                    .frame(width: size * 1.35, height: size * 1.35)
                    .blur(radius: 4)
            }

            // 3D Pawn Body
            Circle()
                .fill(
                    LinearGradient(
                        colors: pawnGradient,
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: size, height: size)
                .overlay(
                    // Glossy Specular Reflection
                    Circle()
                        .strokeBorder(
                            LinearGradient(
                                colors: [Color.white.opacity(0.85), Color.white.opacity(0.20)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ),
                            lineWidth: isActive ? 2.5 : 1.5
                        )
                )
                .shadow(color: pawnShadowColor.opacity(0.6), radius: isActive ? 6 : 3, y: 2)

            // Letter Icon Badge
            Text(String(color.rawValue.prefix(1)).uppercased())
                .font(.system(size: size * 0.46, weight: .black, design: .rounded))
                .foregroundColor(color == .yellow ? .black : .white)
                .shadow(color: .black.opacity(0.3), radius: 1, y: 1)
        }
        .scaleEffect(isActive ? 1.18 : 1.0)
        .animation(.spring(response: 0.28, dampingFraction: 0.7), value: isActive)
    }
}

// MARK: - Pawn Overlay View

struct PawnOverlayView: View {
    let row: Int
    let col: Int
    let positions: PawnPositions
    let activePawn: PawnColor

    private var pawnsHere: [PawnColor] {
        PawnColor.allCases.filter {
            positions[$0].row == row && positions[$0].col == col
        }
    }

    var body: some View {
        if !pawnsHere.isEmpty {
            HStack(spacing: 2) {
                ForEach(pawnsHere, id: \.id) { pawn in
                    PawnToken(color: pawn, isActive: pawn == activePawn, size: 20)
                }
            }
        }
    }
}

