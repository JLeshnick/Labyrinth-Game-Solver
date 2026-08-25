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
        VStack(spacing: 10) {
            HStack(spacing: 12) {
                // Mini 7x7 Board Preview Snippet
                miniBoardSnippet(entry.board, pawns: entry.pawnPositions)

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Turn #\(index)")
                            .font(.system(size: 13, weight: .black, design: .monospaced))
                            .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                        Spacer()
                    }

                    if let slide = entry.lastArrowId {
                        Text("Shift: \(SolverEngine.arrowDisplayName(slide))")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                    } else {
                        Text("Initial Setup State")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.primary)
                    }
                }
            }

            Divider().opacity(0.4)

            // Action Buttons: Revert Before vs Revert After
            HStack(spacing: 10) {
                Button(action: {
                    Haptics.selection()
                    if index > 1 {
                        vm.revertToHistoryState(index - 2)
                    } else {
                        vm.resetGameSession()
                    }
                    dismiss()
                }) {
                    Label("Revert Before #\(index)", systemImage: "arrow.uturn.backward")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(Color.appSecondaryGroupedBg)
                        .foregroundColor(.primary)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)

                Spacer()

                Button(action: {
                    Haptics.selection()
                    vm.revertToHistoryState(index - 1)
                    dismiss()
                }) {
                    Label("Revert After #\(index)", systemImage: "clock.arrow.circlepath")
                        .font(.system(size: 11, weight: .bold, design: .rounded))
                        .padding(.vertical, 6)
                        .padding(.horizontal, 10)
                        .background(Color.accentForTheme(vm.appAccentTheme))
                        .foregroundColor(.white)
                        .clipShape(Capsule())
                }
                .buttonStyle(.plain)
            }
        }
        .padding(12)
        .liquidGlassCard(cornerRadius: 16)
    }

    private func miniBoardSnippet(_ board: [[TileData]], pawns: PawnPositions) -> some View {
        VStack(spacing: 1) {
            ForEach(0..<7, id: \.self) { r in
                HStack(spacing: 1) {
                    ForEach(0..<7, id: \.self) { c in
                        let tile = board[r][c]
                        ZStack {
                            Rectangle()
                                .fill(tile.isFixed ? Color(red: 0.12, green: 0.14, blue: 0.21) : Color(red: 0.22, green: 0.26, blue: 0.35))

                            if let p = PawnColor.allCases.first(where: { pawns[$0].row == r && pawns[$0].col == c }) {
                                Circle().fill(pawnColor(p))
                                    .frame(width: 4, height: 4)
                            }
                        }
                        .frame(width: 7, height: 7)
                    }
                }
            }
        }
        .padding(3)
        .background(Color.black)
        .clipShape(RoundedRectangle(cornerRadius: 6, style: .continuous))
    }

    private func pawnColor(_ p: PawnColor) -> Color {
        switch p {
        case .red: return .red
        case .blue: return .blue
        case .green: return .green
        case .yellow: return .yellow
        }
    }
}
