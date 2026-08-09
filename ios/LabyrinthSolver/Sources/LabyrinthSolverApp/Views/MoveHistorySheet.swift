import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct MoveHistorySheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    init(vm: GameViewModel) {
        self.vm = vm
    }

    var body: some View {
        NavigationStack {
            Group {
                if vm.undoStack.isEmpty {
                    VStack(spacing: 16) {
                        Spacer()
                        Image(systemName: "clock.arrow.circlepath")
                            .font(.system(size: 48, weight: .light))
                            .foregroundColor(.secondary)
                        Text("No Moves Recorded Yet")
                            .font(.system(size: 18, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                        Text("Make slide or move turns during the game to build your move history timeline.")
                            .font(.system(size: 14, design: .rounded))
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal, 32)
                        Spacer()
                    }
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(Array(vm.undoStack.enumerated().reversed()), id: \.offset) { index, entry in
                                historyCard(index: index + 1, entry: entry)
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(Color.appGroupedBg)
            .navigationTitle("Move History (\(vm.undoStack.count))")
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { dismiss() }
                        .font(.system(size: 15, weight: .bold, design: .rounded))
                }
            }
        }
    }

    private func historyCard(index: Int, entry: HistoryEntry) -> some View {
        HStack(spacing: 14) {
            ZStack {
                Circle()
                    .fill(Color.accentForTheme(vm.appAccentTheme).opacity(0.15))
                    .frame(width: 36, height: 36)
                Text("#\(index)")
                    .font(.system(size: 13, weight: .black, design: .monospaced))
                    .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
            }

            VStack(alignment: .leading, spacing: 4) {
                if let slide = entry.lastArrowId {
                    Text("Board Shift: \(SolverEngine.arrowDisplayName(slide))")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                } else {
                    Text("Initial Board State")
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundColor(.primary)
                }
            }

            Spacer()
        }
        .padding(14)
        .liquidGlassCard(cornerRadius: 16)
    }

    private func pawnEmoji(_ p: PawnColor) -> String {
        switch p {
        case .red: return "🔴"
        case .blue: return "🔵"
        case .green: return "🟢"
        case .yellow: return "🟡"
        }
    }
}
