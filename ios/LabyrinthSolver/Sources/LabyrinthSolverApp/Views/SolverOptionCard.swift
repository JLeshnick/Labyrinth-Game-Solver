import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct SolverOptionCard: View {
    let move: MoveOption
    let rank: Int
    let isSelected: Bool
    let targetName: String
    let appAccentTheme: AppAccentTheme
    let onTap: () -> Void

    init(move: MoveOption, rank: Int, isSelected: Bool, targetName: String, appAccentTheme: AppAccentTheme, onTap: @escaping () -> Void) {
        self.move = move
        self.rank = rank
        self.isSelected = isSelected
        self.targetName = targetName
        self.appAccentTheme = appAccentTheme
        self.onTap = onTap
    }

    private var isHero: Bool {
        rank == 1
    }

    private var scoreColor: Color {
        if move.safetyScore >= 80 { return .green }
        if move.safetyScore >= 50 { return .orange }
        return .red
    }

    var body: some View {
        Button(action: {
            Haptics.selection()
            onTap()
        }) {
            VStack(alignment: .leading, spacing: 8) {
                HStack(spacing: 6) {
                    Text("#\(rank)")
                        .font(.system(size: 11, weight: .black, design: .rounded))
                        .foregroundColor(isSelected || isHero ? .white : .primary)
                        .padding(.horizontal, 7)
                        .padding(.vertical, 3)
                        .background(
                            isHero ? Color.amberGold : (isSelected ? Color.accentForTheme(appAccentTheme) : Color.secondary.opacity(0.25)),
                            in: Capsule()
                        )

                    if isHero {
                        Image(systemName: "sparkles")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.amberGold)
                    }

                    Text(move.isTargetReached ? (move.turnsToTarget == 1 ? "Reach now" : "\(move.turnsToTarget)-turn route") : "Improve position")
                        .font(.system(size: 12, weight: .bold, design: .rounded))
                        .foregroundColor(move.isTargetReached ? .green : .orange)

                    Spacer(minLength: 0)

                    // Safety score pill
                    Text("\(move.safetyScore)/100")
                        .font(.system(size: 10, weight: .black, design: .monospaced))
                        .foregroundColor(scoreColor)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(scoreColor.opacity(0.12), in: Capsule())
                }

                Text(move.summaryText)
                    .font(.system(size: 12, weight: .semibold, design: .rounded))
                    .foregroundColor(.primary)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
            }
            .padding(12)
            .liquidGlassCard(
                cornerRadius: 16,
                isInteractive: true,
                isSelected: isSelected,
                tintColor: isHero ? Color.amberGold : (isSelected ? Color.accentForTheme(appAccentTheme) : nil)
            )
        }
        .buttonStyle(.plain)
    }
}
