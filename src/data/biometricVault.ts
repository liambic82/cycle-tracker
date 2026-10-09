import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import {
  openVaultWithKey,
  parseEnvelope,
  type RandomBytes,
  type VaultKey,
} from '../domain/vault.ts';
import type { Storage } from './repository.ts';

export const BIOMETRIC_REFERENCE_KEY = 'cycle-tracker.biometric-reference.v1';
export interface ProtectedKeyStore {
  available(): boolean;
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}
interface Reference {
  version: 1;
  salt: string;
  token: string;
}
const hex = (value: unknown, length: number): value is string =>
  typeof value === 'string' && value.length === length && /^[0-9a-f]+$/.test(value);

function parseReference(raw: string | null): Reference | null {
  if (!raw || raw.length > 512) return null;
  try {
    const value = JSON.parse(raw);
    return value?.version === 1 && hex(value.salt, 32) && hex(value.token, 32)
      ? { version: 1, salt: value.salt, token: value.token }
      : null;
  } catch {
    return null;
  }
}

// Ordinary storage holds only an opt-in reference, never a key or passphrase.
// The fixed secure slot lets replacement/deletion also remove interrupted setup and iOS remnants.
export class BiometricVault {
  private storage: Storage;
  private protectedKey: ProtectedKeyStore;
  private random: RandomBytes;
  constructor(storage: Storage, protectedKey: ProtectedKeyStore, random: RandomBytes) {
    this.storage = storage;
    this.protectedKey = protectedKey;
    this.random = random;
  }

  available(): boolean {
    return this.protectedKey.available();
  }

  async enabled(salt: string | null): Promise<boolean> {
    const reference = parseReference(await this.storage.getItem(BIOMETRIC_REFERENCE_KEY));
    return !!reference && reference.salt === salt;
  }

  async clear(): Promise<void> {
    // If removing the protected credential fails, retain the reference so the user can retry.
    await this.protectedKey.remove();
    await this.storage.removeItem(BIOMETRIC_REFERENCE_KEY);
  }

  async enable(vault: VaultKey): Promise<void> {
    if (!this.available())
      throw new Error(
        'Set up a supported fingerprint or face unlock in your device settings first.',
      );
    if (!hex(vault.salt, 32) || vault.key.length !== 32)
      throw new Error('Open your journal with its passphrase first.');
    await this.clear();
    const reference: Reference = {
      version: 1,
      salt: vault.salt,
      token: bytesToHex(this.random(16)),
    };
    try {
      await this.protectedKey.write(JSON.stringify({ ...reference, key: bytesToHex(vault.key) }));
      // Opt in only after the OS has accepted the protected key.
      await this.storage.setItem(BIOMETRIC_REFERENCE_KEY, JSON.stringify(reference));
    } catch {
      try {
        await this.clear();
      } catch {
        /* No active reference is required for passphrase access. */
      }
      throw new Error(
        'Biometric setup was not completed. Your passphrase still works. Try again when you’re ready.',
      );
    }
  }

  async unlock(
    raw: string,
  ): Promise<{ journal: ReturnType<typeof openVaultWithKey>; vault: VaultKey }> {
    const envelope = parseEnvelope(raw);
    const reference = parseReference(await this.storage.getItem(BIOMETRIC_REFERENCE_KEY));
    if (!reference || reference.salt !== envelope.salt) {
      throw new Error('Use your passphrase, then enable biometric unlock in Your data.');
    }
    if (!this.available()) throw new Error('Biometric unlock is unavailable. Use your passphrase.');
    let stored: string | null;
    try {
      stored = await this.protectedKey.read();
    } catch {
      throw new Error('Biometric unlock was not completed. Try again or use your passphrase.');
    }
    let vault: VaultKey | null = null;
    try {
      const value = stored && stored.length <= 512 ? JSON.parse(stored) : null;
      if (
        value?.version !== 1 ||
        value.salt !== reference.salt ||
        value.token !== reference.token ||
        !hex(value.key, 64)
      ) {
        throw new Error('Invalid protected key');
      }
      vault = { salt: value.salt, key: hexToBytes(value.key) };
      return { journal: openVaultWithKey(raw, vault), vault };
    } catch {
      vault?.key.fill(0);
      // Invalidated enrollment, stale credentials, or tampering cannot open a session.
      // Clearing only biometric access preserves the passphrase-encrypted vault.
      try {
        await this.clear();
      } catch {
        /* A later disable/setup can retry cleanup. */
      }
      throw new Error(
        'Biometric access needs to be set up again. Unlock with your passphrase, then enable it in Your data.',
      );
    }
  }
}
