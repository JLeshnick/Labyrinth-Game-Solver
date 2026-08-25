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
                        .shadow(
                            color: isSelected ? (tintColor ?? Color.black).opacity(0.20) : Color.black.opacity(0.06),
                            radius: isSelected ? 8 : 4,
                            y: isSelected ? 3 : 2
                        )
                    
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
                                Color.black.opacity(0.05)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: isSelected ? 2 : 1
                    )
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
                    Capsule()
                        .fill(.ultraThinMaterial)
                        .shadow(
                            color: isSelected ? (tintColor ?? Color.black).opacity(0.20) : Color.black.opacity(0.05),
                            radius: isSelected ? 6 : 2,
                            y: isSelected ? 2 : 1
                        )
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
                                Color.white.opacity(0.35),
                                Color.white.opacity(0.08)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: isSelected ? 1.5 : 1
                    )
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
