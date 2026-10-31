import type { BrowserVaultDatabase } from './browserJournalStorage.ts';

export const JOURNAL_DATABASE = 'trifelle-journal-v1';
export const JOURNAL_OBJECT_STORE = 'encrypted-journal';
export const JOURNAL_RECORD_KEY = 'journal';
const unavailable = () =>
  new Error(
    'Browser storage is unavailable. Close other Trifelle tabs and retry. Do not clear site data without an encrypted backup.',
  );

export class IndexedVaultDatabase implements BrowserVaultDatabase {
  private factory: () => IDBFactory | undefined;
  private timeout: number;
  constructor(factory: () => IDBFactory | undefined = () => globalThis.indexedDB, timeout = 10000) {
    this.factory = factory;
    this.timeout = timeout;
  }
  private open(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      let settled = false;
      const fail = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        reject(unavailable());
      };
      const timer = setTimeout(fail, this.timeout);
      try {
        const factory = this.factory();
        if (!factory) {
          fail();
          return;
        }
        const request = factory.open(JOURNAL_DATABASE, 1);
        request.onerror = fail;
        request.onblocked = fail;
        request.onupgradeneeded = () => {
          if (settled) {
            request.transaction?.abort();
            return;
          }
          try {
            if (!request.result.objectStoreNames.contains(JOURNAL_OBJECT_STORE))
              request.result.createObjectStore(JOURNAL_OBJECT_STORE);
          } catch {
            request.transaction?.abort();
            fail();
          }
        };
        request.onsuccess = () => {
          const db = request.result;
          if (settled) {
            db.close();
            return;
          }
          settled = true;
          clearTimeout(timer);
          db.onversionchange = () => db.close();
          resolve(db);
        };
      } catch {
        fail();
      }
    });
  }
  private async transaction(value?: string): Promise<string | null> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction | undefined;
      let settled = false;
      let result: string | null = null;
      let verified = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        db.close();
        if (error) reject(error);
        else resolve(result);
      };
      const abort = () => {
        try {
          transaction?.abort();
        } catch {
          /* Already completed or aborted. */
        }
        finish(unavailable());
      };
      const timer = setTimeout(abort, this.timeout);
      try {
        transaction = db.transaction(
          JOURNAL_OBJECT_STORE,
          value === undefined ? 'readonly' : 'readwrite',
          { durability: 'strict' },
        );
        transaction.onabort = () => finish(unavailable());
        transaction.onerror = () => {
          /* Default request error handling aborts the transaction. */
        };
        transaction.oncomplete = () => finish(verified ? undefined : unavailable());
        const store = transaction.objectStore(JOURNAL_OBJECT_STORE);
        const read = () => {
          try {
            const request = store.get(JOURNAL_RECORD_KEY);
            request.onsuccess = () => {
              try {
                if (value === undefined) {
                  if (request.result !== undefined && typeof request.result !== 'string') {
                    abort();
                    return;
                  }
                  result = request.result ?? null;
                } else if (request.result !== value) {
                  abort();
                  return;
                }
                verified = true;
              } catch {
                abort();
              }
            };
          } catch {
            // An abort can arrive between put success and readback scheduling.
            // Handle it here as well as in the transaction's abort event.
            abort();
          }
        };
        if (value === undefined) read();
        else store.put(value, JOURNAL_RECORD_KEY).onsuccess = read;
      } catch {
        abort();
      }
    });
  }
  read(): Promise<string | null> {
    return this.transaction();
  }
  async write(record: string): Promise<void> {
    await this.transaction(record);
  }
}
