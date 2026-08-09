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
    @State private var showTargetPicker = false
    @Environment(\.colorScheme) private var colorScheme

    var body: some View {
        ZStack {
            gameBackground
                .ignoresSafeArea()

            VStack(spacing: 0) {
                commandHeader
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 8)

                boardStage

                solverConsole
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 12)
                    .background(.regularMaterial)
            }

            if let msg = vm.toastMessage {
                VStack {
                    Spacer()
                    ToastView(message: msg)
                        .padding(.bottom, 18)
                }
                .zIndex(100)
            }

            if vm.isSolving {
                Color.black.opacity(0.20)
                    .ignoresSafeArea()
                    .overlay {
                        VStack(spacing: 14) {
                            ProgressView()
                                .scaleEffect(1.25)
                            Text("Finding routes")
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                        }
                        .padding(.horizontal, 22)
                        .padding(.vertical, 18)
                        .background(.regularMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .zIndex(50)
            }
        }
        .animation(.spring(response: 0.28, dampingFraction: 0.82), value: vm.stagedArrowId)
        .animation(.easeInOut(duration: 0.16), value: vm.isSolving)
        .sheet(isPresented: $showSettingsSheet) {
            SettingsSheet(vm: vm, onSetup: onSetup)
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
        .sheet(isPresented: $showTargetPicker) {
            TargetPickerSheet(vm: vm)
                .presentationDetents([.medium, .large])
                .presentationDragIndicator(.visible)
        }
    }

    private var gameBackground: Color {
        colorScheme == .dark ? Color(red: 0.09, green: 0.10, blue: 0.12) : Color(red: 0.95, green: 0.96, blue: 0.97)
    }

    private var commandHeader: some View {
        HStack(spacing: 10) {
            playerMenu
            phaseBadge
            Spacer(minLength: 8)
            iconButton("arrow.uturn.backward", isEnabled: vm.canUndo, action: vm.undo)
            iconButton("arrow.uturn.forward", isEnabled: vm.canRedo, action: vm.redo)
            iconButton("gearshape", isEnabled: true, action: { showSettingsSheet = true })
        }
        .padding(10)
        .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }

    private var playerMenu: some View {
        Menu {
            ForEach(vm.activePlayers) { pawn in
                Button {
                    vm.activePawn = pawn
                    vm.refreshReachable()
                } label: {
                    Label(pawn.displayName, systemImage: pawn == vm.activePawn ? "checkmark.circle.fill" : "circle")
                }
            }
        } label: {
            HStack(spacing: 7) {
                PawnToken(color: vm.activePawn, isActive: true, size: 24)
                Text(vm.activePawn.displayName)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                Image(systemName: "chevron.down")
                    .font(.system(size: 10, weight: .bold))
                    .foregroundColor(.secondary)
            }
            .padding(.horizontal, 10)
            .frame(height: 38)
            .background(Color.appTertiaryGroupedBg, in: Capsule())
        }
    }

    private var phaseBadge: some View {
        HStack(spacing: 7) {
            Image(systemName: vm.turnPhase == .slide ? "arrow.left.arrow.right" : "figure.walk")
                .font(.system(size: 12, weight: .bold))
            Text(vm.turnPhase == .slide ? "Slide" : "Move")
                .font(.system(size: 13, weight: .black, design: .rounded))
        }
        .foregroundColor(vm.turnPhase == .slide ? Color.orange : Color.green)
        .padding(.horizontal, 11)
        .frame(height: 38)
        .background((vm.turnPhase == .slide ? Color.orange : Color.green).opacity(0.13), in: Capsule())
    }

    private func iconButton(_ systemName: String, isEnabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            Haptics.selection()
            action()
        }) {
            Image(systemName: systemName)
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(isEnabled ? .primary : .secondary.opacity(0.35))
                .frame(width: 38, height: 38)
                .background(Color.appTertiaryGroupedBg, in: Circle())
        }
        .disabled(!isEnabled)
    }

    private var boardStage: some View {
        GeometryReader { geo in
            let maxBoard = min(geo.size.width - 22, geo.size.height - 8)
            VStack(spacing: 0) {
                Spacer(minLength: 0)
                LabyrinthBoardView(vm: vm)
                    .frame(width: maxBoard, height: maxBoard)
                    .shadow(color: .black.opacity(colorScheme == .dark ? 0.30 : 0.10), radius: 18, y: 8)
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var solverConsole: some View {
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                Button(action: { showTargetPicker = true }) {
                    HStack(spacing: 9) {
                        Text(activeTargetEmoji)
                            .font(.system(size: 24))
                            .frame(width: 32)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Target")
                                .font(.system(size: 10, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                            Text(activeTargetName)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                                .lineLimit(1)
                        }
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                    .foregroundColor(.primary)
                    .padding(10)
                    .frame(maxWidth: .infinity, minHeight: 58)
                    .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                spareTileControl
            }

            if vm.stagedArrowId != nil {
                stagedControls
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            } else {
                solveControls
            }

            if !vm.solverOptions.isEmpty {
                solverSuggestions
            }
        }
    }

    private var spareTileControl: some View {
        Button(action: {
            Haptics.selection()
            vm.rotateSpareTile()
        }) {
            VStack(spacing: 4) {
                TileView(tile: vm.spareTile)
                    .frame(width: 38, height: 38)
                HStack(spacing: 3) {
                    Image(systemName: "rotate.right")
                        .font(.system(size: 10, weight: .bold))
                    Text("\(vm.spareTile.rotation.rawValue)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                }
                .foregroundColor(.secondary)
            }
            .frame(width: 68, height: 58)
            .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        }
    }

    private var solveControls: some View {
        HStack(spacing: 10) {
            Button(action: {
                Haptics.impact(.medium)
                vm.runSolverAndStage()
            }) {
                Label("Solve Best Move", systemImage: "sparkles")
                    .font(.system(size: 15, weight: .black, design: .rounded))
                    .frame(maxWidth: .infinity, minHeight: 46)
            }
            .buttonStyle(.borderedProminent)
            .disabled(vm.isSolving)

            Button(action: {
                Haptics.selection()
                vm.clearActiveTarget()
            }) {
                Image(systemName: "scope")
                    .font(.system(size: 16, weight: .bold))
                    .frame(width: 44, height: 44)
            }
            .buttonStyle(.bordered)
        }
    }

    private var stagedControls: some View {
        VStack(spacing: 8) {
            if let move = vm.stagedAiMove {
                SolverOptionCard(
                    move: move,
                    rank: 1,
                    isSelected: true,
                    targetName: activeTargetName,
                    onTap: {}
                )
            } else if let arrowId = vm.stagedArrowId {
                HStack(spacing: 10) {
                    Image(systemName: "arrow.right.circle.fill")
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    Text("Staged \(arrowDisplayName(arrowId)) at \(vm.stagedRotation.rawValue)°")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                    Spacer()
                }
                .padding(12)
                .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }

            HStack(spacing: 10) {
                Button(action: {
                    Haptics.selection()
                    vm.cancelStage()
                }) {
                    Label("Cancel", systemImage: "xmark")
                        .frame(maxWidth: .infinity, minHeight: 42)
                }
                .buttonStyle(.bordered)

                Button(action: {
                    Haptics.impact(.heavy)
                    vm.commitSlide()
                }) {
                    Label("Slide In", systemImage: "checkmark")
                        .font(.system(size: 15, weight: .black, design: .rounded))
                        .frame(maxWidth: .infinity, minHeight: 42)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    private var solverSuggestions: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Suggestions")
                    .font(.system(size: 12, weight: .black, design: .rounded))
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(vm.solverOptions.count)")
                    .font(.system(size: 11, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(vm.solverOptions.enumerated()), id: \.element.id) { index, option in
                        SolverOptionCard(
                            move: option,
                            rank: index + 1,
                            isSelected: vm.stagedAiMove?.id == option.id,
                            targetName: activeTargetName,
                            onTap: {
                                Haptics.selection()
                                vm.stageSolverOption(option)
                            }
                        )
                        .frame(width: 238)
                    }
                }
                .padding(.bottom, 2)
            }
        }
    }

    private var activeTargetName: String {
        guard let targetId = vm.activeTargetId else {
            return "Auto from hand"
        }
        return GameConstants.treasures.first(where: { $0.id == targetId })?.name ?? targetId
    }

    private var activeTargetEmoji: String {
        guard let targetId = vm.activeTargetId else { return "🎯" }
        return GameConstants.treasures.first(where: { $0.id == targetId })?.emoji ?? "🎯"
    }

    private func arrowDisplayName(_ arrowId: String) -> String {
        let parts = arrowId.split(separator: "_")
        guard parts.count == 2, let index = Int(parts[1]) else { return arrowId }
        switch String(parts[0]) {
        case "top": return "column \(index + 1) down"
        case "bottom": return "column \(index + 1) up"
        case "left": return "row \(index + 1) right"
        case "right": return "row \(index + 1) left"
        default: return arrowId
        }
    }
}

struct SolverOptionCard: View {
    let move: MoveOption
    let rank: Int
    let isSelected: Bool
    let targetName: String
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 8) {
                    Text("#\(rank)")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundColor(.white)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 4)
                        .background(isSelected ? Color.accentColor : Color.secondary, in: Capsule())

                    Text(move.isTargetReached ? (move.turnsToTarget == 1 ? "Reach now" : "\(move.turnsToTarget)-turn route") : "Improve")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundColor(move.isTargetReached ? .green : .orange)

                    Spacer()

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(isSelected ? .accentColor : .secondary)
                }

                Text(move.summaryText)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                HStack(spacing: 6) {
                    compactMetric("Turns", "\(move.turnsToTarget)")
                    compactMetric("Reach", "\(move.reachableCount)")
                    compactMetric("Safe", "\(move.safetyScore)%")
                }
            }
            .padding(11)
            .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(isSelected ? Color.accentColor.opacity(0.65) : Color.clear, lineWidth: 1.5)
            )
        }
        .buttonStyle(.plain)
    }

    private func compactMetric(_ title: String, _ value: String) -> some View {
        VStack(alignment: .leading, spacing: 1) {
            Text(title)
                .font(.system(size: 8, weight: .black, design: .rounded))
                .foregroundColor(.secondary)
            Text(value)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 7)
        .padding(.vertical, 5)
        .background(Color.appTertiaryGroupedBg, in: RoundedRectangle(cornerRadius: 8, style: .continuous))
    }
}

struct TargetPickerSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    private let columns = [
        GridItem(.adaptive(minimum: 72), spacing: 10)
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVGrid(columns: columns, spacing: 10) {
                    Button {
                        vm.clearActiveTarget()
                        dismiss()
                    } label: {
                        targetCell(emoji: "🎯", name: "Auto", isSelected: vm.singleTargetId == nil)
                    }

                    ForEach(GameConstants.treasures, id: \.id) { treasure in
                        Button {
                            vm.setActiveTarget(treasureId: treasure.id)
                            dismiss()
                        } label: {
                            targetCell(
                                emoji: treasure.emoji,
                                name: treasure.name,
                                isSelected: vm.singleTargetId == treasure.id
                            )
                        }
                    }
                }
                .padding(16)
            }
            .background(Color.appGroupedBg)
            .navigationTitle("Choose Target")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
        }
    }

    private func targetCell(emoji: String, name: String, isSelected: Bool) -> some View {
        VStack(spacing: 6) {
            Text(emoji)
                .font(.system(size: 26))
            Text(name)
                .font(.system(size: 11, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, minHeight: 74)
        .padding(8)
        .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(isSelected ? Color.accentColor : Color.clear, lineWidth: 2)
        )
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
                            Divider()
                            Stepper(value: $vm.solverDepth, in: 1...3) {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Solver Lookahead")
                                        .font(.system(size: 16, weight: .semibold, design: .rounded))
                                    Text("\(vm.solverDepth) \(vm.solverDepth == 1 ? "turn" : "turns")")
                                        .font(.system(size: 12, design: .rounded))
                                        .foregroundColor(.secondary)
                                }
                            }
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
