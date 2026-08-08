import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Design Tokens

extension Color {
    static let amber        = Color(red: 0.96, green: 0.78, blue: 0.25)
    static let neonGreen    = Color(red: 0.20, green: 0.90, blue: 0.50)
    static let boardBg      = Color(red: 0.08, green: 0.09, blue: 0.12)
    static let tileBg       = Color(red: 0.16, green: 0.19, blue: 0.25)
    static let tileFixed    = Color(red: 0.12, green: 0.14, blue: 0.20)
    static let solverPurple = Color(red: 0.55, green: 0.30, blue: 0.95)
}

// MARK: - Tile View

struct TileView: View {
    let tile: TileData
    var isReachable: Bool = false
    var isCurrentTarget: Bool = false
    var isStagedTarget: Bool = false

    private func pawnColor(_ p: PawnColor) -> Color {
        switch p {
        case .red:    return Color(red: 0.95, green: 0.25, blue: 0.25)
        case .blue:   return Color(red: 0.25, green: 0.50, blue: 0.95)
        case .green:  return Color(red: 0.20, green: 0.80, blue: 0.40)
        case .yellow: return Color(red: 0.95, green: 0.80, blue: 0.10)
        }
    }

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            let cornerRadius = size * 0.15

            ZStack {
                // Base Tile Card Background with bevel border
                tileCardBackground(size: size, cornerRadius: cornerRadius)

                // Pathway Canvas
                PathCanvas(shape: tile.shape, rotation: tile.rotation, size: size)
                    .padding(size * 0.04)

                // Reachable Highlight Overlay
                if isReachable {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color.neonGreen.opacity(0.18))
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(Color.neonGreen, lineWidth: max(2, size * 0.06))
                }

                // Current Target Highlight
                if isCurrentTarget {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .strokeBorder(Color.amber, lineWidth: max(2.5, size * 0.07))
                        .overlay(
                            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                                .fill(Color.amber.opacity(0.12))
                        )
                }

                // Staged Move Target Highlight
                if isStagedTarget {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(Color.blue.opacity(0.18))
                }

                // Fixed Tile Golden Corner Emblems
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
                                .shadow(color: pawnColor(pawn).opacity(0.8), radius: 4)
                            Spacer()
                        }
                        Spacer()
                    }
                    .padding(size * 0.06)
                }

                // Treasure Emoji Badge
                if let treasure = tile.treasure {
                    VStack {
                        Spacer()
                        HStack(spacing: 2) {
                            Text(treasure.emoji)
                                .font(.system(size: size * 0.24))
                            Text(treasure.shortName)
                                .font(.system(size: size * 0.12, weight: .black, design: .rounded))
                                .lineLimit(1)
                                .minimumScaleFactor(0.5)
                                .foregroundColor(isCurrentTarget ? .black : .white)
                        }
                        .padding(.horizontal, size * 0.07)
                        .padding(.vertical, size * 0.04)
                        .background(
                            Capsule()
                                .fill(isCurrentTarget ? Color.amber : Color.black.opacity(0.70))
                        )
                        .shadow(color: .black.opacity(0.3), radius: 2, y: 1)
                    }
                    .padding(.bottom, size * 0.05)
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    private func tileCardBackground(size: CGFloat, cornerRadius: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .fill(
                    tile.isFixed
                    ? LinearGradient(colors: [Color.tileFixed, Color(red: 0.09, green: 0.11, blue: 0.16)], startPoint: .topLeading, endPoint: .bottomTrailing)
                    : LinearGradient(colors: [Color.tileBg, Color(red: 0.12, green: 0.14, blue: 0.19)], startPoint: .topLeading, endPoint: .bottomTrailing)
                )

            // Bevel edge stroke
            RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                .strokeBorder(
                    tile.isFixed ? Color.amber.opacity(0.3) : Color.white.opacity(0.12),
                    lineWidth: 1
                )
        }
    }

    private func fixedTileBrackets(size: CGFloat) -> some View {
        VStack {
            HStack {
                Spacer()
                Image(systemName: "lock.fill")
                    .font(.system(size: size * 0.13, weight: .bold))
                    .foregroundColor(Color.amber.opacity(0.6))
            }
            Spacer()
        }
        .padding(size * 0.06)
    }
}

// MARK: - Path Canvas (Rich Crisp Corridors)

struct PathCanvas: View {
    let shape: TileShape
    let rotation: TileRotation
    let size: CGFloat

    var body: some View {
        Canvas { context, cSize in
            let w = cSize.width
            let h = cSize.height
            let mid = CGPoint(x: w * 0.5, y: h * 0.5)
            let corridorWidth: CGFloat = w * 0.38

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
                fillPath.move(to: CGPoint(x: mid.x - corridorWidth * 0.5, y: -4))
                fillPath.addLine(to: CGPoint(x: mid.x + corridorWidth * 0.5, y: -4))
                fillPath.addArc(center: mid, radius: outR,
                                startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
                fillPath.addLine(to: CGPoint(x: w + 4, y: mid.y - corridorWidth * 0.5))
                fillPath.addArc(center: mid, radius: inR,
                                startAngle: .degrees(0), endAngle: .degrees(-90), clockwise: true)
                fillPath.closeSubpath()

                var outerArc = Path()
                outerArc.addArc(center: mid, radius: outR, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
                var innerArc = Path()
                innerArc.addArc(center: mid, radius: inR, startAngle: .degrees(0), endAngle: .degrees(-90), clockwise: true)
                strokePaths = [outerArc, innerArc]

            case .tJunction:
                let x0 = mid.x - corridorWidth * 0.5
                let x1 = mid.x + corridorWidth * 0.5
                let y0 = mid.y - corridorWidth * 0.5
                let y1 = mid.y + corridorWidth * 0.5
                fillPath.move(to: CGPoint(x: -4, y: y0))
                fillPath.addLine(to: CGPoint(x: -4, y: y1))
                fillPath.addLine(to: CGPoint(x: x0, y: y1))
                fillPath.addLine(to: CGPoint(x: x0, y: h + 4))
                fillPath.addLine(to: CGPoint(x: x1, y: h + 4))
                fillPath.addLine(to: CGPoint(x: x1, y: y1))
                fillPath.addLine(to: CGPoint(x: w + 4, y: y1))
                fillPath.addLine(to: CGPoint(x: w + 4, y: y0))
                fillPath.closeSubpath()

                var bottomWall = Path()
                bottomWall.move(to: CGPoint(x: -4, y: y0))
                bottomWall.addLine(to: CGPoint(x: x0, y: y0))
                bottomWall.addLine(to: CGPoint(x: x0, y: -4))
                var rightWall = Path()
                rightWall.move(to: CGPoint(x: w + 4, y: y0))
                rightWall.addLine(to: CGPoint(x: x1, y: y0))
                rightWall.addLine(to: CGPoint(x: x1, y: -4))
                var bottomCap = Path()
                bottomCap.move(to: CGPoint(x: -4, y: y1))
                bottomCap.addLine(to: CGPoint(x: w + 4, y: y1))
                strokePaths = [bottomWall, rightWall, bottomCap]
            }

            let angle = Double(rotation.rawValue) * .pi / 180
            let t = CGAffineTransform(translationX: mid.x, y: mid.y)
                .rotated(by: angle)
                .translatedBy(x: -mid.x, y: -mid.y)

            // Corridor fill
            let rotatedFill = fillPath.applying(t)
            context.fill(rotatedFill, with: .color(Color(red: 0.88, green: 0.68, blue: 0.20).opacity(0.35)))

            // Corridor wall stroke
            let lineWidth: CGFloat = max(2, w * 0.055)
            for sp in strokePaths {
                let rotated = sp.applying(t)
                context.stroke(rotated,
                                with: .color(Color.amber),
                                style: StrokeStyle(lineWidth: lineWidth, lineCap: .round, lineJoin: .round))
            }
        }
    }
}

// MARK: - Pawn Token

struct PawnToken: View {
    let color: PawnColor
    let isActive: Bool
    var size: CGFloat = 22

    private var pawnFill: Color {
        switch color {
        case .red:    return Color(red: 0.95, green: 0.25, blue: 0.25)
        case .blue:   return Color(red: 0.25, green: 0.50, blue: 0.95)
        case .green:  return Color(red: 0.20, green: 0.80, blue: 0.40)
        case .yellow: return Color(red: 0.95, green: 0.80, blue: 0.10)
        }
    }

    var body: some View {
        ZStack {
            Circle()
                .fill(pawnFill)
                .frame(width: size, height: size)
                .overlay(
                    Circle().strokeBorder(Color.white, lineWidth: isActive ? 2.5 : 1.5)
                )
                .shadow(color: pawnFill.opacity(0.8), radius: isActive ? 6 : 3)

            Text(String(color.rawValue.prefix(1)).uppercased())
                .font(.system(size: size * 0.45, weight: .black, design: .rounded))
                .foregroundColor(color == .yellow ? .black : .white)
        }
        .scaleEffect(isActive ? 1.15 : 1.0)
        .animation(.spring(response: 0.3), value: isActive)
    }
}

// MARK: - Pawn Overlay

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
