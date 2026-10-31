// Requires a production preview server and Playwright with installed Chrome.
// Fresh temporary browser contexts only; never opens a user's browser profile.
const { chromium } = require(process.env.TRIFELLE_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const origin = process.env.TRIFELLE_QA_URL || 'http://127.0.0.1:4174/';
const output = 'artifacts/qa/0.26.0';
const VAULT = 'cycle-tracker.encrypted-vault.v1';
const INTENT = 'cycle-tracker.journal-operation.v1';
const PHOTO = 'cycle-tracker.personal-background.v1';
const REMINDERS = 'cycle-tracker.reminder-opt-ins.v1';
const passphrase = 'Fictional QA journal 2026';
const hash = (raw) => createHash('sha256').update(raw).digest('hex');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const { newKey, seal, openVaultWithKey } = await import('../src/domain/vault.ts');
  const { fictionalJournal } = await import('./fictional-journal.ts');
  const vault = await newKey(passphrase, randomBytes);
  const backupPath = path.resolve(output, 'fictional-five-years.cyclevault');
  const oversizedPath = path.resolve(output, 'fictional-ten-years.cyclevault');
  fs.writeFileSync(backupPath, seal(fictionalJournal(1825), vault, randomBytes));
  fs.writeFileSync(oversizedPath, seal(fictionalJournal(3650), vault, randomBytes));
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = {};
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await context.addInitScript(() => {
      const write = Storage.prototype.setItem,
        remove = Storage.prototype.removeItem;
      Storage.prototype.setItem = function (key, value) {
        if (sessionStorage.getItem('qa.failWrite') === key)
          throw new Error('Fictional write failure');
        return write.call(this, key, value);
      };
      Storage.prototype.removeItem = function (key) {
        if (sessionStorage.getItem('qa.failRemove') === key)
          throw new Error('Fictional removal failure');
        return remove.call(this, key);
      };
    });
    const button = (name) => page.getByRole('button', { name, exact: true });
    const text = (name) => page.getByRole('textbox', { name, exact: true });
    const read = (key) => page.evaluate((key) => localStorage.getItem(key), key);
    const seedConveniences = () =>
      page.evaluate(
        ({ PHOTO, REMINDERS }) => {
          localStorage.setItem(PHOTO, 'fictional prior photo slot');
          localStorage.setItem(REMINDERS, 'fictional prior reminder opt-ins');
        },
        { PHOTO, REMINDERS },
      );
    const chooseBackup = async (filename = backupPath) => {
      const picker = page.waitForEvent('filechooser');
      await button('Restore a backup').click();
      await (await picker).setFiles(filename);
      await button('I have saved what I need').click();
    };
    const restore = async (password = passphrase) => {
      await text('Passphrase').fill(password);
      await button('Restore journal').click();
    };
    const calendar = () => page.getByRole('tab', { name: 'Calendar', exact: true });
    await page.goto(origin);
    await text('Passphrase').fill(passphrase);
    await text('Confirm passphrase').fill(passphrase);
    await button('Create my journal').click();
    await calendar().waitFor();

    // A second tab must not reconcile another tab's active intent.
    await page.evaluate(
      (INTENT) =>
        localStorage.setItem(
          INTENT,
          JSON.stringify({ version: 1, kind: 'restore', digest: 'a'.repeat(64) }),
        ),
      INTENT,
    );
    const other = await context.newPage();
    await other.goto(origin);
    await other.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    assert.notEqual(await read(INTENT), null);
    await page.bringToFront();
    await page.getByRole('tab', { name: 'Your data', exact: true }).click();
    await button('Lock now').click();
    await button('Unlock journal').waitFor();
    await other.getByRole('button', { name: 'Retry recovery', exact: true }).click();
    await other.getByRole('button', { name: 'Unlock journal', exact: true }).waitFor();
    assert.equal(await read(INTENT), null);
    await other.close();
    results.otherTabCannotDiscardIntent = true;

    await seedConveniences();
    const before = hash(await read(VAULT));
    await chooseBackup();
    await restore('wrong fictional passphrase');
    await page.getByRole('alert').waitFor();
    assert.equal(hash(await read(VAULT)), before);
    assert.equal(await read(INTENT), null);
    assert.notEqual(await read(PHOTO), null);
    await page.evaluate((key) => sessionStorage.setItem('qa.failWrite', key), VAULT);
    await restore();
    await page.getByRole('alert').filter({ hasText: 'Fictional write failure' }).waitFor();
    assert.equal(hash(await read(VAULT)), before);
    assert.equal(await read(INTENT), null);
    assert.notEqual(await read(PHOTO), null);
    assert.notEqual(await read(REMINDERS), null);
    results.failedRestorePreservesJournalAndConveniences = true;

    await page.evaluate((key) => {
      sessionStorage.removeItem('qa.failWrite');
      sessionStorage.setItem('qa.failRemove', key);
    }, PHOTO);
    await button('Cancel restore').click();
    await chooseBackup(oversizedPath);
    await restore();
    await page.getByRole('alert').filter({ hasText: /quota/i }).waitFor();
    assert.equal(hash(await read(VAULT)), before);
    assert.notEqual(await read(PHOTO), null);
    assert.notEqual(await read(REMINDERS), null);
    results.browserQuotaFailurePreservesPriorJournal = true;
    await button('Cancel restore').click();
    await chooseBackup();
    await restore();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    assert.notEqual(hash(await read(VAULT)), before);
    assert.notEqual(await read(INTENT), null);
    assert.notEqual(await read(PHOTO), null);
    await page.reload();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    assert.equal(await button('Unlock journal').count(), 0);
    assert.equal(await button('Explore with sample data').count(), 0);
    for (const width of [320, 390, 1280]) {
      await page.setViewportSize({ width, height: width === 320 ? 740 : 900 });
      await page.emulateMedia({ colorScheme: width === 390 ? 'dark' : 'light' });
      await page.screenshot({ path: `${output}/recovery-${width}.png`, fullPage: true });
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    }
    await page.setViewportSize({ width: 320, height: 740 });
    await page.evaluate(() => {
      for (const element of document.querySelectorAll('body *')) {
        if (
          [...element.childNodes].some(
            (child) => child.nodeType === Node.TEXT_NODE && child.textContent.trim(),
          )
        ) {
          const css = getComputedStyle(element);
          element.style.fontSize = `${parseFloat(css.fontSize) * 2}px`;
          if (css.lineHeight !== 'normal')
            element.style.lineHeight = `${parseFloat(css.lineHeight) * 2}px`;
        }
      }
    });
    await button('Retry recovery').scrollIntoViewIfNeeded();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: `${output}/recovery-text-200.png`, fullPage: true });
    await page.reload();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    await page.evaluate(() => sessionStorage.removeItem('qa.failRemove'));
    await button('Retry recovery').click();
    await button('Unlock journal').waitFor();
    assert.equal(await read(INTENT), null);
    assert.equal(await read(PHOTO), null);
    assert.equal(await read(REMINDERS), null);
    await text('Passphrase').fill(passphrase);
    const openedAt = Date.now();
    await button('Unlock journal').click();
    await calendar().waitFor();
    results.largeJournalUnlockMs = Date.now() - openedAt;
    assert.equal(Object.keys(openVaultWithKey(await read(VAULT), vault).entries).length, 1825);
    results.cleanupResumesAfterReload = true;

    await page.setViewportSize({ width: 390, height: 844 });
    await button('Find date').click();
    await text('Jump to date').fill('2022-01-01');
    await button('Go to date').click();
    await page.getByRole('button', { name: /^January 1, 2022,/ }).waitFor();
    await button('Year').click();
    await button('Previous year').click();
    await page.screenshot({ path: `${output}/large-calendar-year.png` });
    await page.getByRole('tab', { name: 'Your history', exact: true }).click();
    await page.getByText('Cycle length', { exact: true }).waitFor();
    await page.screenshot({ path: `${output}/large-history.png` });
    results.largeCalendarAndHistory = true;

    await page.getByRole('tab', { name: 'Your data', exact: true }).click();
    await seedConveniences();
    await button('Delete journal from this device').click();
    await text('Type DELETE to confirm journal deletion').fill('DELETE');
    await page.evaluate((key) => sessionStorage.setItem('qa.failRemove', key), VAULT);
    await button('Permanently delete journal').click();
    await page.getByRole('alert').filter({ hasText: 'It is still open' }).waitFor();
    assert.notEqual(await read(VAULT), null);
    assert.notEqual(await read(PHOTO), null);
    assert.notEqual(await read(REMINDERS), null);
    await page.evaluate((key) => sessionStorage.setItem('qa.failRemove', key), PHOTO);
    await button('Permanently delete journal').click();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    assert.equal(await read(VAULT), null);
    assert.notEqual(await read(INTENT), null);
    await page.reload();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    await page.evaluate(() => sessionStorage.removeItem('qa.failRemove'));
    await button('Retry recovery').click();
    await button('Create my journal').waitFor();
    assert.equal(await read(INTENT), null);
    assert.equal(await read(PHOTO), null);
    results.failedDeletionRetainsConveniencesAndCommittedDeletionRecovers = true;

    // A damaged marker must not leave the owner unable to restore a valid backup.
    await page.evaluate((key) => localStorage.setItem(key, '{'), INTENT);
    await page.reload();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    await chooseBackup();
    await page.evaluate((key) => sessionStorage.setItem('qa.failWrite', key), VAULT);
    await restore();
    await page.waitForFunction((key) => {
      try {
        return JSON.parse(localStorage.getItem(key))?.requiresRestore === true;
      } catch {
        return false;
      }
    }, INTENT);
    await page.reload();
    await page.getByRole('heading', { name: 'Finish journal recovery' }).waitFor();
    assert.equal(await button('Unlock journal').count(), 0);
    await page.evaluate(() => sessionStorage.removeItem('qa.failWrite'));
    await chooseBackup();
    await restore();
    await calendar().waitFor();
    assert.equal(await read(INTENT), null);
    results.confirmedRestoreRepairsDamagedMarker = true;
    results.rejectedMarkerRepairRemainsGatedAcrossReload = true;
    assert.deepEqual(errors, []);
    results.pageErrors = errors;
    fs.writeFileSync(`${output}/journal-recovery-results.json`, JSON.stringify(results, null, 2));
    console.log(results);
  } finally {
    vault.key.fill(0);
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
