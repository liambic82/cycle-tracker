// Review-only marketing captures from an isolated production web app.
// All records come from the fictional built-in demo, never a tester profile.
const { chromium } = require(process.env.TRIFELLE_PLAYWRIGHT_MODULE || 'playwright');
const { randomBytes, createHash } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const output = path.resolve('docs/design/play-store-2026-10-31/captures');
const origin = process.env.TRIFELLE_QA_URL || 'http://127.0.0.1:4174/';

(async () => {
  assert.equal(
    JSON.parse(fs.readFileSync('package.json', 'utf8')).version,
    '0.27.0',
    'This dated proposal script must be reviewed before capturing another app version.',
  );
  fs.mkdirSync(output, { recursive: true });
  const { demoJournal } = await import('../src/data/demo.ts');
  const { newKey, seal } = await import('../src/domain/vault.ts');
  const key = await newKey('Fictional store proposal', randomBytes);
  const journal = demoJournal('2026-10-31');
  journal.preferences.pinnedSymptoms = ['Cramps', 'Fatigue', 'Bloating'];
  const vault = seal(journal, key, randomBytes);
  key.key.fill(0);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const captures = [];
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 700 },
      deviceScaleFactor: 3,
      colorScheme: 'light',
      timezoneId: 'America/New_York',
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.clock.setFixedTime(new Date('2026-10-31T12:00:00-04:00'));
    const button = (name) => page.getByRole('button', { name, exact: true });
    const tab = (name) => page.getByRole('tab', { name, exact: true });
    // Scroll the real interface to a complete section; never restyle or erase UI.
    const frameSection = async (locator, offset = 16) =>
      locator.evaluate((element, offset) => {
        let parent = element.parentElement;
        while (parent) {
          if (
            parent.scrollHeight > parent.clientHeight &&
            /auto|scroll/.test(getComputedStyle(parent).overflowY)
          ) {
            parent.scrollTop +=
              element.getBoundingClientRect().top - parent.getBoundingClientRect().top - offset;
            return;
          }
          parent = parent.parentElement;
        }
        throw new Error('No scroll container for the proposal section');
      }, offset);
    const capture = async (name) => {
      await page.evaluate(async () => {
        await document.fonts.ready;
        await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      });
      const filename = name + '.png';
      await page.screenshot({ path: path.join(output, filename), animations: 'disabled' });
      captures.push({
        file: filename,
        sha256: createHash('sha256')
          .update(fs.readFileSync(path.join(output, filename)))
          .digest('hex'),
      });
    };
    await page.goto(origin);
    await button('Create my journal').waitFor();
    await page.evaluate(
      (value) => localStorage.setItem('cycle-tracker.encrypted-vault.v1', value),
      vault,
    );
    await page.reload();
    await page
      .getByRole('textbox', { name: 'Passphrase', exact: true })
      .fill('Fictional store proposal');
    await button('Unlock journal').click();
    await tab('Calendar').waitFor();
    await frameSection(page.getByText('Your calendar', { exact: true }));
    await capture('01-calendar');

    await button('Add period').click();
    await button('Start Oct 21, 2026').click();
    await button('Finish Oct 25, 2026').click();
    // The selected range remains an unsaved form; no invented confirmation.
    await frameSection(page.getByText('Saved on this device', { exact: true }));
    await capture('02-period');
    await button('Back to calendar').click();

    await page.getByRole('button', { name: /^October 31, 2026/ }).click();
    await page.getByRole('dialog').waitFor();
    await capture('03-daily');
    await page.getByRole('button', { name: /Close daily journal/ }).click();

    await tab('Your history').click();
    await page.getByText('Cycle length', { exact: true }).waitFor();
    await capture('04-history');

    await tab('Your data').click();
    await button('Customize appearance').click();
    await frameSection(page.getByText('Color palette', { exact: true }));
    await capture('05-appearance');
    await button('Back to your data').click();

    await frameSection(page.getByText('Keep a copy', { exact: true }));
    await capture('06-backup');
    assert.deepEqual(errors, []);
    const metadata = {
      purpose:
        'Design approval only; replace with verified Android captures before store submission.',
      applicationVersion: '0.27.0',
      date: '2026-10-31',
      source: 'Production mobile web bundle, Windows Chrome, fresh non-persistent browser context.',
      data: 'Built-in fictional demo journal with three pinned symptoms; no tester records.',
      viewport: { width: 390, height: 700, scale: 3 },
      productionIndexSha256: createHash('sha256')
        .update(fs.readFileSync('dist/index.html'))
        .digest('hex'),
      captures,
      pageErrors: errors,
    };
    fs.writeFileSync(
      path.join(output, 'provenance.json'),
      JSON.stringify(metadata, null, 2) + '\n',
    );
    console.log(JSON.stringify({ captures: captures.length, pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
