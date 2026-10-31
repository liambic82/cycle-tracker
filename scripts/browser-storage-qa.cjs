// Helpers for isolated, fictional-data browser tests. No existing browser profile.
const VAULT = 'cycle-tracker.encrypted-vault.v1';
const DATABASE = 'trifelle-journal-v1',
  STORE = 'encrypted-journal',
  ROW = 'journal';
async function installStorageFaults(context) {
  await context.addInitScript(
    ({ VAULT, STORE }) => {
      const set = Storage.prototype.setItem,
        remove = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (key, value) {
        if (
          key === VAULT &&
          sessionStorage.getItem('qa.failGuard') &&
          value.includes('trifelle-indexed-journal')
        )
          throw new Error('Fictional migration interruption');
        return set.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key) {
        if (sessionStorage.getItem('qa.failRemove') === key)
          throw new Error('Fictional removal failure');
        return remove.call(this, key);
      };
      const put = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (value, key) {
        if (this.name === STORE) {
          if (
            sessionStorage.getItem('qa.failWrite') === VAULT ||
            (sessionStorage.getItem('qa.failRemove') === VAULT &&
              JSON.parse(value).state === 'deleted')
          )
            throw new DOMException('Fictional quota failure', 'QuotaExceededError');
        }
        const request = put.call(this, value, key);
        if (this.name === STORE && sessionStorage.getItem('qa.abortTransaction')) {
          const transaction = this.transaction;
          request.addEventListener('success', () =>
            queueMicrotask(() => {
              try {
                transaction.abort();
              } catch {
                /* Already aborted. */
              }
            }),
          );
        }
        return request;
      };
      const open = IDBFactory.prototype.open;
      IDBFactory.prototype.open = function (...args) {
        if (sessionStorage.getItem('qa.failOpen'))
          throw new DOMException('Fictional permission denial', 'SecurityError');
        return open.apply(this, args);
      };
    },
    { VAULT, STORE },
  );
}
async function readDatabase(page) {
  return page.evaluate(
    ({ DATABASE, STORE, ROW }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(DATABASE, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.close();
            resolve(null);
            return;
          }
          const tx = db.transaction(STORE, 'readonly');
          let raw = null;
          tx.objectStore(STORE).get(ROW).onsuccess = (event) => {
            raw = event.target.result ?? null;
          };
          tx.oncomplete = () => {
            db.close();
            resolve(raw);
          };
          tx.onabort = () => {
            db.close();
            reject(tx.error);
          };
        };
      }),
    { DATABASE, STORE, ROW },
  );
}
async function readVault(page) {
  const raw = await readDatabase(page);
  if (raw !== null) {
    const value = JSON.parse(raw);
    return value.state === 'deleted' ? null : value.vault;
  }
  const legacy = await page.evaluate((key) => localStorage.getItem(key), VAULT);
  return legacy && JSON.parse(legacy).format === 'cycle-tracker-vault' ? legacy : null;
}
module.exports = { VAULT, DATABASE, STORE, ROW, installStorageFaults, readDatabase, readVault };
