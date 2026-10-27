import ExpoModulesCore
import Foundation

public final class CyclePassphraseCryptoModule: Module {
  private let derivationQueue = DispatchQueue(label: "com.liambic.cycletracker.key-derivation", qos: .userInitiated)

  public func definition() -> ModuleDefinition {
    Name("CyclePassphraseCrypto")
    Constants(["supported": true])
    AsyncFunction("derive") { (password: [Int], salt: [Int]) throws -> [Int] in
      guard password.count <= 3072, salt.count == 16,
            password.allSatisfy({ (0...255).contains($0) }),
            salt.allSatisfy({ (0...255).contains($0) }) else {
        throw NSError(domain: "TrifelleKeyDerivation", code: 1)
      }
      var passwordBytes = password.map { UInt8($0) }
      var saltBytes = salt.map { UInt8($0) }
      var key = try PassphraseKdf.derive(password: &passwordBytes, salt: &saltBytes)
      defer { PassphraseKdf.wipe(&key) }
      return key.map { Int($0) }
    }.runOnQueue(derivationQueue)
  }
}
