import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct PlayerHandView: View {
    @Bindable var vm: GameViewModel

    init(vm: GameViewModel) {
        self.vm = vm
    }

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(vm.activePlayers, id: \.id) { pawn in
                    playerCard(pawn)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 4)
        }
    }

    private func playerCard(_ pawn: PawnColor) -> some View {
        let hand = vm.playerHands[pawn] ?? PlayerHand()
        let isActive = vm.myColor == pawn
        let collectedCount = hand.obtainedCards.count
        let totalCount = max(1, hand.cards.count)

        let targetEmoji: String = {
            if let targetId = hand.currentTarget,
               let treasure = GameConstants.treasures.first(where: { $0.id == targetId }) {
                return treasure.emoji
            }
            return "🎯"
        }()

        return Button(action: {
            Haptics.selection()
            if let idx = vm.activePlayers.firstIndex(of: pawn) {
                vm.currentPlayerIndex = idx
                vm.refreshReachable()
            }
        }) {
            HStack(spacing: 10) {
                PawnToken(color: pawn, isActive: isActive, size: 22)

                VStack(alignment: .leading, spacing: 2) {
                    Text(pawn.displayName)
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundColor(isActive ? .primary : .secondary)

                    HStack(spacing: 4) {
                        Text("\(collectedCount)/\(totalCount)")
                            .font(.system(size: 11, weight: .heavy, design: .monospaced))
                            .foregroundColor(isActive ? Color.accentForTheme(vm.appAccentTheme) : .secondary)
                        
                        Text("• \(targetEmoji)")
                            .font(.system(size: 11))
                    }
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .liquidGlassCapsule(isSelected: isActive, tintColor: isActive ? Color.accentForTheme(vm.appAccentTheme) : nil)
        }
        .buttonStyle(.plain)
    }
}
