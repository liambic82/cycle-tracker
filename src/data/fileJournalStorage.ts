import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { MAX_BACKUP_BYTES, parseEnvelope } from '../domain/vault.ts';
import { STORAGE_KEY, type Storage } from './repository.ts';

type Slot = 'a' | 'b';
export interface VaultFiles {
  read(slot: Slot): Promise<string | null>;
  write(slot: Slot, encrypted: string): Promise<void>;
  remove(slot: Slot): Promise<void>;
}
const FORMAT = 'trifelle-vault-files';
const DELETED = JSON.stringify({ format: FORMAT, version: 1, state: 'deleted' });
type Pointer = {
  format: typeof FORMAT;
  version: 1;
  state: 'active';
  slot: Slot;
  bytes: number;
  digest: string;
};
type RecordState = Pointer | { state: 'legacy'; raw: string } | { state: 'deleted' } | null;
const damaged = () =>
  new Error('Your saved journal could not be read. Retry, or restore an encrypted backup.');

function parseRecord(raw: string | null): RecordState {
  if (raw === null) return null;
  let value;
  try {
    value = JSON.parse(raw);
  } catch {
    throw damaged();
  }
  if (value?.format === 'cycle-tracker-vault') {
    parseEnvelope(raw);
    return { state: 'legacy', raw };
  }
  if (value?.format !== FORMAT || value.version !== 1) throw damaged();
  if (value.state === 'deleted') return { state: 'deleted' };
  if (
    value.state !== 'active' ||
    !['a', 'b'].includes(value.slot) ||
    !Number.isInteger(value.bytes) ||
    value.bytes < 1 ||
    value.bytes > MAX_BACKUP_BYTES ||
    typeof value.digest !== 'string' ||
    !/^[0-9a-f]{64}$/.test(value.digest)
  )
    throw damaged();
  return value as Pointer;
}

function fingerprint(raw: string) {
  const bytes = new TextEncoder().encode(raw);
  if (bytes.length > MAX_BACKUP_BYTES) throw new Error('This encrypted journal exceeds 8 MB.');
  return { bytes: bytes.length, digest: bytesToHex(sha256(bytes)) };
}

// The database holds only a small, transactionally replaced pointer. Ciphertext
// lives in two bounded private files, avoiding Android's SQLite row/database limits.
// A single instance serializes reads, writes, replacement and deletion for the app.
export class FileJournalStorage implements Storage {
  private queue: Promise<unknown> = Promise.resolve();
  private metadata: Storage;
  private files: VaultFiles;
  constructor(metadata: Storage, files: VaultFiles) {
    this.metadata = metadata;
    this.files = files;
  }

  private run<T>(key: string, operation: () => Promise<T>): Promise<T> {
    if (key !== STORAGE_KEY) return Promise.reject(new Error('Unsupported journal storage key.'));
    const pending = this.queue.catch(() => undefined).then(operation);
    this.queue = pending.then(
      () => undefined,
      () => undefined,
    );
    return pending;
  }

  private async cleanDeleted() {
    // Keep the deletion marker until both files are gone: a restart must never
    // mistake an old encrypted file for a journal or resurrect a legacy copy.
    await this.files.remove('a');
    await this.files.remove('b');
    await this.metadata.removeItem(STORAGE_KEY);
  }

  getItem(key: string): Promise<string | null> {
    return this.run(key, async () => {
      const record = parseRecord(await this.metadata.getItem(STORAGE_KEY));
      if (!record) return null;
      if (record.state === 'deleted') {
        await this.cleanDeleted();
        return null;
      }
      if (record.state === 'legacy') return record.raw;
      const raw = await this.files.read(record.slot);
      if (raw === null) throw damaged();
      const actual = fingerprint(raw);
      if (record.bytes !== actual.bytes || record.digest !== actual.digest) throw damaged();
      parseEnvelope(raw);
      // No silent rollback to older health records if the active copy is damaged.
      await this.files.remove(record.slot === 'a' ? 'b' : 'a').catch(() => undefined);
      return raw;
    });
  }

  setItem(key: string, value: string): Promise<void> {
    return this.run(key, () => this.write(value, false));
  }

  // Only the explicit, confirmed restore flow may replace unreadable metadata.
  replace(value: string): Promise<void> {
    return this.run(STORAGE_KEY, () => this.write(value, true));
  }

  private async write(raw: string, replacing: boolean) {
    parseEnvelope(raw);
    const actual = fingerprint(raw);
    let metadata: string | null;
    let vacantSlot: Slot | undefined;
    try {
      metadata = await this.metadata.getItem(STORAGE_KEY);
    } catch (error) {
      if (!replacing) throw error;
      // An oversized legacy row can need explicit restore. A transient read
      // failure can also hide a valid pointer: never overwrite an occupied slot
      // before the new pointer commits, even in the confirmed restore flow.
      if ((await this.files.read('a')) === null) vacantSlot = 'a';
      else if ((await this.files.read('b')) === null) vacantSlot = 'b';
      else
        throw new Error('Storage could not be read safely. Restart the app and retry restoring.');
      metadata = null;
    }
    let previous: RecordState;
    try {
      previous = parseRecord(metadata);
    } catch (error) {
      if (!replacing) throw error;
      previous = null;
    }
    const slot: Slot =
      vacantSlot ?? (previous?.state === 'active' && previous.slot === 'a' ? 'b' : 'a');
    await this.files.write(slot, raw);
    if ((await this.files.read(slot)) !== raw)
      throw new Error('The journal write could not be verified. Retry saving.');
    const pointer: Pointer = { format: FORMAT, version: 1, state: 'active', slot, ...actual };
    // This is the commit point. Before it, the old pointer/legacy value is intact.
    // If the bridge reports an ambiguous commit failure, leave BOTH files intact.
    await this.metadata.setItem(STORAGE_KEY, JSON.stringify(pointer));
    // Cleanup failure is not a failed save; the committed file remains authoritative.
    await this.files.remove(slot === 'a' ? 'b' : 'a').catch(() => undefined);
  }

  removeItem(key: string): Promise<void> {
    return this.run(key, async () => {
      await this.metadata.setItem(STORAGE_KEY, DELETED);
      await this.cleanDeleted();
    });
  }
}
