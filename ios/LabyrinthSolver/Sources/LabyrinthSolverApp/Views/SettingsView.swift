import SwiftUI
#if canImport(LabyrinthSolverCore)
import LabyrinthSolverCore
#endif

struct SettingsView: View {
    @Bindable var vm: GameViewModel
    let onSetup: () -> Void
    let onShowWelcome: () -> Void
    @Environment(\.dismiss) private var dismiss

    init(vm: GameViewModel, onSetup: @escaping () -> Void, onShowWelcome: @escaping () -> Void) {
        self.vm = vm
        self.onSetup = onSetup
        self.onShowWelcome = onShowWelcome
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Visual Theme & Accent Section
                    settingsCard(title: "Theme & Accent", icon: "paintpalette.fill", color: .purple) {
                        VStack(spacing: 16) {
                            // Color scheme picker
                            Picker("Appearance", selection: $vm.appColorScheme) {
                                ForEach(AppColorScheme.allCases) { scheme in
                                    Text(scheme.displayName).tag(scheme)
                                }
                            }
                            .pickerStyle(.segmented)

                            Divider()

                            // Visual Accent Theme Picker
                            VStack(alignment: .leading, spacing: 8) {
                                Text("Accent Color")
                                    .font(.system(size: 13, weight: .bold, design: .rounded))
                                    .foregroundColor(.secondary)

                                HStack(spacing: 14) {
                                    ForEach(AppAccentTheme.allCases, id: \.self) { theme in
                                        accentCircle(theme)
                                    }
                                }
                            }
                        }
                    }

                    // Solver Algorithm Settings
                    settingsCard(title: "Solver Engine", icon: "sparkles", color: .amberGold) {
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Lookahead Search Depth")
                                    .font(.system(size: 14, weight: .bold, design: .rounded))
                                Spacer()
                                Text("\(vm.solverDepth) Turn\(vm.solverDepth == 1 ? "" : "s")")
                                    .font(.system(size: 13, weight: .bold, design: .monospaced))
                                    .foregroundColor(Color.accentForTheme(vm.appAccentTheme))
                            }

                            Stepper("", value: $vm.solverDepth, in: 1...3)
                                .labelsHidden()

                            Text("Evaluates board shifts up to \(vm.solverDepth) move\(vm.solverDepth == 1 ? "" : "s") in advance to calculate optimal safety scores and reachable targets.")
                                .font(.system(size: 12, design: .rounded))
                                .foregroundColor(.secondary)
                        }
                    }

                    // Preferences (Sound & Haptics)
                    settingsCard(title: "Preferences", icon: "speaker.wave.2.fill", color: .blue) {
                        VStack(spacing: 12) {
                            Toggle("Sound Effects", isOn: $vm.enableSound)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                            Toggle("Haptic Feedback", isOn: $vm.enableHaptics)
                                .font(.system(size: 14, weight: .bold, design: .rounded))
                        }
                    }

                    // Board Actions
                    settingsCard(title: "Board Actions", icon: "slider.horizontal.3", color: .green) {
                        VStack(spacing: 10) {
                            actionButton(title: "Open Board Builder", icon: "hammer.fill", color: Color.accentForTheme(vm.appAccentTheme)) {
                                dismiss()
                                onSetup()
                            }

                            actionButton(title: "Randomize Board Layout", icon: "dice.fill", color: .orange) {
                                vm.randomizeBoard()
                                dismiss()
                            }

                            actionButton(title: "Reset to Standard Board", icon: "arrow.counterclockwise", color: .red) {
                                vm.resetBoardLayout()
                                dismiss()
                            }
                        }
                    }

                    // Help & Info
                    settingsCard(title: "About & Help", icon: "info.circle.fill", color: .secondary) {
                        VStack(spacing: 10) {
                            actionButton(title: "Welcome & Onboarding Guide", icon: "book.fill", color: .primary) {
                                dismiss()
                                onShowWelcome()
                            }

                            HStack {
                                Text("App Version")
                                    .font(.system(size: 13, design: .rounded))
                                    .foregroundColor(.secondary)
                                Spacer()
                                Text("v1.2.0 (Liquid Glass)")
                                    .font(.system(size: 12, weight: .bold, design: .monospaced))
                                    .foregroundColor(.secondary)
                            }
                            .padding(.top, 4)
                        }
                    }
                }
                .padding(16)
            }
            .background(Color.appGroupedBg)
            .navigationTitle("Settings")
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

    private func settingsCard<Content: View>(title: String, icon: String, color: Color, @ViewBuilder content: () -> Content) -> some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(color)
                Text(title)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundColor(.primary)
            }

            content()
        }
        .padding(16)
        .liquidGlassCard(cornerRadius: 20)
    }

    private func accentCircle(_ theme: AppAccentTheme) -> some View {
        let isSelected = vm.appAccentTheme == theme
        let themeColor = Color.accentForTheme(theme)

        return Button(action: {
            Haptics.selection()
            vm.appAccentTheme = theme
        }) {
            ZStack {
                Circle()
                    .fill(themeColor)
                    .frame(width: 38, height: 38)
                    .shadow(color: themeColor.opacity(0.4), radius: isSelected ? 6 : 2)

                if isSelected {
                    Image(systemName: "checkmark")
                        .font(.system(size: 14, weight: .black))
                        .foregroundColor(.white)
                }
            }
        }
        .buttonStyle(.plain)
    }

    private func actionButton(title: String, icon: String, color: Color, action: @escaping () -> Void) -> some View {
        Button(action: {
            Haptics.selection()
            action()
        }) {
            HStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .bold))
                Text(title)
                    .font(.system(size: 14, weight: .bold, design: .rounded))
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(.secondary)
            }
            .foregroundColor(color)
            .padding(12)
            .background(Color.appTertiaryGroupedBg, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}
