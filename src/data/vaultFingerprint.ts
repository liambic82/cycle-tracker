import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { MAX_BACKUP_BYTES } from '../domain/vault.ts';

export type VaultFingerprint = { bytes: number; digest: string };
export type Fingerprinter = (raw: string) => VaultFingerprint | Promise<VaultFingerprint>;

export function portableFingerprint(raw: string): VaultFingerprint {
  const bytes = new TextEncoder().encode(raw);
  if (bytes.length > MAX_BACKUP_BYTES) throw new Error('This encrypted journal exceeds 8 MB.');
  return { bytes: bytes.length, digest: bytesToHex(sha256(bytes)) };
}
