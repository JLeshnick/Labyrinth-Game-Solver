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
            HStack(spacing: 8) {
                Image(systemName: "map.fill")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                Text("Labyrinth")
                    .font(.system(size: 16, weight: .black, design: .rounded))
                    .foregroundColor(.primary)

                HStack(spacing: 4) {
                    Image(systemName: "stopwatch.fill")
                        .font(.system(size: 11, weight: .bold))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                    Text(vm.formattedTime)
                        .font(.system(size: 12, weight: .bold, design: .monospaced))
                        .foregroundColor(.primary)
                }
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .liquidGlassCapsule()
            }
            .padding(.leading, 6)

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
