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

// (Liquid glass modifiers are defined in LiquidGlassModifiers.swift)


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
    static func impact(_ style: HapticImpact = .soft) {
        let generatorStyle: UIImpactFeedbackGenerator.FeedbackStyle
        switch style {
        case .light, .medium: generatorStyle = .light
        case .heavy, .rigid:  generatorStyle = .rigid
        case .soft:           generatorStyle = .soft
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
        .transition(AnyTransition.move(edge: .bottom).combined(with: AnyTransition.opacity))
    }
}

