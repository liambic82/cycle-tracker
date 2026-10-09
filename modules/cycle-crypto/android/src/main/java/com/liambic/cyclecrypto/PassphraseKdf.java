package com.liambic.cyclecrypto;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

/** Uses the platform PBKDF2 provider; parameters match portable vault format 1. */
public final class PassphraseKdf {
  private PassphraseKdf() {}

  public static byte[] derive(byte[] passwordUtf8, byte[] salt) throws GeneralSecurityException {
    CharBuffer decoded = null;
    char[] password = null;
    PBEKeySpec spec = null;
    try {
      if (passwordUtf8.length > 3072 || salt.length != 16) {
        throw new IllegalArgumentException("Invalid key derivation input");
      }
      // Decode the exact TextEncoder bytes, without trimming or Unicode normalization.
      decoded = StandardCharsets.UTF_8.decode(ByteBuffer.wrap(passwordUtf8));
      password = new char[decoded.remaining()];
      decoded.get(password);
      spec = new PBEKeySpec(password, salt, 600000, 256);
      return SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256").generateSecret(spec).getEncoded();
    } finally {
      if (spec != null) spec.clearPassword();
      if (password != null) Arrays.fill(password, '\0');
      if (decoded != null && decoded.hasArray()) Arrays.fill(decoded.array(), '\0');
      Arrays.fill(passwordUtf8, (byte) 0);
      Arrays.fill(salt, (byte) 0);
    }
  }
}
