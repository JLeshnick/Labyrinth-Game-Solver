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

// MARK: - Root View

struct RootView: View {
    @State private var vm = GameViewModel()

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
                    withAnimation(.spring(response: 0.4, dampingFraction: 0.8)) {
                        // isSetupMode toggled inside vm
                    }
                })
                .transition(.asymmetric(
                    insertion: .opacity,
                    removal: .move(edge: .leading).combined(with: .opacity)
                ))
            } else {
                GameView(vm: vm, onSetup: {
                    withAnimation { vm.isSetupMode = true }
                })
                .transition(.asymmetric(
                    insertion: .move(edge: .trailing).combined(with: .opacity),
                    removal: .opacity
                ))
            }
        }
        .preferredColorScheme(currentScheme)
        .tint(Color.accentForTheme(vm.appAccentTheme))
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
            Color.appGroupedBg.ignoresSafeArea()

            VStack(spacing: 0) {
                commandHeader
                    .padding(.horizontal, 16)
                    .padding(.top, 10)
                    .padding(.bottom, 8)
                    .zIndex(1)

                boardStage
                    .zIndex(0)

                solverConsole
                    .padding(.horizontal, 16)
                    .padding(.top, 8)
                    .padding(.bottom, 12)
                    .background(.ultraThinMaterial)
                    .zIndex(1)
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
                Color.black.opacity(0.40)
                    .ignoresSafeArea()
                    .overlay {
                        VStack(spacing: 14) {
                            ProgressView()
                                .scaleEffect(1.25)
                                .tint(.white)
                            Text("Calculating Routes...")
                                .font(.system(size: 15, weight: .semibold, design: .rounded))
                                .foregroundColor(.white)
                        }
                        .padding(.horizontal, 22)
                        .padding(.vertical, 18)
                        .liquidGlassCard()
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

    private var commandHeader: some View {
        HStack(spacing: 10) {
            Menu {
                ForEach(PawnColor.allCases, id: \.id) { pawn in
                    Button {
                        if let idx = vm.activePlayers.firstIndex(of: pawn) {
                            vm.currentPlayerIndex = idx
                            vm.refreshReachable()
                        }
                    } label: {
                        Label(pawn.displayName, systemImage: pawn == vm.myColor ? "checkmark.circle.fill" : "circle")
                    }
                }
            } label: {
                HStack(spacing: 7) {
                    PawnToken(color: vm.myColor, isActive: true, size: 24)
                    Text("My Pawn")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                    Image(systemName: "chevron.down")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 10)
                .frame(height: 38)
                .background(Color.appTertiaryGroupedBg, in: Capsule())
            }

            Spacer(minLength: 8)
            
            iconButton("arrow.uturn.backward", isEnabled: vm.canUndo, action: vm.undo)
            iconButton("arrow.uturn.forward", isEnabled: vm.canRedo, action: vm.redo)
            iconButton("gearshape.fill", isEnabled: true, action: { showSettingsSheet = true })
        }
        .padding(10)
        .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .shadow(color: .black.opacity(0.1), radius: 5, y: 3)
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
                Spacer(minLength: 0)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
    }

    private var solverConsole: some View {
        VStack(spacing: 8) {
            reachableTreasuresBar
            
            HStack(spacing: 8) {
                // Navigate To button - make it slimmer
                Button(action: { showTargetPicker = true }) {
                    HStack(spacing: 8) {
                        Text(activeTargetEmoji).font(.system(size: 16))
                        Text(activeTargetName)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        Spacer()
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
                }

                // Spare tile
                Button(action: {
                    Haptics.selection()
                    vm.rotateSpareTile()
                }) {
                    TileView(tile: vm.spareTile)
                        .frame(width: 32, height: 32)
                        .padding(6)
                        .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
                }
                
                // Solve Button
                if vm.stagedArrowId == nil {
                    Button(action: {
                        Haptics.impact(.medium)
                        vm.runSolverAndStage()
                    }) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.accentForTheme(vm.appAccentTheme), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                    }
                    .disabled(vm.isSolving)
                }
            }

            if vm.stagedArrowId != nil {
                stagedControls
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }
            if !vm.solverOptions.isEmpty {
                solverSuggestions
            }
        }
    }

    private var reachableTreasuresBar: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Reachable in 1 Turn")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundColor(.secondary)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 10) {
                    if vm.oneTurnReachableTreasures.isEmpty {
                        Text("No treasures reachable.")
                            .font(.system(size: 13, design: .rounded))
                            .foregroundColor(.secondary)
                    } else {
                        ForEach(vm.oneTurnReachableTreasures, id: \.id) { treasure in
                            Button(action: {
                                vm.setActiveTarget(treasureId: treasure.id)
                            }) {
                                HStack(spacing: 4) {
                                    Text(treasure.shortName)
                                        .font(.system(size: 12, weight: .semibold, design: .rounded))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(Color.appTertiaryGroupedBg, in: Capsule())
                                .foregroundColor(.primary)
                                .overlay(
                                    Capsule().strokeBorder(Color.primary.opacity(0.1), lineWidth: 1)
                                )
                            }
                        }
                    }
                }
            }
        }
    }

    private var stagedControls: some View {
        HStack(spacing: 8) {
            if let move = vm.stagedSolverMove {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Top Suggestion")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    Text(move.summaryText)
                        .font(.system(size: 11, weight: .semibold, design: .rounded))
                        .foregroundColor(.primary)
                        .lineLimit(2)
                }
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            } else {
                Text("Staged Slide: \(vm.stagedArrowId!)")
                    .font(.system(size: 13, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .padding(.horizontal, 10)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            
            Button(action: {
                Haptics.selection()
                vm.cancelStage()
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.red, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            
            Button(action: {
                Haptics.impact(.heavy)
                vm.commitSlide()
            }) {
                Image(systemName: "checkmark")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.green, in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
        }
    }

    private var solverSuggestions: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Alternative Suggestions")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundColor(.secondary)
                Spacer()
                Text("\(vm.solverOptions.count)")
                    .font(.system(size: 10, weight: .bold, design: .monospaced))
                    .foregroundColor(.secondary)
            }

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(Array(vm.solverOptions.enumerated()), id: \.element.id) { index, option in
                        SolverOptionCard(
                            move: option,
                            rank: index + 1,
                            isSelected: vm.stagedSolverMove?.id == option.id,
                            targetName: activeTargetName,
                            appAccentTheme: vm.appAccentTheme,
                            onTap: {
                                Haptics.selection()
                                vm.stageSolverOption(option)
                            }
                        )
                        .frame(width: 220)
                    }
                }
                .padding(.bottom, 2)
            }
        }
    }

    private var activeTargetName: String {
        guard let targetId = vm.activeTargetId else { return "Auto (Explore)" }
        return GameConstants.treasures.first(where: { $0.id == targetId })?.name ?? targetId
    }

    private var activeTargetEmoji: String {
        guard let targetId = vm.activeTargetId else { return "🎯" }
        return GameConstants.treasures.first(where: { $0.id == targetId })?.emoji ?? "🎯"
    }
}

// MARK: - Solver Option Card

struct SolverOptionCard: View {
    let move: MoveOption
    let rank: Int
    let isSelected: Bool
    let targetName: String
    let appAccentTheme: AppAccentTheme
    let onTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(spacing: 8) {
                    Text("#\(rank)")
                        .font(.system(size: 12, weight: .black, design: .rounded))
                        .foregroundColor(isSelected ? .white : .primary)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(isSelected ? Color.accentForTheme(appAccentTheme) : Color.secondary.opacity(0.3), in: Capsule())

                    Text(move.isTargetReached ? (move.turnsToTarget == 1 ? "Reach now" : "\(move.turnsToTarget)-turn route") : "Improve position")
                        .font(.system(size: 13, weight: .heavy, design: .rounded))
                        .foregroundColor(move.isTargetReached ? .green : .orange)

                    Spacer()

                    Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(isSelected ? Color.accentForTheme(appAccentTheme) : .secondary)
                }

                Text(move.summaryText)
                    .font(.system(size: 13, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .padding(14)
            .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .strokeBorder(isSelected ? Color.accentForTheme(appAccentTheme) : Color.clear, lineWidth: 2)
            )
            .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Target Picker Sheet

struct TargetPickerSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss
    @Environment(\.colorScheme) private var colorScheme

    private let columns = [
        GridItem(.adaptive(minimum: 100), spacing: 12)
    ]
    
    private var nowReachable: [Treasure] {
        vm.reachableTreasures
    }
    
    private var oneTurnReachable: [Treasure] {
        let nowIds = Set(nowReachable.map { $0.id })
        return vm.oneTurnReachableTreasures.filter { !nowIds.contains($0.id) }
    }
    
    private var others: [Treasure] {
        let nowIds = Set(nowReachable.map { $0.id })
        let oneTurnIds = Set(vm.oneTurnReachableTreasures.map { $0.id })
        return GameConstants.treasures.filter { !nowIds.contains($0.id) && !oneTurnIds.contains($0.id) }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    
                    // Top Auto option
                    Button {
                        vm.clearActiveTarget()
                        dismiss()
                    } label: {
                        HStack(spacing: 12) {
                            Text("🎯").font(.system(size: 28))
                            Text("Auto (Explore)")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                                .foregroundColor(.primary)
                            Spacer()
                            if vm.activeTargetId == nil {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                            }
                        }
                        .padding()
                        .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .strokeBorder(vm.activeTargetId == nil ? Color.accentForTheme(vm.appAccentTheme) : Color.clear, lineWidth: 2.5)
                        )
                        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal, 16)
                    .padding(.top, 16)

                    if !nowReachable.isEmpty {
                        targetSection(title: "Reachable Now (No Slide Needed)", treasures: nowReachable)
                    }
                    
                    if !oneTurnReachable.isEmpty {
                        targetSection(title: "Reachable in 1 Turn", treasures: oneTurnReachable)
                    }
                    
                    if !others.isEmpty {
                        targetSection(title: "Other Treasures", treasures: others)
                    }
                }
                .padding(.bottom, 24)
            }
            .background(Color.appGroupedBg)
            .navigationTitle("Select Target")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                }
            }
        }
    }
    
    @ViewBuilder
    private func targetSection(title: String, treasures: [Treasure]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundColor(.secondary)
                .padding(.horizontal, 20)
            
            LazyVGrid(columns: columns, spacing: 12) {
                ForEach(treasures, id: \.id) { treasure in
                    Button {
                        vm.setActiveTarget(treasureId: treasure.id)
                        dismiss()
                    } label: {
                        targetCell(
                            emoji: treasure.emoji,
                            name: treasure.shortName,
                            isSelected: vm.activeTargetId == treasure.id
                        )
                    }
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func targetCell(emoji: String, name: String, isSelected: Bool) -> some View {
        VStack(spacing: 8) {
            Text(emoji)
                .font(.system(size: 28))
            Text(name)
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .foregroundColor(.primary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity, minHeight: 84)
        .padding(8)
        .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(isSelected ? Color.accentForTheme(vm.appAccentTheme) : Color.clear, lineWidth: 2.5)
        )
        .shadow(color: .black.opacity(0.08), radius: 4, y: 2)
    }
}

// MARK: - Settings Sheet

struct SettingsSheet: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            Form {
                Section(header: Text("Theme & Appearance")) {
                    Picker("Appearance", selection: $vm.appColorScheme) {
                        ForEach(AppColorScheme.allCases) { scheme in
                            Text(scheme.displayName).tag(scheme)
                        }
                    }
                    
                    Picker("Accent Color", selection: $vm.appAccentTheme) {
                        ForEach(AppAccentTheme.allCases) { theme in
                            Text(theme.rawValue.capitalized).tag(theme)
                        }
                    }
                }
                
                Section(header: Text("Board Actions")) {
                    Button("Open Board Builder") {
                        dismiss()
                        onSetup()
                    }
                    .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    
                    Button("Randomize Board") {
                        vm.randomizeBoard()
                        dismiss()
                    }
                    
                    Button("Reset to Standard") {
                        vm.resetBoardLayout()
                        dismiss()
                    }
                }

                Section(header: Text("Solver Settings")) {
                    Stepper("Lookahead: \(vm.solverDepth) turns", value: $vm.solverDepth, in: 1...3)
                }

                Section(header: Text("Preferences")) {
                    Toggle("Sound Effects", isOn: $vm.enableSound)
                    Toggle("Haptic Feedback", isOn: $vm.enableHaptics)
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
