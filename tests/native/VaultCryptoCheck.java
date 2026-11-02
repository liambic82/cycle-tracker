import com.liambic.cyclecrypto.VaultCrypto;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;

public class VaultCryptoCheck {
  private static void wiped(byte[] value) {
    for (byte b : value) if (b != 0) throw new AssertionError("Input buffer not wiped");
  }
  public static void main(String[] args) throws Exception {
    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    int count = 0;
    for (String line; (line = reader.readLine()) != null;) {
      String[] fields = line.split(":", -1);
      StringBuilder value = new StringBuilder();
      for (int i = 0; i < fields[0].length(); i += 4)
        value.append((char) Integer.parseInt(fields[0].substring(i, i + 4), 16));
      byte[] key = HexFormat.of().parseHex(fields[1]);
      byte[] nonce = HexFormat.of().parseHex(fields[2]);
      String ciphertext = VaultCrypto.encrypt(value.toString(), key, nonce);
      if (!ciphertext.equals(fields[3])) throw new AssertionError("AES-GCM mismatch: " + count);
      wiped(key); wiped(nonce);
      VaultCrypto.Fingerprint fingerprint = VaultCrypto.fingerprint(value.toString());
      if (!fingerprint.digest.equals(fields[4]) || fingerprint.bytes != Integer.parseInt(fields[5]))
        throw new AssertionError("UTF-8 fingerprint mismatch: " + count);
      count++;
    }
    byte[] key = new byte[] {1}, nonce = new byte[] {2};
    try { VaultCrypto.encrypt("", key, nonce); throw new AssertionError("Invalid key accepted"); }
    catch (IllegalArgumentException expected) { wiped(key); wiped(nonce); }
    String oversizeUtf8 = "é".repeat(4 * 1024 * 1024 + 1);
    try { VaultCrypto.fingerprint(oversizeUtf8); throw new AssertionError("Oversized UTF-8 accepted"); }
    catch (IllegalArgumentException expected) {}
    System.out.println("VaultCrypto: " + count + " AES-GCM/UTF-8/SHA-256 vectors, bounds and key cleanup passed (desktop JVM).");
  }
}
