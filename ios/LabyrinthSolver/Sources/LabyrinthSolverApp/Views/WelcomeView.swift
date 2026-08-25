import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct WelcomeView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var currentPage = 0

    var onFinished: (() -> Void)?

    init(onFinished: (() -> Void)? = nil) {
        self.onFinished = onFinished
    }

    private let pages: [(title: String, subtitle: String, icon: String, accentColor: Color)] = [
        (
            title: "Welcome to Labyrinth Solver",
            subtitle: "The ultimate companion app for the classic Ravensburger Labyrinth board game. Calculate optimal pathways and dominate the maze!",
            icon: "map.fill",
            accentColor: Color(red: 0.95, green: 0.72, blue: 0.20)
        ),
        (
            title: "Set Up Your Board",
            subtitle: "Use the Drag & Drop Board Builder, randomize loose tiles, or use standard presets to match your physical game board layout.",
            icon: "square.grid.3x3.fill",
            accentColor: Color(red: 0.22, green: 0.58, blue: 0.98)
        ),
        (
            title: "AI Solver Co-Pilot",
            subtitle: "Look ahead 1–3 turns. Find shortest paths to target treasures, evaluate safety scores, and preview slide actions before executing.",
            icon: "sparkles",
            accentColor: Color(red: 0.62, green: 0.38, blue: 0.98)
        ),
        (
            title: "Ready to Play!",
            subtitle: "Track live stopwatch time, player inventories, and step-by-step move history to complete your Labyrinth victory.",
            icon: "flag.checkered",
            accentColor: Color(red: 0.20, green: 0.82, blue: 0.52)
        )
    ]

    public var body: some View {
        ZStack {
            Color.appGroupedBg.ignoresSafeArea()

            VStack(spacing: 24) {
                HStack {
                    Spacer()
                    Button("Skip") {
                        completeOnboarding()
                    }
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)
                    .padding(.trailing, 20)
                    .padding(.top, 16)
                }

                TabView(selection: $currentPage) {
                    ForEach(0..<pages.count, id: \.self) { index in
                        onboardingCard(pages[index])
                            .tag(index)
                    }
                }
                #if os(iOS)
                .tabViewStyle(.page(indexDisplayMode: .never))
                #endif

                // Page Control Indicators
                HStack(spacing: 8) {
                    ForEach(0..<pages.count, id: \.self) { idx in
                        Capsule()
                            .fill(idx == currentPage ? pages[currentPage].accentColor : Color.primary.opacity(0.15))
                            .frame(width: idx == currentPage ? 24 : 8, height: 8)
                            .animation(.spring(response: 0.3, dampingFraction: 0.7), value: currentPage)
                    }
                }
                .padding(.bottom, 8)

                // Action Button
                Button(action: {
                    Haptics.impact(.medium)
                    if currentPage < pages.count - 1 {
                        withAnimation {
                            currentPage += 1
                        }
                    } else {
                        completeOnboarding()
                    }
                }) {
                    HStack(spacing: 8) {
                        Text(currentPage == pages.count - 1 ? "Get Started" : "Continue")
                            .font(.system(size: 17, weight: .bold, design: .rounded))
                        Image(systemName: currentPage == pages.count - 1 ? "checkmark.circle.fill" : "chevron.right")
                            .font(.system(size: 16, weight: .bold))
                    }
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity, minHeight: 52)
                    .background(pages[currentPage].accentColor, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .shadow(color: pages[currentPage].accentColor.opacity(0.4), radius: 8, y: 4)
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 24)
            }
        }
    }

    private func onboardingCard(_ page: (title: String, subtitle: String, icon: String, accentColor: Color)) -> some View {
        VStack(spacing: 24) {
            Spacer()

            ZStack {
                Circle()
                    .fill(page.accentColor.opacity(0.15))
                    .frame(width: 140, height: 140)
                
                Image(systemName: page.icon)
                    .font(.system(size: 64, weight: .semibold))
                    .foregroundColor(page.accentColor)
                    .shadow(color: page.accentColor.opacity(0.5), radius: 10)
            }

            VStack(spacing: 12) {
                Text(page.title)
                    .font(.system(size: 26, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .multilineTextAlignment(.center)

                Text(page.subtitle)
                    .font(.system(size: 15, weight: .regular, design: .rounded))
                    .foregroundColor(.secondary)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
                    .padding(.horizontal, 16)
            }

            Spacer()
        }
        .padding(24)
        .liquidGlassCard(cornerRadius: 24)
        .padding(.horizontal, 20)
    }

    private func completeOnboarding() {
        UserDefaults.standard.set(true, forKey: "hasSeenWelcomeGuide")
        onFinished?()
        dismiss()
    }
}
