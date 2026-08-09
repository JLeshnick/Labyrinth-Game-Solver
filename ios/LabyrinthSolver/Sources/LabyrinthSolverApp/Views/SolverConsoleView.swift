import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct SolverConsoleView: View {
    @Bindable var vm: GameViewModel
    let onOpenTargetPicker: () -> Void

    init(vm: GameViewModel, onOpenTargetPicker: @escaping () -> Void) {
        self.vm = vm
        self.onOpenTargetPicker = onOpenTargetPicker
    }

    var body: some View {
        VStack(spacing: 10) {
            reachableTreasuresBar

            HStack(spacing: 8) {
                // Navigate To button
                Button(action: {
                    Haptics.selection()
                    onOpenTargetPicker()
                }) {
                    HStack(spacing: 8) {
                        Text(activeTargetEmoji).font(.system(size: 16))
                        Text(activeTargetName)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                        Spacer(minLength: 0)
                        Image(systemName: "chevron.up.chevron.down")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.secondary)
                    }
                    .padding(.horizontal, 12)
                    .frame(maxWidth: .infinity, minHeight: 44)
                    .liquidGlassCard(cornerRadius: 14, isInteractive: true)
                }
                .buttonStyle(.plain)

                // Spare tile rotate button
                Button(action: {
                    Haptics.selection()
                    SoundManager.shared.play(.rotateTile, enabled: vm.enableSound)
                    vm.rotateSpareTile()
                }) {
                    TileView(tile: vm.spareTile)
                        .frame(width: 32, height: 32)
                        .padding(6)
                        .liquidGlassCard(cornerRadius: 14, isInteractive: true)
                }
                .buttonStyle(.plain)

                // Solve Button
                if vm.stagedArrowId == nil {
                    Button(action: {
                        Haptics.selection()
                        SoundManager.shared.play(.solverComplete, enabled: vm.enableSound)
                        vm.runSolverAndStage()
                    }) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.accentForTheme(vm.appAccentTheme), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                            .shadow(color: Color.accentForTheme(vm.appAccentTheme).opacity(0.4), radius: 6, y: 3)
                    }
                    .disabled(vm.isSolving)
                    .buttonStyle(.plain)
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
            HStack {
                Label("Reachable in 1 Turn", systemImage: "sparkles")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(.secondary)
                Spacer()
                if !vm.oneTurnReachableTreasures.isEmpty {
                    Text("\(vm.oneTurnReachableTreasures.count) available")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                }
            }

            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        if vm.oneTurnReachableTreasures.isEmpty {
                            Text("No treasures reachable in 1 turn.")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundColor(.secondary)
                                .padding(.vertical, 4)
                        } else {
                            ForEach(vm.oneTurnReachableTreasures, id: \.id) { treasure in
                                Button(action: {
                                    Haptics.selection()
                                    vm.setActiveTarget(treasureId: treasure.id)
                                }) {
                                    HStack(spacing: 5) {
                                        Text(treasure.emoji)
                                            .font(.system(size: 13))
                                        Text(treasure.shortName)
                                            .font(.system(size: 12, weight: .bold, design: .rounded))
                                    }
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 7)
                                    .liquidGlassCapsule(
                                        isSelected: vm.activeTargetId == treasure.id,
                                        tintColor: vm.activeTargetId == treasure.id ? Color.accentForTheme(vm.appAccentTheme) : nil
                                    )
                                    .foregroundColor(.primary)
                                }
                                .buttonStyle(.plain)
                                .id(treasure.id)
                            }
                        }
                    }
                    .padding(.vertical, 4)
                    .padding(.leading, 2)
                    .padding(.trailing, 16)
                }
                .onChange(of: vm.activeTargetId) { _, targetId in
                    if let targetId {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            proxy.scrollTo(targetId, anchor: .center)
                        }
                    }
                }
            }
        }
        .padding(.leading, 10)
        .padding(.vertical, 10)
        .padding(.trailing, 4)
        .liquidGlassCard(cornerRadius: 16)
    }

    private var stagedControls: some View {
        HStack(spacing: 8) {
            let stagedId = vm.stagedArrowId!
            let expelledId = GameConstants.oppositeArrowId(for: stagedId) ?? stagedId
            
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 4) {
                    Text("SLIDE STAGED")
                        .font(.system(size: 10, weight: .black, design: .rounded))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    Spacer()
                    if let pos = vm.activeTargetPosition {
                        Text("Target: (\(pos.row + 1), \(pos.col + 1))")
                            .font(.system(size: 9, weight: .bold, design: .monospaced))
                            .foregroundColor(.secondary)
                    }
                }
                Text("Insert: \(SolverEngine.arrowDisplayName(stagedId))  •  Expels: \(SolverEngine.arrowDisplayName(expelledId))")
                    .font(.system(size: 11, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(1)
            }
            .padding(.horizontal, 10)
            .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
            .liquidGlassCard(cornerRadius: 14)

            Button(action: {
                Haptics.selection()
                vm.cancelStage()
            }) {
                Image(systemName: "xmark")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.red, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)

            Button(action: {
                Haptics.selection()
                SoundManager.shared.play(.slideIn, enabled: vm.enableSound)
                vm.commitSlide()
            }) {
                Image(systemName: "checkmark")
                    .font(.system(size: 15, weight: .heavy))
                    .foregroundColor(.white)
                    .frame(width: 44, height: 44)
                    .background(Color.green, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            }
            .buttonStyle(.plain)
        }
    }

    private var solverSuggestions: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                Text("Alternative Solver Recommendations")
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
                                vm.stageSolverOption(option)
                            }
                        )
                        .frame(width: 210)
                    }
                }
                .padding(.bottom, 2)
            }
        }
    }

    private var activeTargetName: String {
        guard let targetId = vm.activeTargetId else { return "Select Target Treasure" }
        return GameConstants.treasures.first(where: { $0.id == targetId })?.name ?? targetId
    }

    private var activeTargetEmoji: String {
        guard let targetId = vm.activeTargetId else { return "🎯" }
        return GameConstants.treasures.first(where: { $0.id == targetId })?.emoji ?? "🎯"
    }
}
