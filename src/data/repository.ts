import { seal, type RandomBytes, type VaultKey } from '../domain/vault.ts';
import type { Journal } from '../domain/journal.ts';

export const STORAGE_KEY = 'cycle-tracker.encrypted-vault.v1';
export interface Storage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
}

// One writer per unlocked session: a slow write cannot replace a newer edit.
export class JournalWriter {
  private queue: Promise<void> = Promise.resolve();
  private storage: Storage;
  private vault: VaultKey;
  private random: RandomBytes;
  constructor(storage: Storage, vault: VaultKey, random: RandomBytes) {
    this.storage = storage;
    this.vault = vault;
    this.random = random;
  }

  save(journal: Journal): Promise<void> {
    const encrypted = seal(journal, this.vault, this.random);
    this.queue = this.queue
      .catch(() => undefined)
      .then(() => this.storage.setItem(STORAGE_KEY, encrypted));
    return this.queue;
  }

  flush(): Promise<void> {
    return this.queue;
  }
}
