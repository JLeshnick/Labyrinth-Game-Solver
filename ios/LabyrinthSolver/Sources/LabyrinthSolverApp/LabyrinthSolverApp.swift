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
        .animation(.easeInOut(duration: 0.4), value: showWelcome)
        .preferredColorScheme(.dark)
    }
}

// MARK: - Welcome / Board Setup View

struct WelcomeView: View {
    @Bindable var vm: GameViewModel
    let onStart: () -> Void

    var body: some View {
        BoardSetupView(vm: vm, onStartGame: onStart)
            .preferredColorScheme(.dark)
    }
}

// MARK: - Game View (Main Play Screen)

struct GameView: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void

    @State private var showSolverSheet = false
    @State private var showSettingsSheet = false

    var body: some View {
        ZStack(alignment: .bottom) {
            Color.appGroupedBg
                .ignoresSafeArea()

            VStack(spacing: 0) {
                // ── Compact top bar ──
                topBar

                // ── Board fills remaining space ──
                GeometryReader { geo in
                    let availableHeight = geo.size.height
                    let availableWidth  = geo.size.width
                    let boardAreaSize = min(availableWidth, availableHeight)

                    VStack(spacing: 0) {
                        LabyrinthBoardView(vm: vm)
                            .frame(width: boardAreaSize, height: boardAreaSize)
                            .frame(maxWidth: .infinity)

                        Spacer(minLength: 0)
                    }
                }

                Spacer(minLength: 80) // Space for floating bottom liquid control bar
            }

            // ── Floating Liquid Control Bar ──
            bottomControlStrip
                .padding(.horizontal, 16)
                .padding(.bottom, 10)

            // ── Toast ──
            if let msg = vm.toastMessage {
                ToastView(message: msg)
                    .padding(.bottom, 96)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                    .zIndex(100)
            }
        }
        .animation(.spring(response: 0.3), value: vm.toastMessage)
        .sheet(isPresented: $showSolverSheet) {
            SolverSheet(vm: vm)
        }
        .sheet(isPresented: $showSettingsSheet) {
            SettingsSheet(vm: vm, onSetup: onSetup)
        }
    }

    // MARK: - Top Bar

    private var topBar: some View {
        HStack(spacing: 12) {
            // Undo / Redo
            HStack(spacing: 4) {
                toolbarButton(icon: "arrow.uturn.backward", enabled: vm.canUndo) { vm.undo() }
                toolbarButton(icon: "arrow.uturn.forward",  enabled: vm.canRedo) { vm.redo() }
            }

            Spacer()

            // Title + turn phase pill
            VStack(spacing: 2) {
                Text("LABYRINTH")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundColor(Color.accentColor)
                    .tracking(2)

                // Turn phase indicator
                HStack(spacing: 5) {
                    Circle()
                        .fill(vm.turnPhase == .slide ? Color.orange : Color.green)
                        .frame(width: 6, height: 6)
                    Text(vm.turnPhase == .slide ? "Slide a tile" : "Move pawn")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(vm.turnPhase == .slide ? Color.orange : Color.green)
                }
            }

            Spacer()

            // Solver + Settings
            HStack(spacing: 4) {
                toolbarButton(icon: "sparkles", enabled: true, tint: .accentColor) {
                    showSolverSheet = true
                }
                toolbarButton(icon: "gearshape.fill", enabled: true) {
                    showSettingsSheet = true
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(.ultraThinMaterial)
    }

    @ViewBuilder
    private func toolbarButton(icon: String, enabled: Bool, tint: Color = .primary, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 15, weight: .semibold))
                .foregroundColor(enabled ? tint : tint.opacity(0.3))
                .frame(width: 36, height: 36)
                .background(Color.appTertiaryGroupedBg)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
        }
        .disabled(!enabled)
    }

    // MARK: - Floating Liquid Control Strip

    private var bottomControlStrip: some View {
        HStack(spacing: 8) {
            // Active pawn selector
            HStack(spacing: 4) {
                ForEach(vm.activePlayers) { pawn in
                    let isSelected = vm.activePawn == pawn
                    Button(action: { vm.activePawn = pawn; vm.refreshReachable() }) {
                        VStack(spacing: 2) {
                            PawnToken(color: pawn, isActive: isSelected, size: 24)
                            Text(pawn.displayName.prefix(1))
                                .font(.system(size: 9, weight: .bold, design: .rounded))
                                .foregroundColor(isSelected ? .primary : .secondary)
                        }
                        .frame(maxWidth: .infinity, minHeight: 44)
                        .background(isSelected ? Color.appSecondaryGroupedBg : Color.clear)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                }
            }
            .padding(3)
            .background(Color.appTertiaryGroupedBg)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))

            Divider().frame(height: 32)

            // Spare tile + rotate
            Button(action: { vm.rotateSpareTile() }) {
                HStack(spacing: 6) {
                    TileView(tile: vm.spareTile)
                        .frame(width: 32, height: 32)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("SPARE")
                            .font(.system(size: 9, weight: .bold, design: .rounded))
                            .foregroundColor(.secondary)
                        Image(systemName: "rotate.right")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color.accentColor)
                    }
                }
                .padding(.horizontal, 8)
                .frame(minHeight: 44)
                .background(Color.appTertiaryGroupedBg)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            // Confirm Slide action
            if vm.stagedArrowId != nil {
                Button(action: { vm.commitSlide() }) {
                    HStack(spacing: 4) {
                        Image(systemName: "checkmark.circle.fill")
                            .font(.system(size: 14, weight: .bold))
                        Text("Confirm")
                            .font(.system(size: 12, weight: .bold, design: .rounded))
                    }
                    .padding(.horizontal, 12)
                    .frame(minHeight: 44)
                    .background(Color.green)
                    .foregroundColor(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            }
        }
        .padding(6)
        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .strokeBorder(Color.white.opacity(0.2), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.2), radius: 12, y: 4)
    }
}

// MARK: - Solver Sheet (full-screen bottom drawer)

struct SolverSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss
    let allTreasures = GameConstants.treasures

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.07, green: 0.09, blue: 0.13).ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        // Target treasure picker
                        VStack(alignment: .leading, spacing: 10) {
                            sectionLabel("TARGET TREASURE", icon: "target")

                            LazyVGrid(columns: [GridItem(.adaptive(minimum: 90), spacing: 8)], spacing: 8) {
                                ForEach(allTreasures, id: \.id) { t in
                                    let isTarget = vm.activeTargetId == t.id
                                    Button(action: {
                                        if isTarget {
                                            vm.clearActiveTarget()
                                        } else {
                                            vm.setActiveTarget(treasureId: t.id)
                                        }
                                    }) {
                                        VStack(spacing: 4) {
                                            Text(t.emoji)
                                                .font(.system(size: 22))
                                            Text(t.shortName)
                                                .font(.system(size: 10, weight: .semibold, design: .rounded))
                                                .foregroundColor(isTarget ? .black : .white.opacity(0.7))
                                                .lineLimit(1)
                                                .minimumScaleFactor(0.6)
                                        }
                                        .frame(maxWidth: .infinity, minHeight: 60)
                                        .background(
                                            RoundedRectangle(cornerRadius: 10)
                                                .fill(isTarget ? Color.amber : Color.white.opacity(0.07))
                                                .overlay(
                                                    RoundedRectangle(cornerRadius: 10)
                                                        .strokeBorder(isTarget ? Color.amber.opacity(0.8) : Color.clear, lineWidth: 1.5)
                                                )
                                        )
                                        .foregroundColor(isTarget ? .black : .white)
                                    }
                                }
                            }
                        }
                        .padding(14)
                        .background(cardBackground)

                        // Solve button
                        Button(action: { vm.runSolver() }) {
                            HStack(spacing: 8) {
                                if vm.isSolving {
                                    ProgressView().tint(.white).scaleEffect(0.85)
                                } else {
                                    Image(systemName: "wand.and.stars")
                                        .font(.system(size: 16, weight: .bold))
                                }
                                Text(vm.isSolving ? "Calculating…" : "Find Best Move")
                                    .font(.system(size: 16, weight: .bold, design: .rounded))
                            }
                            .frame(maxWidth: .infinity, minHeight: 52)
                            .background(
                                LinearGradient(
                                    colors: [Color.solverPurple, Color(red: 0.35, green: 0.15, blue: 0.80)],
                                    startPoint: .leading, endPoint: .trailing
                                )
                            )
                            .foregroundColor(.white)
                            .cornerRadius(14)
                            .shadow(color: Color.solverPurple.opacity(0.4), radius: 10, y: 4)
                        }
                        .disabled(vm.isSolving)

                        // Solver result
                        if let move = vm.bestMove {
                            SolverResultCard(move: move, onApply: {
                                vm.applyBestMove()
                                dismiss()
                            })
                        } else if let msg = vm.solverMessage, !vm.isSolving {
                            Text(msg)
                                .font(.system(size: 13, design: .rounded))
                                .foregroundColor(.white.opacity(0.5))
                                .multilineTextAlignment(.center)
                                .padding()
                        }

                        Spacer(minLength: 20)
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Solver")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color(red: 0.07, green: 0.09, blue: 0.13), for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color.amber)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.ultraThinMaterial)
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
    }

    private func sectionLabel(_ text: String, icon: String) -> some View {
        Label(text, systemImage: icon)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundColor(.white.opacity(0.4))
            .tracking(1.5)
    }
}

// MARK: - Solver Result Card

struct SolverResultCard: View {
    let move: MoveOption
    let onApply: () -> Void

    private func arrowLabel(_ id: String) -> String {
        let parts = id.split(separator: "_")
        guard parts.count == 2, let idx = Int(parts[1]) else { return id }
        switch parts[0] {
        case "top":    return "↓ Slide column \(idx) down"
        case "bottom": return "↑ Slide column \(idx) up"
        case "left":   return "→ Slide row \(idx) right"
        case "right":  return "← Slide row \(idx) left"
        default:       return id
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            // Status badge
            HStack(spacing: 8) {
                Image(systemName: move.isTargetReached ? "star.circle.fill" : "lightbulb.fill")
                    .font(.system(size: 16))
                    .foregroundColor(move.isTargetReached ? Color.amber : Color.solverPurple)
                Text(move.isTargetReached ? "TARGET REACHABLE THIS TURN!" : "BEST AVAILABLE MOVE")
                    .font(.system(size: 11, weight: .black, design: .rounded))
                    .foregroundColor(move.isTargetReached ? Color.amber : Color.solverPurple)
                    .tracking(0.5)
            }

            Divider().background(Color.white.opacity(0.1))

            // Move details
            VStack(alignment: .leading, spacing: 8) {
                resultRow(label: "Slide",
                          value: arrowLabel(move.arrowId),
                          icon: "arrow.up.and.down.and.arrow.left.and.right")
                resultRow(label: "Rotate spare",
                          value: "\(move.tileRotation.rawValue)°",
                          icon: "rotate.right")
                if !move.isTargetReached {
                    resultRow(label: "Distance to target",
                              value: "\(move.distanceToTarget) tiles",
                              icon: "ruler")
                }
            }

            // Apply button
            Button(action: onApply) {
                HStack(spacing: 8) {
                    Image(systemName: "play.fill")
                    Text("Apply This Move")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                }
                .frame(maxWidth: .infinity, minHeight: 46)
                .background(
                    move.isTargetReached
                    ? LinearGradient(colors: [Color.amber, Color(red: 0.85, green: 0.55, blue: 0.05)], startPoint: .leading, endPoint: .trailing)
                    : LinearGradient(colors: [Color.solverPurple, Color(red: 0.35, green: 0.15, blue: 0.80)], startPoint: .leading, endPoint: .trailing)
                )
                .foregroundColor(move.isTargetReached ? .black : .white)
                .cornerRadius(12)
            }
        }
        .padding(16)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color(white: 0.10))
                .overlay(
                    RoundedRectangle(cornerRadius: 16)
                        .strokeBorder(
                            move.isTargetReached ? Color.amber.opacity(0.4) : Color.solverPurple.opacity(0.3),
                            lineWidth: 1.5
                        )
                )
        )
    }

    private func resultRow(label: String, value: String, icon: String) -> some View {
        HStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 13))
                .foregroundColor(.white.opacity(0.35))
                .frame(width: 20)
            Text(label)
                .font(.system(size: 13, design: .rounded))
                .foregroundColor(.white.opacity(0.5))
            Spacer()
            Text(value)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundColor(.white)
        }
    }
}

// MARK: - Settings Sheet

struct SettingsSheet: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                Color(red: 0.07, green: 0.09, blue: 0.13).ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        // Pawn positions section
                        VStack(alignment: .leading, spacing: 12) {
                            sectionLabel("PAWN POSITIONS", icon: "person.fill")
                            VStack(spacing: 8) {
                                ForEach(PawnColor.allCases, id: \.id) { pawn in
                                    let pos = vm.pawnPositions[pawn]
                                    HStack {
                                        PawnToken(color: pawn, isActive: false, size: 24)
                                        Text(pawn.displayName)
                                            .font(.system(size: 14, weight: .semibold, design: .rounded))
                                            .foregroundColor(.white)
                                        Spacer()
                                        Text("R\(pos.row) C\(pos.col)")
                                            .font(.system(size: 12, design: .monospaced))
                                            .foregroundColor(.white.opacity(0.4))
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 8)
                                    .background(RoundedRectangle(cornerRadius: 10).fill(Color.white.opacity(0.06)))
                                }
                            }
                        }
                        .padding(14)
                        .background(cardBackground)

                        // Game actions
                        VStack(alignment: .leading, spacing: 12) {
                            sectionLabel("GAME ACTIONS", icon: "gamecontroller.fill")
                            VStack(spacing: 8) {
                                actionButton(icon: "arrow.counterclockwise", title: "Reset Board",
                                             subtitle: "Return to standard starting layout",
                                             color: Color(red: 0.95, green: 0.35, blue: 0.25)) {
                                    vm.resetBoard(); dismiss()
                                }
                                actionButton(icon: "house.fill", title: "Back to Setup",
                                             subtitle: "Return to the welcome screen",
                                             color: Color.amber) {
                                    dismiss()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { onSetup() }
                                }
                            }
                        }
                        .padding(14)
                        .background(cardBackground)

                        Spacer(minLength: 20)
                    }
                    .padding(16)
                }
            }
            .navigationTitle("Settings")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(Color(red: 0.07, green: 0.09, blue: 0.13), for: .navigationBar)
            .toolbarColorScheme(.dark, for: .navigationBar)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundColor(Color.amber)
                }
            }
        }
        .preferredColorScheme(.dark)
    }

    private var cardBackground: some View {
        RoundedRectangle(cornerRadius: 16)
            .fill(.ultraThinMaterial)
            .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(Color.white.opacity(0.12), lineWidth: 1))
    }

    private func sectionLabel(_ text: String, icon: String) -> some View {
        Label(text, systemImage: icon)
            .font(.system(size: 11, weight: .bold, design: .rounded))
            .foregroundColor(.white.opacity(0.4))
            .tracking(1.5)
    }

    private func actionButton(icon: String, title: String, subtitle: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8).fill(color.opacity(0.2)).frame(width: 36, height: 36)
                    Image(systemName: icon).font(.system(size: 15, weight: .semibold)).foregroundColor(color)
                }
                VStack(alignment: .leading, spacing: 2) {
                    Text(title).font(.system(size: 14, weight: .semibold, design: .rounded)).foregroundColor(.white)
                    Text(subtitle).font(.system(size: 11, design: .rounded)).foregroundColor(.white.opacity(0.4))
                }
                Spacer()
                Image(systemName: "chevron.right").font(.system(size: 11)).foregroundColor(.white.opacity(0.2))
            }
            .padding(.horizontal, 12).padding(.vertical, 10)
            .background(RoundedRectangle(cornerRadius: 12).fill(Color.white.opacity(0.06)))
        }
    }
}
