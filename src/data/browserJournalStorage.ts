import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { MAX_BACKUP_BYTES, parseEnvelope } from '../domain/vault.ts';
import { STORAGE_KEY, type Storage } from './repository.ts';

// A small guard replaces the old ciphertext only after the database is verified.
// Old app builds cannot mistake a migrated/deleted journal for an empty device.
export const BROWSER_JOURNAL_GUARD = JSON.stringify({
  format: 'trifelle-indexed-journal',
  version: 1,
});
const FORMAT = 'trifelle-browser-journal';
type RecordState = { state: 'active'; vault: string } | { state: 'deleted' };
export interface BrowserVaultDatabase {
  read(): Promise<string | null>;
  // Resolves on transaction commit, not on the individual put request.
  write(record: string): Promise<void>;
}
const fingerprint = (raw: string) => bytesToHex(sha256(new TextEncoder().encode(raw)));
const damaged = () =>
  new Error('Your browser journal could not be read. Retry, or restore an encrypted backup.');
function encode(vault: string | null): string {
  return JSON.stringify(
    vault === null
      ? { format: FORMAT, version: 1, state: 'deleted' }
      : { format: FORMAT, version: 1, state: 'active', vault, digest: fingerprint(vault) },
  );
}
function decode(raw: string): RecordState {
  try {
    if (raw.length > MAX_BACKUP_BYTES + 1024) throw damaged();
    const value = JSON.parse(raw);
    if (value?.format !== FORMAT || value.version !== 1) throw damaged();
    if (value.state === 'deleted') return { state: 'deleted' };
    if (
      value.state !== 'active' ||
      typeof value.vault !== 'string' ||
      typeof value.digest !== 'string'
    )
      throw damaged();
    parseEnvelope(value.vault);
    if (fingerprint(value.vault) !== value.digest) throw damaged();
    return { state: 'active', vault: value.vault };
  } catch {
    throw damaged();
  }
}

// Mutating methods require the caller's exclusive journal edit lease. Reads never
// migrate, erase, repair, or fall back from an unreadable canonical database.
export class BrowserJournalStorage implements Storage {
  private queue: Promise<unknown> = Promise.resolve();
  private legacy: Storage;
  private database: BrowserVaultDatabase;
  constructor(legacy: Storage, database: BrowserVaultDatabase) {
    this.legacy = legacy;
    this.database = database;
  }
  private run<T>(work: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(work);
    this.queue = result;
    return result;
  }
  private checkKey(key: string) {
    if (key !== STORAGE_KEY) throw new Error('Unsupported journal storage key.');
  }
  private async legacyJournal(): Promise<string | null> {
    const raw = await this.legacy.getItem(STORAGE_KEY);
    if (raw !== null) {
      try {
        parseEnvelope(raw);
      } catch {
        throw damaged();
      } // A guard with a missing database is never an empty journal.
    }
    return raw;
  }
  getItem(key: string): Promise<string | null> {
    this.checkKey(key);
    return this.run(async () => {
      const raw = await this.database.read(); // A failed read is never proof of absence.
      if (raw === null) return this.legacyJournal();
      const value = decode(raw);
      if ((await this.legacy.getItem(STORAGE_KEY)) !== BROWSER_JOURNAL_GUARD)
        throw new Error(
          'Browser storage migration needs to finish. Unlock to retry, or restore a backup.',
        );
      return value.state === 'active' ? value.vault : null;
    });
  }
  private async guard() {
    if ((await this.legacy.getItem(STORAGE_KEY)) !== BROWSER_JOURNAL_GUARD) {
      await this.legacy.setItem(STORAGE_KEY, BROWSER_JOURNAL_GUARD);
      if ((await this.legacy.getItem(STORAGE_KEY)) !== BROWSER_JOURNAL_GUARD)
        throw new Error('Browser storage migration could not finish. Please retry.');
    }
  }
  private async commit(vault: string | null) {
    const record = encode(vault);
    await this.database.write(record);
    // Verify a fresh committed read before replacing the only legacy copy.
    if ((await this.database.read()) !== record)
      throw new Error('The browser journal write could not be verified. Please retry.');
    await this.guard();
  }
  private async prepareCore() {
    const raw = await this.database.read();
    if (raw !== null) {
      decode(raw);
      await this.guard(); // Also finishes interrupted migration/deletion cleanup.
      return;
    }
    const legacy = await this.legacyJournal();
    if (legacy !== null) await this.commit(legacy);
  }
  // Called after acquiring the edit lease, before unlock or journal recovery.
  prepare(): Promise<void> {
    return this.run(() => this.prepareCore());
  }
  setItem(key: string, encrypted: string): Promise<void> {
    this.checkKey(key);
    parseEnvelope(encrypted);
    return this.run(async () => {
      await this.prepareCore();
      await this.commit(encrypted);
    });
  }
  // Explicit, decrypted and confirmed backup restore may repair damaged records.
  replace(encrypted: string): Promise<void> {
    parseEnvelope(encrypted);
    return this.run(() => this.commit(encrypted));
  }
  removeItem(key: string): Promise<void> {
    this.checkKey(key);
    return this.run(async () => {
      await this.prepareCore();
      // Keep a durable tombstone: a leftover old copy can never resurrect data.
      await this.commit(null);
    });
  }
}
