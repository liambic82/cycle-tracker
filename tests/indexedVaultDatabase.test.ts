import test from 'node:test';
import assert from 'node:assert/strict';
import { IndexedVaultDatabase } from '../src/data/indexedVaultDatabase.ts';

test('missing or denied IndexedDB rejects instead of reporting an empty journal', async () => {
  await assert.rejects(new IndexedVaultDatabase(() => undefined).read(), /unavailable/);
  await assert.rejects(
    new IndexedVaultDatabase(() => {
      throw new Error('denied');
    }).read(),
    /unavailable/,
  );
});

for (const cause of ['blocked', 'timeout']) {
  test(`${cause} opening rejects and closes a late connection without using it`, async () => {
    let closed = 0;
    const request = {
      result: {
        close() {
          closed++;
        },
      },
      onsuccess: () => {},
      onblocked: () => {},
      onerror: () => {},
    };
    const factory = {
      open() {
        if (cause === 'blocked') queueMicrotask(() => request.onblocked());
        return request;
      },
    } as unknown as IDBFactory;
    await assert.rejects(new IndexedVaultDatabase(() => factory, 15).read(), /unavailable/);
    request.onsuccess();
    assert.equal(closed, 1);
  });
}

function transactionFixture(aborted = false) {
  let enter!: () => void;
  const entered = new Promise<void>((resolve) => {
    enter = resolve;
  });
  let closes = 0;
  const put = { onsuccess: () => {} };
  const read = { result: 'encrypted test record', onsuccess: () => {} };
  const tx = {
    oncomplete: () => {},
    onabort: () => {},
    onerror: () => {},
    abort() {
      queueMicrotask(() => tx.onabort());
    },
    objectStore() {
      return {
        put() {
          enter();
          return put;
        },
        get() {
          if (aborted) throw new Error('transaction finished');
          return read;
        },
      };
    },
  };
  const request = {
    onsuccess: () => {},
    onblocked: () => {},
    onerror: () => {},
    result: {
      close() {
        closes++;
      },
      transaction() {
        return tx;
      },
    },
  };
  const factory = {
    open() {
      queueMicrotask(() => request.onsuccess());
      return request;
    },
  } as unknown as IDBFactory;
  return {
    database: new IndexedVaultDatabase(() => factory),
    entered,
    put,
    read,
    tx,
    closes: () => closes,
  };
}

test('a successful put and readback do not resolve before the transaction commits', async () => {
  const f = transactionFixture();
  let completed = false;
  const write = f.database.write('encrypted test record').then(() => {
    completed = true;
  });
  await f.entered;
  f.put.onsuccess();
  f.read.onsuccess();
  await Promise.resolve();
  assert.equal(completed, false);
  f.tx.oncomplete();
  await write;
  assert.equal(f.closes(), 1);
});

test('abort between put success and readback rejects without escaping the callback', async () => {
  const f = transactionFixture(true);
  const failure = assert.rejects(f.database.write('encrypted test record'), /unavailable/);
  await f.entered;
  assert.doesNotThrow(() => f.put.onsuccess());
  await failure;
  assert.equal(f.closes(), 1);
});
