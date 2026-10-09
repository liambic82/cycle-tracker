import com.liambic.cyclecrypto.PassphraseKdf;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.HexFormat;

public class PassphraseKdfCheck {
  public static void main(String[] args) throws Exception {
    BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, StandardCharsets.UTF_8));
    int count = 0;
    long started = System.nanoTime();
    for (String line; (line = reader.readLine()) != null;) {
      String[] fields = line.split(":", -1);
      byte[] password = HexFormat.of().parseHex(fields[0]);
      byte[] salt = HexFormat.of().parseHex(fields[1]);
      byte[] key = PassphraseKdf.derive(password, salt);
      if (!HexFormat.of().formatHex(key).equals(fields[2])) throw new AssertionError("Key mismatch in vector " + count);
      for (byte value : password) if (value != 0) throw new AssertionError("Password buffer not wiped");
      for (byte value : salt) if (value != 0) throw new AssertionError("Salt buffer not wiped");
      Arrays.fill(key, (byte) 0);
      count++;
    }
    System.out.println("Native Java helper: " + count + " compatibility vectors passed in " + ((System.nanoTime() - started) / 1000000) + " ms (desktop JVM; not a phone timing).");
  }
}
