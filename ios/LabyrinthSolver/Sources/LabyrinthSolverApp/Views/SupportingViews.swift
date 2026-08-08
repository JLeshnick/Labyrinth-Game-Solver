import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - Color Extensions for Cross-Platform iOS & macOS

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

// MARK: - Toast View

struct ToastView: View {
    let message: String

    var body: some View {
        Text(message)
            .font(.system(size: 14, weight: .semibold, design: .rounded))
            .foregroundColor(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 10)
            .background(
                Capsule()
                    .fill(Color(white: 0.15))
                    .overlay(Capsule().strokeBorder(Color.white.opacity(0.15), lineWidth: 1))
            )
            .shadow(color: .black.opacity(0.4), radius: 8, y: 4)
    }
}
