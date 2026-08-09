import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Color Extensions & Design System Tokens

#if canImport(UIKit)
import UIKit
extension Color {
    static let appGroupedBg          = Color(uiColor: .systemGroupedBackground)
    static let appSecondaryGroupedBg = Color(uiColor: .secondarySystemGroupedBackground)
    static let appTertiaryGroupedBg  = Color(uiColor: .tertiarySystemGroupedBackground)
}
#else
extension Color {
    static let appGroupedBg          = Color(red: 0.10, green: 0.11, blue: 0.14)
    static let appSecondaryGroupedBg = Color(red: 0.14, green: 0.15, blue: 0.18)
    static let appTertiaryGroupedBg  = Color(red: 0.18, green: 0.19, blue: 0.23)
}
#endif

extension Color {
    static let amberGold     = Color(red: 0.96, green: 0.78, blue: 0.25)
    static let neonGreen     = Color(red: 0.20, green: 0.90, blue: 0.50)
    static let solverPurple  = Color(red: 0.58, green: 0.36, blue: 0.96)
    
    // Theme Accent Resolver
    static func accentForTheme(_ theme: AppAccentTheme) -> Color {
        switch theme {
        case .gold:     return Color(red: 0.95, green: 0.72, blue: 0.20)
        case .sapphire: return Color(red: 0.22, green: 0.58, blue: 0.98)
        case .emerald:  return Color(red: 0.20, green: 0.82, blue: 0.52)
        case .purple:   return Color(red: 0.62, green: 0.38, blue: 0.98)
        }
    }
}

// MARK: - Liquid Glass View Modifiers

struct LiquidGlassCardModifier: ViewModifier {
    var cornerRadius: CGFloat = 20
    var isInteractive: Bool = false

    func body(content: Content) -> some View {
        content
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(.ultraThinMaterial)
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.35),
                                Color.white.opacity(0.10),
                                Color.black.opacity(0.10)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.20), radius: isInteractive ? 12 : 8, y: isInteractive ? 6 : 3)
    }
}

struct LiquidGlassCapsuleModifier: ViewModifier {
    func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial, in: Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(0.40),
                                Color.white.opacity(0.10)
                            ],
                            startPoint: .top,
                            endPoint: .bottom
                        ),
                        lineWidth: 1
                    )
            )
            .shadow(color: Color.black.opacity(0.22), radius: 10, y: 5)
    }
}

extension View {
    func liquidGlassCard(cornerRadius: CGFloat = 20, isInteractive: Bool = false) -> some View {
        self.modifier(LiquidGlassCardModifier(cornerRadius: cornerRadius, isInteractive: isInteractive))
    }
    
    func liquidGlassCapsule() -> some View {
        self.modifier(LiquidGlassCapsuleModifier())
    }
}

// MARK: - Haptic Feedback Helpers

enum HapticImpact {
    case light, medium, heavy, soft, rigid
}

enum HapticNotification {
    case success, warning, error
}

#if canImport(UIKit)
import UIKit

enum Haptics {
    static func impact(_ style: HapticImpact = .medium) {
        let generatorStyle: UIImpactFeedbackGenerator.FeedbackStyle
        switch style {
        case .light:  generatorStyle = .light
        case .medium: generatorStyle = .medium
        case .heavy:  generatorStyle = .heavy
        case .soft:   generatorStyle = .soft
        case .rigid:  generatorStyle = .rigid
        }
        UIImpactFeedbackGenerator(style: generatorStyle).impactOccurred()
    }

    static func notification(_ type: HapticNotification) {
        let generatorType: UINotificationFeedbackGenerator.FeedbackType
        switch type {
        case .success: generatorType = .success
        case .warning: generatorType = .warning
        case .error:   generatorType = .error
        }
        UINotificationFeedbackGenerator().notificationOccurred(generatorType)
    }

    static func selection() {
        UISelectionFeedbackGenerator().selectionChanged()
    }
}
#else
enum Haptics {
    static func impact(_ style: HapticImpact = .medium) {}
    static func notification(_ type: HapticNotification) {}
    static func selection() {}
}
#endif

// MARK: - Toast View

struct ToastView: View {
    let message: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: "sparkles")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(Color.amberGold)
            
            Text(message)
                .font(.system(size: 14, weight: .semibold, design: .rounded))
                .foregroundColor(.primary)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 11)
        .liquidGlassCapsule()
        .transition(.move(edge: .bottom).combined(with: .opacity))
    }
}

