import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

// MARK: - App Entry Point

@main
struct LabyrinthSolverApp: App {
    var body: some Scene {
        WindowGroup {
            RootView()
        }
    }
}

// MARK: - Root View Router

struct RootView: View {
    @State private var vm = GameViewModel()
    @State private var showFirstLaunchWelcome = false

    private var currentScheme: ColorScheme? {
        switch vm.appColorScheme {
        case .light: return .light
        case .dark: return .dark
        case .system: return nil
        }
    }

    var body: some View {
        ZStack {
            if vm.isSetupMode {
                BoardSetupView(vm: vm, onStartGame: {
                    withAnimation(.spring(response: 0.38, dampingFraction: 0.8)) {
                        // Setup mode state handled inside GameViewModel
                    }
                })
                .transition(.asymmetric(
                    insertion: .opacity,
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
            } else {
                GameView(vm: vm, onSetup: {
                    withAnimation(.spring(response: 0.38, dampingFraction: 0.8)) {
                        vm.isSetupMode = true
                    }
                })
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .opacity
                ))
            }
        }
        .preferredColorScheme(currentScheme)
        .tint(Color.accentForTheme(vm.appAccentTheme))
        .onAppear {
            let hasSeen = UserDefaults.standard.bool(forKey: "hasSeenWelcomeGuide")
            if !hasSeen {
                showFirstLaunchWelcome = true
            }
        }
        .sheet(isPresented: $showFirstLaunchWelcome) {
            WelcomeView()
        }
    }
}
