import { gcm } from '@noble/ciphers/aes.js';
import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { parseJournal, type Journal } from './journal.ts';

const ITERATIONS = 600000;
const AAD = new TextEncoder().encode('cycle-tracker:vault:1');
export const MAX_BACKUP_BYTES = 8 * 1024 * 1024;
export interface Envelope {
  format: 'cycle-tracker-vault';
  version: 1;
  kdf: 'pbkdf2-sha256';
  iterations: number;
  salt: string;
  nonce: string;
  ciphertext: string;
}
export interface VaultKey {
  key: Uint8Array;
  salt: string;
}
export type RandomBytes = (length: number) => Uint8Array;

export async function deriveKey(passphrase: string, salt: string): Promise<VaultKey> {
  if (passphrase.length > 1024) throw new Error('The passphrase is too long.');
  const key = await pbkdf2Async(sha256, new TextEncoder().encode(passphrase), hexToBytes(salt), {
    c: ITERATIONS,
    dkLen: 32,
    asyncTick: 20,
  });
  return { key, salt };
}

export async function newKey(passphrase: string, random: RandomBytes): Promise<VaultKey> {
  if (passphrase.length < 12) throw new Error('Use a passphrase with at least 12 characters.');
  return deriveKey(passphrase, bytesToHex(random(16)));
}

export function seal(journal: Journal, vault: VaultKey, random: RandomBytes): string {
  const nonce = random(12);
  const plain = new TextEncoder().encode(JSON.stringify(journal));
  const ciphertext = gcm(vault.key, nonce, AAD).encrypt(plain);
  plain.fill(0);
  const result: Envelope = {
    format: 'cycle-tracker-vault',
    version: 1,
    kdf: 'pbkdf2-sha256',
    iterations: ITERATIONS,
    salt: vault.salt,
    nonce: bytesToHex(nonce),
    ciphertext: bytesToHex(ciphertext),
  };
  const serialized = JSON.stringify(result);
  if (serialized.length > MAX_BACKUP_BYTES)
    throw new Error(
      'This journal has reached the preview storage limit. Export a backup before continuing.',
    );
  return serialized;
}

export function parseEnvelope(raw: string): Envelope {
  if (raw.length > MAX_BACKUP_BYTES) throw new Error('This backup is too large.');
  let e: Envelope;
  try {
    e = JSON.parse(raw);
  } catch {
    throw new Error('Choose a valid Cycle Tracker encrypted backup.');
  }
  const hex = (s: unknown, length?: number) =>
    typeof s === 'string' &&
    /^[0-9a-f]+$/.test(s) &&
    s.length % 2 === 0 &&
    (length === undefined || s.length === length);
  if (
    !e ||
    e.format !== 'cycle-tracker-vault' ||
    e.version !== 1 ||
    e.kdf !== 'pbkdf2-sha256' ||
    e.iterations !== ITERATIONS ||
    !hex(e.salt, 32) ||
    !hex(e.nonce, 24) ||
    !hex(e.ciphertext) ||
    e.ciphertext.length < 32
  ) {
    throw new Error('This is not a supported Cycle Tracker encrypted backup.');
  }
  return e;
}

export async function openVault(
  raw: string,
  passphrase: string,
): Promise<{ journal: Journal; vault: VaultKey }> {
  const envelope = parseEnvelope(raw);
  const vault = await deriveKey(passphrase, envelope.salt);
  let plain: Uint8Array;
  try {
    plain = gcm(vault.key, hexToBytes(envelope.nonce), AAD).decrypt(
      hexToBytes(envelope.ciphertext),
    );
  } catch {
    vault.key.fill(0);
    throw new Error('The passphrase is incorrect, or this backup has been damaged.');
  }
  try {
    return { journal: parseJournal(JSON.parse(new TextDecoder().decode(plain))), vault };
  } catch (error) {
    vault.key.fill(0);
    throw error;
  } finally {
    plain.fill(0);
  }
}
