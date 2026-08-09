import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct CommandHeader: View {
    @Bindable var vm: GameViewModel
    let onOpenSettings: () -> Void
    let onOpenHistory: () -> Void
    let onOpenStats: () -> Void

    init(
        vm: GameViewModel,
        onOpenSettings: @escaping () -> Void,
        onOpenHistory: @escaping () -> Void,
        onOpenStats: @escaping () -> Void
    ) {
        self.vm = vm
        self.onOpenSettings = onOpenSettings
        self.onOpenHistory = onOpenHistory
        self.onOpenStats = onOpenStats
    }

    var body: some View {
        HStack(spacing: 8) {
            // Player Selector Pills (Inline Header Ribbon)
            HStack(spacing: 6) {
                ForEach(vm.activePlayers, id: \.id) { pawn in
                    let isActive = vm.myColor == pawn
                    let hand = vm.playerHands[pawn] ?? PlayerHand()
                    let collectedCount = hand.obtainedCards.count
                    let totalCount = max(1, hand.cards.count)

                    Button(action: {
                        Haptics.selection()
                        if let idx = vm.activePlayers.firstIndex(of: pawn) {
                            vm.currentPlayerIndex = idx
                            vm.refreshReachable()
                        }
                    }) {
                        HStack(spacing: 5) {
                            PawnToken(color: pawn, isActive: isActive, size: 18)

                            if isActive {
                                Text("\(collectedCount)/\(totalCount)")
                                    .font(.system(size: 11, weight: .heavy, design: .monospaced))
                                    .foregroundColor(.primary)
                            }
                        }
                        .padding(.horizontal, isActive ? 8 : 4)
                        .padding(.vertical, 4)
                        .background(
                            isActive
                                ? AnyShapeStyle(Color.accentForTheme(vm.appAccentTheme).opacity(0.25))
                                : AnyShapeStyle(Color.appTertiaryGroupedBg.opacity(0.5))
                        )
                        .clipShape(Capsule())
                        .overlay(
                            Capsule()
                                .strokeBorder(isActive ? Color.accentForTheme(vm.appAccentTheme) : Color.clear, lineWidth: 1.5)
                        )
                    }
                    .buttonStyle(.plain)
                }
            }

            Spacer(minLength: 2)

            // Stopwatch / Timer & Stats Trigger
            Button(action: {
                Haptics.selection()
                onOpenStats()
            }) {
                HStack(spacing: 4) {
                    Image(systemName: "stopwatch.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    Text(vm.formattedTime)
                        .font(.system(size: 11, weight: .bold, design: .monospaced))
                        .foregroundColor(.primary)
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 10, weight: .bold))
                        .foregroundColor(.secondary)
                }
                .padding(.horizontal, 7)
                .padding(.vertical, 5)
                .background(Color.appTertiaryGroupedBg, in: Capsule())
            }
            .buttonStyle(.plain)

            // Action Toolbar (Undo / Redo / History / Settings)
            HStack(spacing: 4) {
                iconButton("arrow.uturn.backward", isEnabled: vm.canUndo, action: vm.undo)
                iconButton("arrow.uturn.forward", isEnabled: vm.canRedo, action: vm.redo)
                iconButton("clock.arrow.circlepath", isEnabled: !vm.undoStack.isEmpty, action: onOpenHistory)
                iconButton("gearshape.fill", isEnabled: true, action: onOpenSettings)
            }
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .liquidGlassCard(cornerRadius: 18, isInteractive: true)
    }

    private func iconButton(_ systemName: String, isEnabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            Haptics.selection()
            action()
        }) {
            Image(systemName: systemName)
                .font(.system(size: 13, weight: .bold))
                .foregroundColor(isEnabled ? .primary : .secondary.opacity(0.35))
                .frame(width: 32, height: 32)
                .background(Color.appTertiaryGroupedBg, in: Circle())
        }
        .disabled(!isEnabled)
    }
}
