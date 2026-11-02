package com.liambic.cyclecrypto;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CodingErrorAction;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

/** Called on a background dispatcher. No persistence, logging, or key retention. */
public final class VaultCrypto {
  private static final int MAX_BYTES = 8 * 1024 * 1024;
  private static final byte[] AAD = "cycle-tracker:vault:1".getBytes(StandardCharsets.UTF_8);
  private static final char[] HEX = "0123456789abcdef".toCharArray();

  public static final class Fingerprint {
    public final int bytes;
    public final String digest;
    Fingerprint(int bytes, String digest) { this.bytes = bytes; this.digest = digest; }
  }

  private static byte[] utf8(String value) throws Exception {
    // Match JS TextEncoder, including an unpaired UTF-16 surrogate.
    ByteBuffer encoded = StandardCharsets.UTF_8.newEncoder()
      .onMalformedInput(CodingErrorAction.REPLACE)
      .onUnmappableCharacter(CodingErrorAction.REPLACE)
      .replaceWith(new byte[] {(byte) 0xef, (byte) 0xbf, (byte) 0xbd})
      .encode(CharBuffer.wrap(value));
    byte[] result = new byte[encoded.remaining()];
    encoded.get(result);
    if (encoded.hasArray()) Arrays.fill(encoded.array(), (byte) 0);
    return result;
  }

  private static String hex(byte[] bytes) {
    char[] out = new char[bytes.length * 2];
    for (int i = 0; i < bytes.length; i++) {
      int value = bytes[i] & 0xff;
      out[i * 2] = HEX[value >>> 4];
      out[i * 2 + 1] = HEX[value & 15];
    }
    return new String(out);
  }

  public static Fingerprint fingerprint(String raw) throws Exception {
    if (raw.length() > MAX_BYTES) throw new IllegalArgumentException("This encrypted journal exceeds 8 MB.");
    byte[] bytes = utf8(raw);
    try {
      if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("This encrypted journal exceeds 8 MB.");
      return new Fingerprint(bytes.length, hex(MessageDigest.getInstance("SHA-256").digest(bytes)));
    } finally { Arrays.fill(bytes, (byte) 0); }
  }

  public static String encrypt(String serialized, byte[] key, byte[] nonce) throws Exception {
    byte[] plain = null;
    try {
      if (key.length != 32 || nonce.length != 12) throw new IllegalArgumentException("Invalid vault key or nonce.");
      if (serialized.length() > MAX_BYTES / 2) throw new IllegalArgumentException("This journal exceeds the storage limit.");
      plain = utf8(serialized);
      if (plain.length > MAX_BYTES / 2) throw new IllegalArgumentException("This journal exceeds the storage limit.");
      Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
      cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key, "AES"), new GCMParameterSpec(128, nonce));
      cipher.updateAAD(AAD);
      return hex(cipher.doFinal(plain));
    } finally {
      if (plain != null) Arrays.fill(plain, (byte) 0);
      Arrays.fill(key, (byte) 0);
      Arrays.fill(nonce, (byte) 0);
    }
  }
}
