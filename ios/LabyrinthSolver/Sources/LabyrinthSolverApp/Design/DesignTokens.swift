import SwiftUI

public enum DesignTokens {
    public enum Spacing {
        public static let xs: CGFloat = 4
        public static let sm: CGFloat = 8
        public static let md: CGFloat = 12
        public static let lg: CGFloat = 16
        public static let xl: CGFloat = 20
        public static let xxl: CGFloat = 24
        public static let huge: CGFloat = 32
    }

    public enum CornerRadius {
        public static let xs: CGFloat = 8
        public static let sm: CGFloat = 12
        public static let md: CGFloat = 16
        public static let lg: CGFloat = 20
        public static let xl: CGFloat = 24
    }

    public enum Animation {
        public static let smooth = SwiftUI.Animation.spring(response: 0.35, dampingFraction: 0.82)
        public static let snappy = SwiftUI.Animation.spring(response: 0.25, dampingFraction: 0.75)
        public static let bouncy = SwiftUI.Animation.spring(response: 0.40, dampingFraction: 0.65)
        public static let gentle = SwiftUI.Animation.easeInOut(duration: 0.3)
    }

    public enum Shadow {
        public static let subtle = SwiftUI.Color.black.opacity(0.12)
        public static let medium = SwiftUI.Color.black.opacity(0.22)
        public static let glow = SwiftUI.Color.black.opacity(0.35)
    }
}

#if canImport(UIKit)
import UIKit
extension Color {
    static let appSystemGray4 = Color(uiColor: .systemGray4)
}
#else
extension Color {
    static let appSystemGray4 = Color(red: 0.25, green: 0.26, blue: 0.30)
}
#endif
