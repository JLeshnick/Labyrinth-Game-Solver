import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct GameCompleteView: View {
    let vm: GameViewModel
    let onPlayAgain: () -> Void
    let onBackToSetup: () -> Void

    init(vm: GameViewModel, onPlayAgain: @escaping () -> Void, onBackToSetup: @escaping () -> Void) {
        self.vm = vm
        self.onPlayAgain = onPlayAgain
        self.onBackToSetup = onBackToSetup
    }

    var body: some View {
        ZStack {
            Color.black.opacity(0.65).ignoresSafeArea()

            VStack(spacing: 24) {
                // Header Crown / Trophy Icon
                ZStack {
                    Circle()
                        .fill(Color.amberGold.opacity(0.2))
                        .frame(width: 90, height: 90)
                    Text("🏆")
                        .font(.system(size: 48))
                }

                VStack(spacing: 8) {
                    Text("Labyrinth Cleared!")
                        .font(.system(size: 26, weight: .black, design: .rounded))
                        .foregroundColor(.primary)

                    Text("\(vm.myColor.displayName) Pawn Victory")
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                }

                // Stats breakdown card
                VStack(spacing: 12) {
                    statRow(title: "Total Shifts / Moves", value: "\(vm.undoStack.count)")
                    statRow(title: "Game Mode", value: vm.gameMode.displayName)
                    statRow(title: "Active Players", value: "\(vm.activePlayers.count)")
                }
                .padding(16)
                .background(Color.appSecondaryGroupedBg, in: RoundedRectangle(cornerRadius: 16, style: .continuous))

                // Action Buttons
                VStack(spacing: 10) {
                    Button(action: {
                        Haptics.impact(.medium)
                        onPlayAgain()
                    }) {
                        HStack {
                            Image(systemName: "arrow.counterclockwise")
                            Text("Play Again")
                                .font(.system(size: 16, weight: .bold, design: .rounded))
                        }
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity, minHeight: 48)
                        .background(Color.accentForTheme(vm.appAccentTheme), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    }

                    Button(action: {
                        Haptics.selection()
                        onBackToSetup()
                    }) {
                        Text("Back to Board Setup")
                            .font(.system(size: 15, weight: .semibold, design: .rounded))
                            .foregroundColor(.secondary)
                            .frame(maxWidth: .infinity, minHeight: 44)
                    }
                }
            }
            .padding(24)
            .liquidGlassCard(cornerRadius: 24)
            .padding(.horizontal, 28)
        }
    }

    private func statRow(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(.secondary)
            Spacer()
            Text(value)
                .font(.system(size: 14, weight: .bold, design: .monospaced))
                .foregroundColor(.primary)
        }
    }
}
