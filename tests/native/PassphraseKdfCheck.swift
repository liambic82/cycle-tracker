import Foundation

@main
struct PassphraseKdfCheck {
  static func bytes(_ hex: String) -> [UInt8] {
    precondition(hex.count % 2 == 0)
    let characters = Array(hex)
    return stride(from: 0, to: characters.count, by: 2).map {
      UInt8(String(characters[$0...($0 + 1)]), radix: 16)!
    }
  }
  static func main() throws {
    var count = 0
    while let line = readLine() {
      let fields = line.split(separator: ":", omittingEmptySubsequences: false).map(String.init)
      precondition(fields.count == 3)
      var password = bytes(fields[0])
      var salt = bytes(fields[1])
      var actual = try PassphraseKdf.derive(password: &password, salt: &salt)
      precondition(actual == bytes(fields[2]), "PBKDF2 vector mismatch")
      precondition(password.allSatisfy { $0 == 0 } && salt.allSatisfy { $0 == 0 }, "Input buffers not wiped")
      PassphraseKdf.wipe(&actual)
      count += 1
    }
    var password = [UInt8](repeating: 1, count: 3)
    var invalidSalt = [UInt8](repeating: 2, count: 15)
    do {
      _ = try PassphraseKdf.derive(password: &password, salt: &invalidSalt)
      preconditionFailure("Invalid salt was accepted")
    } catch {
      precondition(password.allSatisfy { $0 == 0 } && invalidSalt.allSatisfy { $0 == 0 })
    }
    print("iOS/macOS CommonCrypto: \(count) shared UTF-8 vectors passed; invalid salt rejected and buffers wiped.")
  }
}
