import { requireOptionalNativeModule } from 'expo';
import { bytesToHex } from '@noble/hashes/utils.js';
import {
  MAX_BACKUP_BYTES,
  serializeSealedJournal,
  type RandomBytes,
  type VaultKey,
} from '../domain/vault';
import type { VaultFingerprint } from './vaultFingerprint';

interface NativeVaultCrypto {
  fingerprint(raw: string): Promise<VaultFingerprint>;
  encrypt(plain: string, key: number[], nonce: number[]): Promise<string>;
}
const native = requireOptionalNativeModule<NativeVaultCrypto>('CyclePassphraseCrypto');
const moduleRequired = () => {
  if (!native) throw new Error('Install the current standalone preview to use native encryption.');
  return native;
};

export async function fingerprintJournal(raw: string): Promise<VaultFingerprint> {
  if (raw.length > MAX_BACKUP_BYTES) throw new Error('This encrypted journal exceeds 8 MB.');
  const result = await moduleRequired().fingerprint(raw);
  if (
    !Number.isInteger(result.bytes) ||
    result.bytes < 0 ||
    result.bytes > MAX_BACKUP_BYTES ||
    !/^[0-9a-f]{64}$/.test(result.digest)
  )
    throw new Error('The encrypted journal could not be verified.');
  return result;
}

export async function encryptJournal(
  serialized: string,
  vault: VaultKey,
  random: RandomBytes,
): Promise<string> {
  // Own the bridge buffers until the background operation completes, even if
  // the session ends while a backup or accepted save is being encrypted.
  const key = Array.from(vault.key);
  const nonce = Array.from(random(12));
  try {
    const ciphertext = await moduleRequired().encrypt(serialized, key, nonce);
    return serializeSealedJournal(vault.salt, bytesToHex(new Uint8Array(nonce)), ciphertext);
  } finally {
    key.fill(0);
    nonce.fill(0);
  }
}
