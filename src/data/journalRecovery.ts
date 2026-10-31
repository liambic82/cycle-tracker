import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import type { Storage } from './repository.ts';

export const JOURNAL_OPERATION_KEY = 'cycle-tracker.journal-operation.v1';
type Kind = 'restore' | 'delete';
type Intent = { version: 1; kind: Kind; digest: string | null; requiresRestore?: true };
type Outcome = 'none' | 'unchanged' | 'replacement-required' | Kind;
const digest = (raw: string) => bytesToHex(sha256(new TextEncoder().encode(raw)));

export class JournalRecoveryRequired extends Error {
  constructor(committed?: Kind) {
    super(
      committed === 'restore'
        ? 'Your backup is saved. Cleanup could not finish. Retry recovery before opening it.'
        : committed === 'delete'
          ? 'Your journal was deleted. Cleanup could not finish. Retry recovery.'
          : 'An interrupted journal change needs recovery. Retry recovery before opening your journal.',
    );
  }
}

class DamagedRecoveryRecord extends JournalRecoveryRequired {}

// The caller holds the journal edit lease throughout recovery and replacement.
// Only a hash of encrypted bytes is persisted here, never health data or a key.
// Cleanup is idempotent and cannot begin until the committed journal is verified.
export class JournalRecovery {
  private queue: Promise<unknown> = Promise.resolve();
  private storage: Storage;
  private readJournal: () => Promise<string | null>;
  private cleanup: () => Promise<void>;

  constructor(
    storage: Storage,
    readJournal: () => Promise<string | null>,
    cleanup: () => Promise<void>,
  ) {
    this.storage = storage;
    this.readJournal = readJournal;
    this.cleanup = cleanup;
  }

  private run<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.catch(() => undefined).then(operation);
    this.queue = result;
    return result;
  }

  private async intent(): Promise<Intent | null> {
    let raw: string | null;
    try {
      raw = await this.storage.getItem(JOURNAL_OPERATION_KEY);
    } catch {
      throw new JournalRecoveryRequired();
    }
    if (raw === null) return null;
    try {
      if (raw.length > 256) throw new Error('Invalid recovery record');
      const value = JSON.parse(raw);
      if (
        value?.version !== 1 ||
        (value.requiresRestore !== undefined && value.requiresRestore !== true) ||
        (value.kind !== 'restore' && value.kind !== 'delete') ||
        (value.kind === 'restore'
          ? typeof value.digest !== 'string' || !/^[a-f0-9]{64}$/.test(value.digest)
          : value.digest !== null)
      )
        throw new Error('Invalid recovery record');
      return value;
    } catch {
      throw new DamagedRecoveryRecord();
    }
  }

  // Read-only: startup must acquire the edit lease before reconciling an intent
  // that might still belong to another browser tab's in-flight operation.
  async pending(): Promise<boolean> {
    return (await this.intent()) !== null;
  }

  private async resumeCore(): Promise<Outcome> {
    const intent = await this.intent();
    if (!intent) return 'none';
    let committed = false;
    try {
      const raw = await this.readJournal();
      committed =
        intent.kind === 'delete' ? raw === null : raw !== null && digest(raw) === intent.digest;
      // A confirmed restore may repair a damaged marker, but a failed attempt
      // must not silently turn unknown cleanup state into ordinary unlock.
      if (!committed && intent.requiresRestore) return 'replacement-required';
      if (committed) await this.cleanup();
      // A different journal means the intended write did not commit. Preserve
      // its convenience settings; removing an uncommitted intent is safe.
      await this.storage.removeItem(JOURNAL_OPERATION_KEY);
      return committed ? intent.kind : 'unchanged';
    } catch {
      throw new JournalRecoveryRequired(committed ? intent.kind : undefined);
    }
  }

  resume(): Promise<Outcome> {
    return this.run(async () => {
      const outcome = await this.resumeCore();
      if (outcome === 'replacement-required') throw new JournalRecoveryRequired();
      return outcome;
    });
  }

  change(target: string | null, write: () => Promise<void>): Promise<void> {
    return this.run(async () => {
      // Never supersede a valid pending cleanup: if the new write then failed,
      // we would lose the previous operation's cleanup obligation.
      let requiresRestore = false;
      try {
        requiresRestore = (await this.resumeCore()) === 'replacement-required';
      } catch (error) {
        if (target !== null && error instanceof DamagedRecoveryRecord) requiresRestore = true;
        else throw error;
      }
      if (target === null && requiresRestore) throw new JournalRecoveryRequired();
      const kind: Kind = target === null ? 'delete' : 'restore';
      const raw = JSON.stringify({
        version: 1,
        kind,
        digest: target === null ? null : digest(target),
        ...(requiresRestore ? { requiresRestore: true } : {}),
      });
      try {
        await this.storage.setItem(JOURNAL_OPERATION_KEY, raw);
        if ((await this.storage.getItem(JOURNAL_OPERATION_KEY)) !== raw)
          throw new Error('Recovery record was not saved');
      } catch {
        // The marker may have committed even if the storage bridge rejected.
        // Do not write the journal until the marker is known to be durable.
        throw new JournalRecoveryRequired();
      }
      let writeError: unknown;
      try {
        await write();
      } catch (error) {
        writeError = error;
      }
      // Read even after a rejected write: it may have committed before the
      // bridge failed. Recovery uses actual storage, not the promise result.
      const outcome = await this.resumeCore();
      if (outcome === 'replacement-required') throw new JournalRecoveryRequired();
      if (outcome !== kind)
        throw writeError ?? new Error('The journal change could not be saved. Please retry.');
    });
  }
}
