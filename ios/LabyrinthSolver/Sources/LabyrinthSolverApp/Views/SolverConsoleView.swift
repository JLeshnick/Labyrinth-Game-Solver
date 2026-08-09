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
            HStack(spacing: 8) {
                // Navigate To target button & clear action
                let hasTarget = vm.activeTargetId != nil || vm.activeTargetPosition != nil
                HStack(spacing: 6) {
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
                            if !hasTarget {
                                Image(systemName: "chevron.up.chevron.down")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundColor(.secondary)
                            }
                        }
                    }
                    .buttonStyle(.plain)

                    if hasTarget {
                        Button(action: {
                            Haptics.selection()
                            vm.clearActiveTarget()
                        }) {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(.secondary)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .frame(maxWidth: .infinity, minHeight: 44)
                .liquidGlassCard(cornerRadius: 14, isInteractive: true)

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
                        guard hasTarget else { return }
                        Haptics.selection()
                        SoundManager.shared.play(.solverComplete, enabled: vm.enableSound)
                        vm.runSolverAndStage()
                    }) {
                        Image(systemName: "sparkles")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white)
                            .frame(width: 44, height: 44)
                            .background(
                                hasTarget ? Color.accentForTheme(vm.appAccentTheme) : Color.gray.opacity(0.35),
                                in: RoundedRectangle(cornerRadius: 14, style: .continuous)
                            )
                            .shadow(color: hasTarget ? Color.accentForTheme(vm.appAccentTheme).opacity(0.4) : .clear, radius: 6, y: 3)
                            .opacity(hasTarget ? 1.0 : 0.4)
                    }
                    .disabled(vm.isSolving || !hasTarget)
                    .buttonStyle(.plain)
                }
            }

            if vm.turnPhase == .move && vm.stagedArrowId == nil {
                HStack(spacing: 8) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("MOVE PHASE")
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundColor(.green)
                        Text("Tap tile to move, or End Turn to stay.")
                            .font(.system(size: 11, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                            .lineLimit(1)
                    }
                    .padding(.horizontal, 10)
                    .frame(maxWidth: .infinity, minHeight: 44, alignment: .leading)
                    .liquidGlassCard(cornerRadius: 14)

                    Button(action: {
                        Haptics.selection()
                        vm.passMoveTurn()
                    }) {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.system(size: 14, weight: .bold))
                            Text("End Turn")
                                .font(.system(size: 12, weight: .bold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12)
                        .frame(height: 44)
                        .background(Color.green, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }
                    .buttonStyle(.plain)
                }
            }

            if vm.stagedArrowId != nil {
                stagedControls
                    .transition(.opacity.combined(with: .move(edge: .bottom)))
            }

            solverSuggestions
        }
    }

    private var stagedControls: some View {
        HStack(spacing: 8) {
            let stagedId = vm.stagedArrowId!
            let expelledId = GameConstants.oppositeArrowId(for: stagedId) ?? stagedId
            let nextSpareTile = vm.previewState?.spareTile

            HStack(spacing: 8) {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 4) {
                        Text("SLIDE PREVIEW")
                            .font(.system(size: 9, weight: .black, design: .rounded))
                            .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                        Spacer()
                    }
                    Text("In: \(SolverEngine.arrowDisplayName(stagedId)) → Out: \(SolverEngine.arrowDisplayName(expelledId))")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                        .lineLimit(1)
                }

                if let nextSpare = nextSpareTile {
                    HStack(spacing: 4) {
                        Image(systemName: "arrow.right")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.secondary)
                        
                        VStack(spacing: 1) {
                            Text("New Spare")
                                .font(.system(size: 8, weight: .bold, design: .rounded))
                                .foregroundColor(.secondary)
                            TileView(tile: nextSpare)
                                .frame(width: 26, height: 26)
                        }
                    }
                }
            }
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
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
                Text(vm.solverOptions.isEmpty ? "Solver Recommendations" : "Alternative Solver Recommendations")
                    .font(.system(size: 11, weight: .heavy, design: .rounded))
                    .foregroundColor(.secondary)
                Spacer()
                if !vm.solverOptions.isEmpty {
                    Text("\(vm.solverOptions.count)")
                        .font(.system(size: 10, weight: .bold, design: .monospaced))
                        .foregroundColor(.secondary)
                }
            }

            if vm.solverOptions.isEmpty {
                HStack(spacing: 8) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    Text(vm.activeTargetId != nil || vm.activeTargetPosition != nil ? "Calculating routes..." : "Tap any tile or treasure on board to view solver routes")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 14)
                .frame(maxWidth: .infinity, minHeight: 76, maxHeight: 76, alignment: .leading)
                .liquidGlassCard(cornerRadius: 16)
            } else {
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
    }

    private var activeTargetName: String {
        if let targetId = vm.activeTargetId,
           let treasure = GameConstants.treasures.first(where: { $0.id == targetId }) {
            return treasure.name
        }
        if let pos = vm.activeTargetPosition {
            return "Tile (\(pos.row + 1), \(pos.col + 1))"
        }
        return "Select Target Tile"
    }

    private var activeTargetEmoji: String {
        if let targetId = vm.activeTargetId,
           let treasure = GameConstants.treasures.first(where: { $0.id == targetId }) {
            return treasure.emoji
        }
        if vm.activeTargetPosition != nil {
            return "📍"
        }
        return "🎯"
    }
}
