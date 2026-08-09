import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct GameView: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void

    @State private var showSettingsSheet = false
    @State private var showTargetPicker = false
    @State private var showHistorySheet = false
    @State private var showStatsSheet = false
    @State private var showWelcomeSheet = false
    @Environment(\.colorScheme) private var colorScheme

    init(vm: GameViewModel, onSetup: @escaping () -> Void) {
        self.vm = vm
        self.onSetup = onSetup
    }

    var body: some View {
        ZStack {
            // Subtle ambient dark background
            Color.appGroupedBg.ignoresSafeArea()

            VStack(spacing: 0) {
                // Command Top Header Ribbon (Integrated player selector & toolbar)
                CommandHeader(
                    vm: vm,
                    onOpenSettings: { showSettingsSheet = true },
                    onOpenHistory: { showHistorySheet = true },
                    onOpenStats: { showStatsSheet = true }
                )
                .padding(.horizontal, 12)
                .padding(.top, 6)
                .zIndex(2)

                // Board Stage
                boardStage
                    .zIndex(0)

                // Solver Interactive Console
                SolverConsoleView(
                    vm: vm,
                    onOpenTargetPicker: { showTargetPicker = true }
                )
                .padding(.horizontal, 14)
                .padding(.top, 8)
                .padding(.bottom, 10)
                .background(.ultraThinMaterial)
                .zIndex(2)
            }

            // Toast HUD overlay (centered directly in middle of app screen)
            if let msg = vm.toastMessage {
                VStack {
                    ToastView(message: msg)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
                .allowsHitTesting(false)
                .zIndex(100)
            }

            // Route Calculation HUD overlay
            if vm.isSolving {
                Color.black.opacity(0.45)
                    .ignoresSafeArea()
                    .overlay {
                        VStack(spacing: 14) {
                            ProgressView()
                                .scaleEffect(1.3)
                                .tint(Color.accentForTheme(vm.appAccentTheme))
                            Text("Calculating Optimal Routes...")
                                .font(.system(size: 15, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 24)
                        .padding(.vertical, 20)
                        .liquidGlassCard(cornerRadius: 20)
                    }
                    .zIndex(50)
            }
        }
        .animation(.easeInOut(duration: 0.16), value: vm.isSolving)
        .sheet(isPresented: $showSettingsSheet) {
            SettingsView(
                vm: vm,
                onSetup: onSetup,
                onShowWelcome: { showWelcomeSheet = true }
            )
            #if os(iOS)
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)
            #endif
        }
        .sheet(isPresented: $showTargetPicker) {
            TargetPickerSheet(vm: vm)
            #if os(iOS)
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            #endif
        }
        .sheet(isPresented: $showHistorySheet) {
            MoveHistorySheet(vm: vm)
            #if os(iOS)
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            #endif
        }
        .sheet(isPresented: $showStatsSheet) {
            GameStatsSheet(vm: vm)
            #if os(iOS)
            .presentationDetents([.medium, .large])
            .presentationDragIndicator(.visible)
            #endif
        }
        .sheet(isPresented: $showWelcomeSheet) {
            WelcomeView()
        }
    }

    private var boardStage: some View {
        GeometryReader { geo in
            let maxBoard = min(geo.size.width - 20, geo.size.height - 16)
            VStack(spacing: 0) {
                LabyrinthBoardView(vm: vm)
                    .frame(width: maxBoard, height: maxBoard)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
            .padding(.top, 12)
        }
    }
}
