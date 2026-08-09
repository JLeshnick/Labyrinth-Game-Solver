import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct TargetPickerSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    init(vm: GameViewModel) {
        self.vm = vm
    }

    private let columns = [
        GridItem(.adaptive(minimum: 95), spacing: 10)
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

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Target Selection Guide
                    HStack {
                        Image(systemName: "scope")
                            .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                        Text("Select your target treasure to solve:")
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)

                    if !nowReachable.isEmpty {
                        targetSection(title: "Reachable Now (No Slide)", treasures: nowReachable)
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
            #if os(iOS)
            .navigationBarTitleDisplayMode(.inline)
            #endif
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Close") { dismiss() }
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                }
            }
        }
    }

    @ViewBuilder
    private func targetSection(title: String, treasures: [Treasure]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 13, weight: .bold, design: .rounded))
                .foregroundColor(.secondary)
                .padding(.horizontal, 20)

            LazyVGrid(columns: columns, spacing: 10) {
                ForEach(treasures, id: \.id) { treasure in
                    Button {
                        Haptics.selection()
                        vm.setActiveTarget(treasureId: treasure.id)
                        dismiss()
                    } label: {
                        targetCell(
                            emoji: treasure.emoji,
                            name: treasure.shortName,
                            isSelected: vm.activeTargetId == treasure.id
                        )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, 16)
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
        .frame(maxWidth: .infinity, minHeight: 76)
        .padding(6)
        .liquidGlassCard(cornerRadius: 14, isSelected: isSelected, tintColor: Color.accentForTheme(vm.appAccentTheme))
    }
}
