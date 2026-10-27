import CommonCrypto
import Darwin
import Foundation

enum PassphraseKdf {
  static func wipe(_ bytes: inout [UInt8]) {
    bytes.withUnsafeMutableBytes { buffer in
      if let address = buffer.baseAddress {
        // Darwin's non-elidable clear is memset_s; explicit_bzero is not an Apple API.
        _ = memset_s(address, buffer.count, 0, buffer.count)
      }
    }
  }

  // Exact TextEncoder bytes, including embedded NULs: no String conversion or normalization.
  static func derive(password: inout [UInt8], salt: inout [UInt8]) throws -> [UInt8] {
    defer { wipe(&password); wipe(&salt) }
    guard password.count <= 3072, salt.count == 16 else {
      throw NSError(domain: "TrifelleKeyDerivation", code: 1)
    }
    let passwordLength = password.count
    let saltLength = salt.count
    // A sentinel supplies a valid buffer for the empty-password compatibility vector.
    password.append(0)
    var key = [UInt8](repeating: 0, count: 32)
    let status = password.withUnsafeBytes { passwordBuffer in
      salt.withUnsafeBytes { saltBuffer in
        key.withUnsafeMutableBytes { keyBuffer in
          CCKeyDerivationPBKDF(
            CCPBKDFAlgorithm(kCCPBKDF2),
            passwordBuffer.bindMemory(to: Int8.self).baseAddress,
            passwordLength,
            saltBuffer.bindMemory(to: UInt8.self).baseAddress,
            saltLength,
            CCPseudoRandomAlgorithm(kCCPRFHmacAlgSHA256),
            600_000,
            keyBuffer.bindMemory(to: UInt8.self).baseAddress,
            32
          )
        }
      }
    }
    guard status == kCCSuccess else {
      wipe(&key)
      throw NSError(domain: "TrifelleKeyDerivation", code: 2)
    }
    return key
  }
}
