import Foundation
import AVFoundation

public enum SoundEffect {
    case slideIn
    case rotateTile
    case pawnStep
    case treasureCollected
    case solverComplete
    case buttonClick
}

public final class SoundManager: @unchecked Sendable {
    public static let shared = SoundManager()

    private var audioPlayers: [SoundEffect: AVAudioPlayer] = [:]
    private var isAudioEnabled: Bool = true

    private init() {
        // Audio session setup
        #if canImport(UIKit)
        do {
            try AVAudioSession.sharedInstance().setCategory(.ambient, mode: .default)
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
            print("SoundManager: Failed to configure audio session: \(error)")
        }
        #endif
    }

    public func play(_ effect: SoundEffect, enabled: Bool = true) {
        guard enabled else { return }

        // System sound fallbacks for high quality tactile feel
        #if canImport(UIKit)
        switch effect {
        case .slideIn:
            AudioServicesPlaySystemSound(1104) // Tink sound
        case .rotateTile:
            AudioServicesPlaySystemSound(1105) // Pop sound
        case .pawnStep:
            AudioServicesPlaySystemSound(1103) // Tap sound
        case .treasureCollected:
            AudioServicesPlaySystemSound(1025) // Fanfare chime
        case .solverComplete:
            AudioServicesPlaySystemSound(1054) // Tweet chime
        case .buttonClick:
            AudioServicesPlaySystemSound(1104)
        }
        #endif
    }
}
