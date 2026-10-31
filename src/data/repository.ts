import { sealSerializedJournal, type RandomBytes, type VaultKey } from '../domain/vault.ts';
import type { Journal } from '../domain/journal.ts';

export const STORAGE_KEY = 'cycle-tracker.encrypted-vault.v1';
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

// One writer per unlocked session: a slow write cannot replace a newer edit.
export class JournalWriter {
  private queue: Promise<void> = Promise.resolve();
  private running = false;
  private pending: {
    serialized: string;
    vault: VaultKey;
    waiters: Array<{ resolve: () => void; reject: (error: unknown) => void }>;
  } | null = null;
  private closed = false;
  private storage: Storage;
  private vault: VaultKey;
  private random: RandomBytes;
  constructor(storage: Storage, vault: VaultKey, random: RandomBytes) {
    this.storage = storage;
    this.vault = vault;
    this.random = random;
  }

  save(journal: Journal): Promise<void> {
    if (this.closed) throw new Error('This journal session is being deleted or has ended.');
    // Snapshot now: later mutations by a caller cannot alter an accepted save.
    // While a write is in flight, retain only the newest waiting snapshot.
    const serialized = JSON.stringify(journal);
    this.queue = new Promise<void>((resolve, reject) => {
      if (this.pending) {
        this.pending.serialized = serialized;
        this.pending.waiters.push({ resolve, reject });
      } else
        this.pending = {
          serialized,
          // Accepted saves may finish after session cleanup zeroes the caller's
          // key. Own a short-lived copy until this batch has been encrypted.
          vault: { key: new Uint8Array(this.vault.key), salt: this.vault.salt },
          waiters: [{ resolve, reject }],
        };
    });
    if (!this.running) {
      this.running = true;
      void Promise.resolve().then(() => this.drain());
    }
    return this.queue;
  }

  private async drain(): Promise<void> {
    while (this.pending) {
      const batch = this.pending;
      this.pending = null;
      try {
        const encrypted = sealSerializedJournal(batch.serialized, batch.vault, this.random);
        batch.vault.key.fill(0);
        batch.serialized = '';
        await this.storage.setItem(STORAGE_KEY, encrypted);
        for (const waiter of batch.waiters) waiter.resolve();
      } catch (error) {
        for (const waiter of batch.waiters) waiter.reject(error);
      } finally {
        batch.vault.key.fill(0);
        batch.serialized = '';
      }
    }
    this.running = false;
  }

  flush(): Promise<void> {
    return this.queue;
  }

  erase(): Promise<void> {
    if (this.closed) return Promise.reject(new Error('This journal session has ended.'));
    // Retire before waiting: neither queued nor late saves may recreate a deleted vault.
    this.closed = true;
    this.queue = this.queue
      .catch(() => undefined)
      .then(() => this.storage.removeItem(STORAGE_KEY))
      .catch((error) => {
        this.closed = false;
        throw error;
      });
    return this.queue;
  }
}
