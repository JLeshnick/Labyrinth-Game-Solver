import SwiftUI

// MARK: - Liquid Glass Card Modifier

public struct LiquidGlassCardModifier: ViewModifier {
    public var cornerRadius: CGFloat
    public var isInteractive: Bool
    public var isSelected: Bool
    public var tintColor: Color?

    public init(cornerRadius: CGFloat = 20, isInteractive: Bool = false, isSelected: Bool = false, tintColor: Color? = nil) {
        self.cornerRadius = cornerRadius
        self.isInteractive = isInteractive
        self.isSelected = isSelected
        self.tintColor = tintColor
    }

    public func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                    
                    if let tintColor {
                        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                            .fill(tintColor.opacity(0.12))
                    }
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: isSelected ? [
                                (tintColor ?? .white).opacity(0.9),
                                (tintColor ?? .white).opacity(0.4)
                            ] : [
                                Color.white.opacity(0.35),
                                Color.white.opacity(0.10),
                                Color.black.opacity(0.10)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .shadow(
                color: isSelected ? (tintColor ?? Color.black).opacity(0.35) : Color.black.opacity(isInteractive ? 0.22 : 0.12),
                radius: isSelected ? 12 : (isInteractive ? 10 : 6),
                y: isInteractive ? 5 : 3
            )
    }
}

// MARK: - Liquid Glass Capsule Modifier

public struct LiquidGlassCapsuleModifier: ViewModifier {
    public var isSelected: Bool
    public var tintColor: Color?

    public init(isSelected: Bool = false, tintColor: Color? = nil) {
        self.isSelected = isSelected
        self.tintColor = tintColor
    }

    public func body(content: Content) -> some View {
        content
            .background(
                ZStack {
                    Capsule().fill(.ultraThinMaterial)
                    if let tintColor {
                        Capsule().fill(tintColor.opacity(0.14))
                    }
                }
            )
            .overlay(
                Capsule()
                    .strokeBorder(
                        LinearGradient(
                            colors: isSelected ? [
                                (tintColor ?? .white).opacity(0.9),
                                (tintColor ?? .white).opacity(0.4)
                            ] : [
                                Color.white.opacity(0.40),
                                Color.white.opacity(0.10)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
            .shadow(
                color: isSelected ? (tintColor ?? Color.black).opacity(0.3) : Color.black.opacity(0.18),
                radius: isSelected ? 10 : 6,
                y: 3
            )
    }
}

// MARK: - View Extension

extension View {
    public func liquidGlassCard(cornerRadius: CGFloat = 20, isInteractive: Bool = false, isSelected: Bool = false, tintColor: Color? = nil) -> some View {
        self.modifier(LiquidGlassCardModifier(cornerRadius: cornerRadius, isInteractive: isInteractive, isSelected: isSelected, tintColor: tintColor))
    }

    public func liquidGlassCapsule(isSelected: Bool = false, tintColor: Color? = nil) -> some View {
        self.modifier(LiquidGlassCapsuleModifier(isSelected: isSelected, tintColor: tintColor))
    }
}
