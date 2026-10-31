const { chromium } = require(process.env.TRIFELLE_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const {
  VAULT,
  DATABASE,
  installStorageFaults,
  readDatabase,
  readVault,
} = require('./browser-storage-qa.cjs');
const origin = process.env.TRIFELLE_QA_URL || 'http://127.0.0.1:4174/';
const output = 'artifacts/qa/0.27.0';
const passphrase = 'Fictional migration journal 2026';
const hash = (raw) => createHash('sha256').update(raw).digest('hex');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { newKey, seal, openVaultWithKey, parseEnvelope } = await import('../src/domain/vault.ts');
  const { fictionalJournal } = await import('./fictional-journal.ts');
  const key = await newKey(passphrase, randomBytes);
  const original = seal(fictionalJournal(365, '2026-10-31'), key, randomBytes);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = {};
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      acceptDownloads: true,
      timezoneId: 'America/New_York',
    });
    await installStorageFaults(context);
    let page = await context.newPage();
    const errors = [];
    context.on('page', (p) => p.on('pageerror', (error) => errors.push(error.message)));
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(origin);
    await page.getByRole('button', { name: 'Create my journal', exact: true }).waitFor();
    await page.evaluate(
      ({ VAULT, original }) => {
        localStorage.setItem(VAULT, original);
        localStorage.setItem('qa.preference', 'preserve this fictional preference');
        localStorage.setItem('cycle-tracker.reminder-opt-ins.v1', 'fictional opt-ins');
      },
      { VAULT, original },
    );
    await page.reload();
    await page.getByRole('button', { name: 'Unlock journal', exact: true }).waitFor();
    assert.equal(await readDatabase(page), null, 'startup cannot migrate outside the edit lease');
    await page.evaluate(() => {
      navigator.locks.request('cycle-tracker-vault-editor', async () => {
        window.qaLeaseHeld = true;
        await new Promise((resolve) => {
          window.qaReleaseLease = resolve;
        });
      });
    });
    await page.waitForFunction(() => window.qaLeaseHeld);
    const olderEditor = page;
    page = await context.newPage();
    await page.goto(origin);
    const button = (name) => page.getByRole('button', { name, exact: true });
    const text = (name) => page.getByRole('textbox', { name, exact: true });
    const legacy = () => page.evaluate((key) => localStorage.getItem(key), VAULT);
    const unlock = async () => {
      await text('Passphrase').fill(passphrase);
      await button('Unlock journal').click();
    };
    const calendar = () => page.getByRole('tab', { name: 'Calendar', exact: true });
    await unlock();
    await page.getByRole('alert').filter({ hasText: 'open in another tab' }).waitFor();
    assert.equal(await readDatabase(page), null);
    assert.equal(hash(await legacy()), hash(original));
    await olderEditor.evaluate(() => window.qaReleaseLease());
    await olderEditor.close();
    results.migrationRespectsOtherEditor = true;

    await page.evaluate((key) => sessionStorage.setItem('qa.failWrite', key), VAULT);
    await unlock();
    await page.getByRole('alert').filter({ hasText: 'Browser storage is unavailable' }).waitFor();
    assert.equal(await readDatabase(page), null);
    assert.equal(hash(await legacy()), hash(original));
    await page.evaluate(() => {
      sessionStorage.removeItem('qa.failWrite');
      sessionStorage.setItem('qa.failGuard', '1');
    });
    await unlock();
    await page.getByRole('alert').filter({ hasText: 'Fictional migration interruption' }).waitFor();
    assert.equal(hash(await legacy()), hash(original));
    assert.equal(hash(JSON.parse(await readDatabase(page)).vault), hash(original));
    await page.reload();
    await button('Unlock journal').waitFor();
    assert.equal(await button('Create my journal').count(), 0);
    await page.evaluate(() => sessionStorage.removeItem('qa.failGuard'));
    await unlock();
    await calendar().waitFor();
    assert.equal(hash(await readVault(page)), hash(original));
    assert.equal(JSON.parse(await legacy()).format, 'trifelle-indexed-journal');
    assert.throws(() =>
      parseEnvelope(JSON.stringify({ format: 'trifelle-indexed-journal', version: 1 })),
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem('qa.preference')),
      'preserve this fictional preference',
    );
    assert.equal(
      await page.evaluate(() => localStorage.getItem('cycle-tracker.reminder-opt-ins.v1')),
      'fictional opt-ins',
    );
    results.interruptedMigrationRetainsLegacyAndResumes = true;
    results.ciphertextAndOtherSettingsPreserved = true;

    // Unavailability cannot be interpreted as a new empty journal.
    await page.getByRole('tab', { name: 'Your data', exact: true }).click();
    await button('Lock now').click();
    await button('Unlock journal').waitFor();
    await page.evaluate(() => sessionStorage.setItem('qa.failOpen', '1'));
    await page.reload();
    await button('Unlock journal').waitFor();
    assert.equal(await button('Create my journal').count(), 0);
    await page.getByRole('alert').waitFor();
    await page.evaluate(() => sessionStorage.removeItem('qa.failOpen'));
    await unlock();
    await calendar().waitFor();
    results.databaseDenialDoesNotCreateEmptyJournal = true;

    await page.getByRole('button', { name: /^October 31, 2026,/ }).click();
    await button('Notes').click();
    await page.getByText('Saved on this device', { exact: true }).first().waitFor();
    const savedBefore = hash(await readVault(page));
    await page.evaluate((key) => sessionStorage.setItem('qa.failWrite', key), VAULT);
    await text('Daily note').fill('Fictional migration retry note');
    await page.getByText('Not saved', { exact: true }).first().waitFor();
    assert.equal(hash(await readVault(page)), savedBefore);
    let warned = false;
    page.once('dialog', async (dialog) => {
      warned = dialog.type() === 'beforeunload';
      await dialog.dismiss();
    });
    await page.reload({ timeout: 3000 }).catch((error) => {
      if (!/ERR_ABORTED|Timeout/.test(error.message)) throw error;
    });
    assert.equal(warned, true);
    assert.equal(await text('Daily note').inputValue(), 'Fictional migration retry note');
    await button('Close daily journal').click();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.evaluate(() => sessionStorage.removeItem('qa.failWrite'));
    await button('Retry saving').click();
    await button('Retry saving').waitFor({ state: 'hidden' });
    assert.equal(
      openVaultWithKey(await readVault(page), key).entries['2026-10-31'].note,
      'Fictional migration retry note',
    );
    results.failedSaveWarningAndRetry = true;
    await page.getByRole('tab', { name: 'Your data', exact: true }).click();
    const download = page.waitForEvent('download');
    await button('Download encrypted backup').click();
    const backupPath = path.resolve(output, 'fictional-migrated.cyclevault');
    await (await download).saveAs(backupPath);
    assert.equal(
      openVaultWithKey(fs.readFileSync(backupPath, 'utf8'), key).entries['2026-10-31'].note,
      'Fictional migration retry note',
    );
    await button('Lock now').click();
    await button('Unlock journal').waitFor();

    // Simulate loss of only the IndexedDB database. The guard must prevent new setup.
    await page.evaluate(
      (DATABASE) =>
        new Promise((resolve, reject) => {
          const request = indexedDB.deleteDatabase(DATABASE);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('Test database connection leaked'));
        }),
      DATABASE,
    );
    await page.reload();
    await button('Unlock journal').waitFor();
    assert.equal(await button('Create my journal').count(), 0);
    await page
      .getByText(
        'Local storage could not be read. Unlock to retry, or restore an encrypted backup.',
        {
          exact: true,
        },
      )
      .scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${output}/missing-database.png` });
    const picker = page.waitForEvent('filechooser');
    await button('Restore a backup').click();
    await (await picker).setFiles(backupPath);
    await button('I have saved what I need').click();
    await text('Passphrase').fill(passphrase);
    await button('Restore journal').click();
    await calendar().waitFor();
    assert.equal(
      openVaultWithKey(await readVault(page), key).entries['2026-10-31'].note,
      'Fictional migration retry note',
    );
    results.missingDatabaseRequiresRecoveryAndBackupRepairs = true;
    assert.deepEqual(errors, []);
    results.pageErrors = errors;
    fs.writeFileSync(`${output}/browser-migration-results.json`, JSON.stringify(results, null, 2));
    console.log(results);
  } finally {
    key.key.fill(0);
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
