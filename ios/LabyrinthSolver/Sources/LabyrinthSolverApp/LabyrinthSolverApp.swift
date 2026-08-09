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

// MARK: - Root View (handles setup → game flow)

struct RootView: View {
    @State private var vm = GameViewModel()
    @State private var showWelcome = true

    var body: some View {
        ZStack {
            if showWelcome {
                WelcomeView(vm: vm, onStart: { showWelcome = false })
                    .transition(.asymmetric(
                        insertion: .opacity,
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
            } else {
                GameView(vm: vm, onSetup: { showWelcome = true })
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .opacity
                    ))
            }
        }
        .animation(.spring(response: 0.38, dampingFraction: 0.8), value: showWelcome)
        .preferredColorScheme(
            vm.appColorScheme == .light ? .light :
            vm.appColorScheme == .dark  ? .dark  : nil
        )
        .tint(Color.accentForTheme(vm.appAccentTheme))
    }
}

// MARK: - Welcome / Board Setup View

struct WelcomeView: View {
    @Bindable var vm: GameViewModel
    let onStart: () -> Void

    var body: some View {
        BoardSetupView(vm: vm, onStartGame: onStart)
            .preferredColorScheme(
                vm.appColorScheme == .light ? .light :
                vm.appColorScheme == .dark  ? .dark  : nil
            )
    }
}

// MARK: - Game View (Main Play Screen)

struct GameView: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void

    @State private var showSettingsSheet = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            // Background
            (colorScheme == .dark ? Color.boardBg : Color(red: 0.94, green: 0.95, blue: 0.97))
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // ── Top Floating Status Pill ──
                topStatusPill
                    .padding(.top, 8)
                    .padding(.horizontal, 16)
                    .zIndex(2)

                Spacer(minLength: 16)

                // ── Board Area ──
                GeometryReader { geo in
                    let availableHeight = geo.size.height
                    let availableWidth  = geo.size.width
                    let boardAreaSize = min(availableWidth, availableHeight)

                    VStack(spacing: 0) {
                        Spacer(minLength: 0)
                        LabyrinthBoardView(vm: vm)
                            .frame(width: boardAreaSize, height: boardAreaSize)
                            .frame(maxWidth: .infinity)
                            .shadow(color: .black.opacity(colorScheme == .dark ? 0.3 : 0.1), radius: 24, y: 12)
                        Spacer(minLength: 0)
                    }
                }
                .zIndex(1)

                Spacer(minLength: 16)

                // ── AI Insight Panel ──
                if let aiMove = vm.stagedAiMove {
                    aiInsightPanel(aiMove)
                        .padding(.horizontal, 16)
                        .padding(.bottom, 8)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                        .zIndex(3)
                }

                // ── Floating Liquid Control Bar ──
                bottomControlBar
                    .padding(.horizontal, 16)
                    .padding(.bottom, 24)
                    .zIndex(2)
            }

            // ── Toast Notification ──
            if let msg = vm.toastMessage {
                VStack {
                    Spacer()
                    ToastView(message: msg)
                        .padding(.bottom, vm.stagedAiMove != nil ? 180 : 120)
                }
                .zIndex(100)
            }

            // ── AI Solver Overlay ──
            if vm.isSolving {
                Color.black.opacity(0.3)
                    .ignoresSafeArea()
                    .overlay(
                        VStack(spacing: 16) {
                            ProgressView()
                                .scaleEffect(1.5)
                                .tint(.white)
                            Text("AI is exploring routes...")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundColor(.white)
                        }
                        .padding(32)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 24, style: .continuous))
                    )
                    .zIndex(50)
            }
        }
        .animation(.spring(response: 0.35, dampingFraction: 0.8), value: vm.toastMessage)
        .animation(.spring(response: 0.4, dampingFraction: 0.8), value: vm.stagedAiMove)
        .animation(.easeInOut(duration: 0.2), value: vm.isSolving)
        .sheet(isPresented: $showSettingsSheet) {
            SettingsSheet(vm: vm, onSetup: onSetup)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - AI Insight Panel
    private func aiInsightPanel(_ move: MoveOption) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: move.isTargetReached ? "star.circle.fill" : "point.topleft.down.curvedto.point.bottomright.up.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(move.isTargetReached ? Color.amberGold : Color.solverPurple)

                Text(move.isTargetReached ? "TARGET REACHABLE" : "OPTIMAL ROUTE")
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundColor(move.isTargetReached ? Color.amberGold : Color.solverPurple)
                    .tracking(1.0)
                
                Spacer()
                
                Button(action: {
                    Haptics.selection()
                    vm.cancelStage()
                }) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 18))
                        .foregroundColor(.secondary.opacity(0.5))
                }
            }

            Text(move.summaryText)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(.primary)

            if !move.reachableTreasures.isEmpty {
                HStack(spacing: 6) {
                    Text("Also reaches:")
                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                        .foregroundColor(.secondary)
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 6) {
                            ForEach(move.reachableTreasures, id: \.self) { tId in
                                if let treasure = GameConstants.treasures.first(where: { $0.id == tId }) {
                                    Text(treasure.emoji)
                                        .font(.system(size: 14))
                                        .padding(4)
                                        .background(Color.white.opacity(colorScheme == .dark ? 0.1 : 0.6), in: Circle())
                                }
                            }
                        }
                    }
                }
            }
        }
        .padding(14)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 18, style: .continuous)
                .strokeBorder(move.isTargetReached ? Color.amberGold.opacity(0.6) : Color.solverPurple.opacity(0.4), lineWidth: 1.5)
        )
        .shadow(color: (move.isTargetReached ? Color.amberGold : Color.solverPurple).opacity(0.15), radius: 12, y: 6)
    }

    // MARK: - Top Status Pill
    private var topStatusPill: some View {
        HStack(spacing: 12) {
            // Left: Undo/Redo
            HStack(spacing: 4) {
                Button(action: { vm.undo() }) {
                    Image(systemName: "arrow.uturn.backward")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(vm.canUndo ? .primary : .secondary.opacity(0.3))
                        .frame(width: 40, height: 40)
                        .contentShape(Circle())
                }
                .disabled(!vm.canUndo)

                Button(action: { vm.redo() }) {
                    Image(systemName: "arrow.uturn.forward")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(vm.canRedo ? .primary : .secondary.opacity(0.3))
                        .frame(width: 40, height: 40)
                        .contentShape(Circle())
                }
                .disabled(!vm.canRedo)
            }

            Spacer()

            // Center: Turn Phase
            HStack(spacing: 6) {
                Circle()
                    .fill(vm.turnPhase == .slide ? Color.amberGold : Color.neonGreen)
                    .frame(width: 8, height: 8)
                    .shadow(color: (vm.turnPhase == .slide ? Color.amberGold : Color.neonGreen).opacity(0.8), radius: 4)

                Text(vm.turnPhase == .slide ? "Slide a tile" : "\(vm.activePawn.displayName)'s turn")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
            }

            Spacer()

            // Right: Settings
            Button(action: { showSettingsSheet = true }) {
                Image(systemName: "gearshape.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.primary)
                    .frame(width: 40, height: 40)
                    .contentShape(Circle())
            }
        }
        .padding(.horizontal, 6)
        .padding(.vertical, 6)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(Color.white.opacity(colorScheme == .dark ? 0.1 : 0.5), lineWidth: 1))
        .shadow(color: .black.opacity(0.1), radius: 10, y: 4)
    }

    // MARK: - Bottom Control Bar
    private var bottomControlBar: some View {
        HStack(spacing: 8) {
            // Active Players
            HStack(spacing: 2) {
                ForEach(vm.activePlayers) { pawn in
                    let isSelected = vm.activePawn == pawn
                    Button(action: {
                        Haptics.selection()
                        vm.activePawn = pawn
                        vm.refreshReachable()
                    }) {
                        PawnToken(color: pawn, isActive: isSelected, size: 26)
                            .frame(width: 48, height: 48)
                            .background(
                                isSelected
                                ? Circle().fill(Color.white.opacity(colorScheme == .dark ? 0.15 : 0.5))
                                : nil
                            )
                            .contentShape(Circle())
                    }
                }
            }

            Spacer()

            // AI Solver Button (Magic Wand)
            Button(action: {
                Haptics.impact(.medium)
                vm.runSolverAndStage()
            }) {
                Image(systemName: "wand.and.stars")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 52, height: 52)
                    .background(
                        LinearGradient(colors: [Color(red: 0.6, green: 0.3, blue: 0.9), Color(red: 0.4, green: 0.1, blue: 0.8)], startPoint: .topLeading, endPoint: .bottomTrailing),
                        in: Circle()
                    )
                    .shadow(color: Color(red: 0.5, green: 0.2, blue: 0.8).opacity(0.6), radius: 8, y: 4)
            }

            Spacer()

            // Spare Tile / Confirm Move
            if vm.stagedArrowId != nil {
                Button(action: {
                    Haptics.impact(.heavy)
                    vm.commitSlide()
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "checkmark")
                            .font(.system(size: 16, weight: .black))
                        Text(vm.stagedAiMove != nil ? "Play Move" : "Confirm")
                            .font(.system(size: 15, weight: .bold, design: .rounded))
                    }
                    .foregroundColor(.white)
                    .frame(height: 52)
                    .padding(.horizontal, 20)
                    .background(Color.green, in: Capsule())
                    .shadow(color: Color.green.opacity(0.4), radius: 8, y: 4)
                }
                .transition(.scale.combined(with: .opacity))
            } else {
                Button(action: {
                    Haptics.selection()
                    vm.rotateSpareTile()
                }) {
                    HStack(spacing: 8) {
                        TileView(tile: vm.spareTile)
                            .frame(width: 36, height: 36)
                        Image(systemName: "rotate.right")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    }
                    .frame(height: 52)
                    .padding(.horizontal, 16)
                    .background(Color.black.opacity(0.05), in: Capsule())
                }
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(.ultraThinMaterial, in: Capsule())
        .overlay(Capsule().strokeBorder(Color.white.opacity(colorScheme == .dark ? 0.1 : 0.6), lineWidth: 1))
        .shadow(color: .black.opacity(0.15), radius: 20, y: 10)
    }
}

// MARK: - Settings Sheet

struct SettingsSheet: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        NavigationStack {
            ZStack {
                (colorScheme == .dark ? Color.boardBg : Color(red: 0.94, green: 0.95, blue: 0.97))
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        // Action Buttons
                        VStack(spacing: 12) {
                            Button(action: { dismiss(); onSetup() }) {
                                settingsRow(icon: "slider.horizontal.3", title: "Open Board Setup Wizard", color: Color.accentForTheme(vm.appAccentTheme))
                            }
                            Button(action: { vm.randomizeBoard(); vm.showToast("Board Randomized ✨"); dismiss() }) {
                                settingsRow(icon: "sparkles", title: "Randomize Board Layout", color: .purple)
                            }
                            Button(action: { vm.resetBoard(); vm.showToast("Board Reset ↺"); dismiss() }) {
                                settingsRow(icon: "arrow.counterclockwise", title: "Reset Standard Layout", color: .orange)
                            }
                            Button(action: { vm.startFromScratch(); dismiss(); onSetup() }) {
                                settingsRow(icon: "trash.fill", title: "Clear Board (From Scratch)", color: .red)
                            }
                        }
                        .padding(16)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))

                        // Toggles & Pickers
                        VStack(spacing: 12) {
                            Toggle("Sound Effects", isOn: $vm.enableSound)
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                                .tint(Color.accentForTheme(vm.appAccentTheme))
                            Divider()
                            Toggle("Haptic Feedback", isOn: $vm.enableHaptics)
                                .font(.system(size: 16, weight: .semibold, design: .rounded))
                                .tint(Color.accentForTheme(vm.appAccentTheme))
                        }
                        .padding(16)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))

                        // Target Treasure for Solver
                        VStack(alignment: .leading, spacing: 12) {
                            Text("AI SOLVER TARGET")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                            
                            ScrollView(.horizontal, showsIndicators: false) {
                                HStack(spacing: 8) {
                                    Button(action: { vm.clearActiveTarget() }) {
                                        Text("Auto")
                                            .font(.system(size: 14, weight: .bold, design: .rounded))
                                            .foregroundColor(vm.singleTargetId == nil ? .white : .primary)
                                            .padding(.horizontal, 16)
                                            .padding(.vertical, 8)
                                            .background(vm.singleTargetId == nil ? Color.accentColor : Color.secondary.opacity(0.2), in: Capsule())
                                    }
                                    ForEach(GameConstants.treasures, id: \.id) { t in
                                        Button(action: { vm.setActiveTarget(treasureId: t.id) }) {
                                            Text(t.emoji)
                                                .font(.system(size: 20))
                                                .padding(8)
                                                .background(vm.singleTargetId == t.id ? Color.amberGold : Color.secondary.opacity(0.2), in: Circle())
                                        }
                                    }
                                }
                            }
                        }
                        .padding(16)
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 20, style: .continuous))
                        .overlay(RoundedRectangle(cornerRadius: 20).strokeBorder(Color.white.opacity(0.1), lineWidth: 1))
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Settings")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 16, weight: .bold))
                }
            }
        }
    }

    private func settingsRow(icon: String, title: String, color: Color) -> some View {
        HStack(spacing: 16) {
            Image(systemName: icon)
                .font(.system(size: 18, weight: .bold))
                .foregroundColor(.white)
                .frame(width: 36, height: 36)
                .background(color, in: RoundedRectangle(cornerRadius: 10, style: .continuous))
            
            Text(title)
                .font(.system(size: 16, weight: .semibold, design: .rounded))
                .foregroundColor(.primary)
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(.secondary.opacity(0.5))
        }
        .contentShape(Rectangle())
    }
}

