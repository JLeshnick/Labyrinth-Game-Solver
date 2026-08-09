import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct PlayerHandView: View {
    @Bindable var vm: GameViewModel
    @State private var showStatsSheet: Bool = false

    init(vm: GameViewModel) {
        self.vm = vm
    }

    var body: some View {
        HStack(spacing: 8) {
            ScrollViewReader { proxy in
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 10) {
                        ForEach(vm.activePlayers, id: \.id) { pawn in
                            playerCard(pawn)
                                .id(pawn.id)
                        }
                    }
                    .padding(.horizontal, 14)
                    .padding(.vertical, 4)
                }
                .mask(
                    LinearGradient(
                        stops: [
                            .init(color: .black, location: 0.0),
                            .init(color: .black, location: 0.55),
                            .init(color: .black.opacity(0.85), location: 0.72),
                            .init(color: .black.opacity(0.40), location: 0.85),
                            .init(color: .black.opacity(0.10), location: 0.95),
                            .init(color: .clear, location: 1.0)
                        ],
                        startPoint: .leading,
                        endPoint: .trailing
                    )
                )
                .onChange(of: vm.myColor) { _, newColor in
                    withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                        proxy.scrollTo(newColor.id, anchor: .center)
                    }
                }
                .onAppear {
                    proxy.scrollTo(vm.myColor.id, anchor: .center)
                }
            }

            // Stats Sheet Button (aligned with player cards)
            Button(action: {
                Haptics.selection()
                showStatsSheet = true
            }) {
                HStack(spacing: 5) {
                    Image(systemName: "chart.bar.fill")
                        .font(.system(size: 12, weight: .bold))
                    Text("Stats")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                }
                .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                .padding(.horizontal, 12)
                .frame(height: 42)
                .liquidGlassCapsule()
            }
            .padding(.trailing, 14)
            .buttonStyle(.plain)
        }
        .sheet(isPresented: $showStatsSheet) {
            GameStatsSheet(vm: vm)
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
                    HStack(spacing: 6) {
                        Text(pawn.displayName)
                            .font(.system(size: 13, weight: .bold, design: .rounded))
                            .foregroundColor(isActive ? .primary : .secondary)

                        Text("\(collectedCount)/\(totalCount)")
                            .font(.system(size: 11, weight: .heavy, design: .monospaced))
                            .foregroundColor(isActive ? Color.accentForTheme(vm.appAccentTheme) : .secondary)
                    }

                    HStack(spacing: 4) {
                        Text(targetEmoji)
                            .font(.system(size: 11))
                        
                        if !hand.obtainedCards.isEmpty {
                            HStack(spacing: 2) {
                                ForEach(hand.obtainedCards.prefix(3), id: \.self) { tId in
                                    if let t = GameConstants.treasures.first(where: { $0.id == tId }) {
                                        Text(t.emoji)
                                            .font(.system(size: 10))
                                            .strikethrough(true, color: .secondary)
                                    }
                                }
                                if hand.obtainedCards.count > 3 {
                                    Text("+\(hand.obtainedCards.count - 3)")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
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

// MARK: - Game Stats & Standings Sheet
struct GameStatsSheet: View {
    @Bindable var vm: GameViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Summary Stats Header
                    HStack(spacing: 12) {
                        statBox(title: "Time", value: vm.formattedTime, icon: "stopwatch.fill")
                        statBox(title: "Moves", value: "\(vm.moveCount)", icon: "arrow.triangle.swap")
                        statBox(title: "Turns", value: "\(vm.undoStack.count)", icon: "clock.arrow.circlepath")
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 12)

                    // Detailed Per-Player Breakdowns
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Per-Player Performance")
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .foregroundColor(.secondary)
                            .padding(.horizontal, 20)

                        ForEach(vm.activePlayers, id: \.id) { pawn in
                            let hand = vm.playerHands[pawn] ?? PlayerHand()
                            let collectedCount = hand.obtainedCards.count
                            let totalCount = max(1, hand.cards.count)
                            let tilesWalked = vm.tilesTraversedPerPlayer[pawn] ?? 0
                            let turnsTaken = vm.turnsTakenPerPlayer[pawn] ?? 0
                            let avgPerTurn = turnsTaken > 0 ? Double(tilesWalked) / Double(turnsTaken) : 0.0

                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    PawnToken(color: pawn, isActive: vm.myColor == pawn, size: 24)
                                    Text(pawn.displayName)
                                        .font(.system(size: 15, weight: .bold, design: .rounded))
                                    Spacer()
                                    Text("\(collectedCount) / \(totalCount) Cards")
                                        .font(.system(size: 13, weight: .black, design: .monospaced))
                                        .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                                }

                                // Metrics Grid
                                HStack(spacing: 8) {
                                    playerStatPill(title: "Tiles Walked", value: "\(tilesWalked)", icon: "figure.walk")
                                    playerStatPill(title: "Turns Played", value: "\(turnsTaken)", icon: "dice.fill")
                                    playerStatPill(title: "Avg/Turn", value: String(format: "%.1f", avgPerTurn), icon: "bolt.fill")
                                }

                                // Obtained Treasures List
                                if hand.obtainedCards.isEmpty {
                                    Text("No treasures collected yet.")
                                        .font(.system(size: 11, design: .rounded))
                                        .foregroundColor(.secondary)
                                        .padding(.top, 2)
                                } else {
                                    VStack(alignment: .leading, spacing: 4) {
                                        Text("Obtained Treasures:")
                                            .font(.system(size: 10, weight: .bold, design: .rounded))
                                            .foregroundColor(.secondary)

                                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 90))], spacing: 6) {
                                            ForEach(hand.obtainedCards, id: \.self) { tId in
                                                if let treasure = GameConstants.treasures.first(where: { $0.id == tId }) {
                                                    HStack(spacing: 4) {
                                                        Text(treasure.emoji).font(.system(size: 11))
                                                        Text(treasure.shortName)
                                                            .font(.system(size: 10, weight: .bold, design: .rounded))
                                                            .strikethrough(true, color: .secondary)
                                                            .foregroundColor(.secondary)
                                                        Image(systemName: "checkmark")
                                                            .font(.system(size: 8, weight: .bold))
                                                            .foregroundColor(.green)
                                                    }
                                                    .padding(.horizontal, 8)
                                                    .padding(.vertical, 4)
                                                    .background(Color.appSecondaryGroupedBg)
                                                    .clipShape(Capsule())
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                            .padding(14)
                            .liquidGlassCard(cornerRadius: 16)
                        }
                    }
                    .padding(.horizontal, 16)
                }
                .padding(.bottom, 24)
            }
            .background(Color.appGroupedBg)
            .navigationTitle("Game Stats & Standings")
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

    private func playerStatPill(title: String, value: String, icon: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 10, weight: .bold))
                .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
            VStack(alignment: .leading, spacing: 0) {
                Text(value)
                    .font(.system(size: 11, weight: .black, design: .monospaced))
                    .foregroundColor(.primary)
                Text(title)
                    .font(.system(size: 9, weight: .semibold, design: .rounded))
                    .foregroundColor(.secondary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(Color.appSecondaryGroupedBg)
        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
    }

    private func statBox(title: String, value: String, icon: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.system(size: 16, weight: .bold))
                .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
            Text(value)
                .font(.system(size: 16, weight: .black, design: .monospaced))
                .foregroundColor(.primary)
            Text(title)
                .font(.system(size: 11, weight: .semibold, design: .rounded))
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .liquidGlassCard(cornerRadius: 14)
    }
}
