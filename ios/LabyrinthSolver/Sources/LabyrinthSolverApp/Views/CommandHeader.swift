import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct CommandHeader: View {
    @Bindable var vm: GameViewModel
    let onOpenSettings: () -> Void
    let onOpenHistory: () -> Void

    init(vm: GameViewModel, onOpenSettings: @escaping () -> Void, onOpenHistory: @escaping () -> Void) {
        self.vm = vm
        self.onOpenSettings = onOpenSettings
        self.onOpenHistory = onOpenHistory
    }

    var body: some View {
        HStack(spacing: 10) {
            // Active Pawn Menu
            Menu {
                ForEach(vm.activePlayers, id: \.id) { pawn in
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
                .liquidGlassCapsule()
            }

            Spacer(minLength: 4)

            // Undo / Redo / History / Settings Toolbar
            HStack(spacing: 6) {
                iconButton("arrow.uturn.backward", isEnabled: vm.canUndo, action: vm.undo)
                iconButton("arrow.uturn.forward", isEnabled: vm.canRedo, action: vm.redo)
                iconButton("clock.arrow.circlepath", isEnabled: !vm.undoStack.isEmpty, action: onOpenHistory)
                iconButton("gearshape.fill", isEnabled: true, action: onOpenSettings)
            }
        }
        .padding(8)
        .liquidGlassCard(cornerRadius: 18, isInteractive: true)
    }

    private func iconButton(_ systemName: String, isEnabled: Bool, action: @escaping () -> Void) -> some View {
        Button(action: {
            Haptics.selection()
            action()
        }) {
            Image(systemName: systemName)
                .font(.system(size: 14, weight: .bold))
                .foregroundColor(isEnabled ? .primary : .secondary.opacity(0.35))
                .frame(width: 36, height: 36)
                .background(Color.appTertiaryGroupedBg, in: Circle())
        }
        .disabled(!isEnabled)
    }
}
