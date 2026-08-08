import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Design Tokens

extension Color {
    // Amber / gold path color
    static let amber     = Color(red: 0.96, green: 0.78, blue: 0.25)
    // Green highlight for reachable tiles
    static let neonGreen = Color(red: 0.20, green: 0.90, blue: 0.50)
    // Board background
    static let boardBg   = Color(red: 0.07, green: 0.09, blue: 0.13)
    // Card / tile background
    static let tileBg    = Color(red: 0.15, green: 0.18, blue: 0.24)
    static let tileFixed = Color(red: 0.11, green: 0.14, blue: 0.19)
    // Accent purple for solver
    static let solverPurple = Color(red: 0.55, green: 0.3, blue: 0.95)
}

// MARK: - Tile View

struct TileView: View {
    let tile: TileData
    var isReachable: Bool = false
    var isCurrentTarget: Bool = false
    var isStagedTarget: Bool = false   // Part of a staged/previewed slide

    // Computed pawn label color for a corner tile
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
            ZStack {
                // ── Background ──
                tileBackground
                    .clipShape(RoundedRectangle(cornerRadius: size * 0.14))

                // ── Path SVG ──
                PathCanvas(shape: tile.shape, rotation: tile.rotation, size: size)
                    .padding(size * 0.05)

                // ── Reachable Highlight ──
                if isReachable {
                    RoundedRectangle(cornerRadius: size * 0.14)
                        .fill(Color.neonGreen.opacity(0.18))
                    RoundedRectangle(cornerRadius: size * 0.14)
                        .strokeBorder(Color.neonGreen, lineWidth: 2.5)
                }

                // ── Current Target Highlight ──
                if isCurrentTarget {
                    RoundedRectangle(cornerRadius: size * 0.14)
                        .strokeBorder(Color.amber, lineWidth: 2.5)
                        .overlay(
                            RoundedRectangle(cornerRadius: size * 0.14)
                                .fill(Color.amber.opacity(0.08))
                        )
                }

                // ── Staged Preview Highlight ──
                if isStagedTarget {
                    RoundedRectangle(cornerRadius: size * 0.14)
                        .fill(Color.blue.opacity(0.15))
                }

                // ── Corner Pawn Color Dot ──
                if let pawn = tile.color {
                    VStack {
                        HStack {
                            Circle()
                                .fill(pawnColor(pawn))
                                .frame(width: size * 0.18, height: size * 0.18)
                                .overlay(Circle().strokeBorder(Color.white, lineWidth: 1.5))
                                .shadow(color: pawnColor(pawn).opacity(0.7), radius: 4)
                            Spacer()
                        }
                        Spacer()
                    }
                    .padding(size * 0.08)
                }

                // ── Fixed Tile Lock Icon ──
                if tile.isFixed {
                    VStack {
                        HStack {
                            Spacer()
                            Image(systemName: "lock.fill")
                                .font(.system(size: size * 0.13, weight: .semibold))
                                .foregroundColor(.white.opacity(0.35))
                        }
                        Spacer()
                    }
                    .padding(size * 0.08)
                }

                // ── Treasure Badge ──
                if let treasure = tile.treasure {
                    VStack {
                        Spacer()
                        HStack(spacing: 2) {
                            Text(treasure.emoji)
                                .font(.system(size: size * 0.22))
                            Text(treasure.shortName)
                                .font(.system(size: size * 0.13, weight: .black, design: .rounded))
                                .lineLimit(1)
                                .minimumScaleFactor(0.5)
                                .foregroundColor(isCurrentTarget ? .black : .white)
                        }
                        .padding(.horizontal, size * 0.06)
                        .padding(.vertical, size * 0.04)
                        .background(
                            Capsule()
                                .fill(isCurrentTarget
                                      ? Color.amber
                                      : Color.black.opacity(0.65))
                        )
                    }
                    .padding(.bottom, size * 0.05)
                }
            }
        }
        .aspectRatio(1, contentMode: .fit)
    }

    // MARK: Background gradient
    private var tileBackground: LinearGradient {
        if tile.isFixed {
            return LinearGradient(
                colors: [Color.tileFixed, Color.tileFixed.opacity(0.8)],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        }
        return LinearGradient(
            colors: [Color.tileBg, Color.tileBg.opacity(0.85)],
            startPoint: .topLeading, endPoint: .bottomTrailing
        )
    }
}

// MARK: - Path Canvas (replaces PathShapeView — draws filled corridor + outline)

struct PathCanvas: View {
    let shape: TileShape
    let rotation: TileRotation
    let size: CGFloat

    var body: some View {
        Canvas { context, cSize in
            let w = cSize.width
            let h = cSize.height
            let mid = CGPoint(x: w * 0.5, y: h * 0.5)
            let corridorWidth: CGFloat = w * 0.36   // 36% of tile width

            // Build the unrotated path for this shape
            var fillPath = Path()
            var strokePaths: [Path] = []

            switch shape {
            case .straight:
                // Vertical corridor
                let x0 = mid.x - corridorWidth * 0.5
                let x1 = mid.x + corridorWidth * 0.5
                fillPath.addRect(CGRect(x: x0, y: -4, width: corridorWidth, height: h + 8))
                // Left wall
                var lp = Path(); lp.move(to: CGPoint(x: x0, y: -4)); lp.addLine(to: CGPoint(x: x0, y: h + 4))
                // Right wall
                var rp = Path(); rp.move(to: CGPoint(x: x1, y: -4)); rp.addLine(to: CGPoint(x: x1, y: h + 4))
                strokePaths = [lp, rp]

            case .corner:
                // Quarter-round corridor: open top & right (at deg0)
                let inR  = (w - corridorWidth) * 0.5         // inner arc radius = distance from centre to inner wall
                let outR = inR + corridorWidth                // outer arc radius
                fillPath.move(to: CGPoint(x: mid.x - corridorWidth * 0.5, y: -4))
                fillPath.addLine(to: CGPoint(x: mid.x + corridorWidth * 0.5, y: -4))
                fillPath.addArc(center: mid, radius: outR,
                                startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
                fillPath.addLine(to: CGPoint(x: w + 4, y: mid.y - corridorWidth * 0.5))
                fillPath.addArc(center: mid, radius: inR,
                                startAngle: .degrees(0), endAngle: .degrees(-90), clockwise: true)
                fillPath.closeSubpath()

                // Outer arc stroke
                var outerArc = Path()
                outerArc.addArc(center: mid, radius: outR,
                                startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
                var innerArc = Path()
                innerArc.addArc(center: mid, radius: inR,
                                startAngle: .degrees(0), endAngle: .degrees(-90), clockwise: true)
                strokePaths = [outerArc, innerArc]

            case .tJunction:
                // Open: top, left, right — closed at bottom (at deg0)
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

                // Bottom wall line
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

            // Rotation transform around centre
            let angle = Double(rotation.rawValue) * .pi / 180
            let t = CGAffineTransform(translationX: mid.x, y: mid.y)
                .rotated(by: angle)
                .translatedBy(x: -mid.x, y: -mid.y)

            // Draw filled corridor
            let rotatedFill = fillPath.applying(t)
            context.fill(rotatedFill, with: .color(Color(red: 0.85, green: 0.65, blue: 0.15).opacity(0.25)))

            // Draw wall strokes
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

// MARK: - Pawn Overlay (multiple pawns on one tile)

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
