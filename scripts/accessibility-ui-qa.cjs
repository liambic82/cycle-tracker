// Fictional sample data only; checks the production browser, not TalkBack speech.
const { chromium } = require(process.env.TRIFELLE_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve('artifacts/qa/accessibility');
const origin = process.env.TRIFELLE_QA_URL || 'http://127.0.0.1:4177/';

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const results = [];
  try {
    for (const [width, mode] of [
      [320, 'light'],
      [390, 'dark'],
      [1280, 'light'],
    ]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: mode,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      const button = (name) => page.getByRole('button', { name, exact: true });
      const click = async (name) => {
        await button(name).click();
        await page.evaluate(
          () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
        );
      };
      const focus = async (title) => {
        await page.waitForFunction(
          (title) =>
            document.activeElement?.getAttribute('role') === 'heading' &&
            document.activeElement.textContent.includes(title),
          title,
        );
      };
      const inspect = async (name, heading, stress = true) => {
        if (heading) await focus(heading);
        const scope = (await page.getByRole('dialog').count()) ? '[role=dialog]' : '#root';
        const unnamed = await page
          .locator(`${scope} input, ${scope} textarea`)
          .evaluateAll((es) =>
            es
              .filter(
                (e) =>
                  e.getClientRects().length &&
                  !e.closest('[aria-hidden=true], [inert]') &&
                  !e.getAttribute('aria-label') &&
                  !e.labels?.length,
              )
              .map((e) => e.outerHTML.slice(0, 120)),
          );
        assert.deepEqual(unnamed, [], name + ': unnamed fields');
        if (width === 320 && stress) {
          await page.evaluate((scope) => {
            window.a11ySizes = [];
            for (const e of document.querySelectorAll(`${scope} *`)) {
              if (!e.getClientRects().length || e.closest('[inert], [aria-hidden=true]')) continue;
              if (
                [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim()) ||
                ['INPUT', 'TEXTAREA'].includes(e.tagName)
              ) {
                window.a11ySizes.push([e, e.style.fontSize, e.style.lineHeight]);
                const cs = getComputedStyle(e);
                const size = parseFloat(cs.fontSize),
                  height = parseFloat(cs.lineHeight);
                e.style.fontSize = size * 2 + 'px';
                if (Number.isFinite(height)) e.style.lineHeight = height * 2 + 'px';
              }
            }
          }, scope);
          const overflow = await page.locator(`${scope} *`).evaluateAll((es) =>
            es
              .filter((e) => {
                if (!e.textContent?.trim() || e.closest('[inert], [aria-hidden=true]'))
                  return false;
                const r = e.getBoundingClientRect();
                if (!r.width || !r.height || (r.left >= -1 && r.right <= innerWidth + 1))
                  return false;
                for (let n = e.parentElement; n; n = n.parentElement) {
                  const s = getComputedStyle(n);
                  if (['auto', 'scroll'].includes(s.overflowX) && n.scrollWidth > n.clientWidth + 1)
                    return false;
                }
                return true;
              })
              .map((e) => e.textContent.slice(0, 80))
              .slice(-8),
          );
          assert.deepEqual(overflow, [], name + ': enlarged text overflow');
        }
        if (width === 320 || name === 'appearance')
          await page.screenshot({ path: path.join(output, `${name}-${width}.png`) });
        if (width === 320 && stress)
          await page.evaluate(() => {
            for (const [e, s, l] of window.a11ySizes) {
              e.style.fontSize = s;
              e.style.lineHeight = l;
            }
            window.a11ySizes = [];
          });
        results.push({
          width,
          mode,
          screen: name,
          namedFields: 'pass',
          focus: heading ? 'pass' : 'not changed',
          textStress: width === 320 && stress ? 'pass' : 'not run',
        });
      };
      await page.goto(origin);
      await click('Explore with sample data');
      await page.getByRole('button', { name: /, today,/ }).click();
      await page.getByRole('dialog', { name: /Daily journal for/ }).waitFor();
      const dailyTitle = await page.getByRole('heading').first().textContent();
      await inspect('daily', null);
      const observations = button('Daily observations');
      assert.ok(await observations.getAttribute('aria-describedby'));
      await observations.focus();
      await observations.press('Enter');
      await inspect('observations', 'Daily observations');
      const pain = page.getByRole('textbox', {
        name: 'Pain locations · separate with commas',
        exact: true,
      });
      await pain.fill('Fictional keyboard check');
      assert.equal(
        await pain.evaluate((e) => e === document.activeElement),
        true,
        'typing lost focus',
      );
      await click('Cancel observation changes');
      await focus(dailyTitle);
      await click('Sleep');
      await inspect('sleep', 'Sleep details');
      await click('Cancel sleep changes');
      await click('Sexual health');
      await inspect('sexual-health', 'Sexual health');
      await click('Back to daily journal');
      await click('Flow');
      await click('Products & bleeding details');
      await inspect('flow-details', 'Flow details');
      await click('Add product record');
      await inspect('product-form', 'Add product record');
      await click('Cancel record changes');
      await click('Back to daily journal');
      await click('Medications & supplements');
      await inspect('dose-log', 'Medications & supplements');
      await click('Dose record 1 options');
      await click('Edit dose record');
      await inspect('dose-form', 'Edit dose record');
      await click('Cancel dose changes');
      await click('Back to daily journal');
      await click('Rate symptoms · optional');
      await inspect('severity', 'Symptom severity');
      await click('Back to daily journal');
      await click('All symptoms');
      await inspect('symptoms', 'Find symptoms');
      await click('Back to daily journal');
      await click('Journal settings');
      await inspect('journal-settings', 'Journal settings');
      await click('Section order');
      await inspect('section-order', 'Daily section order');
      await click('Done');
      await click('Pinned symptoms');
      await inspect('pins', 'Pinned symptoms');
      await click('Back to journal settings');
      await click('Back to journal');
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press(i % 2 ? 'Tab' : 'Shift+Tab');
        assert.equal(
          await page.evaluate(() => !!document.activeElement.closest('[role=dialog]')),
          true,
          'modal focus escaped',
        );
      }
      await click('Close daily journal');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      await page.getByRole('tab', { name: 'Medications', exact: true }).click();
      await click('Add medication or supplement');
      await inspect('schedule', 'Add to your routine');
      await click('Cancel schedule changes');
      await focus('Your routine');
      await click('Manage care reminders');
      await click('Add care reminder');
      await inspect('care-reminder', 'Journal & care reminders');
      await click('Cancel care reminder changes');
      await page.getByRole('tab', { name: 'Your data', exact: true }).click();
      await inspect('data', 'Earlier records', false);
      await click('Customize appearance');
      await inspect('appearance', 'Make it feel like you.');
      await click('Back to your data');
      await focus('Earlier records');
      await click('Import CSV');
      await inspect('csv', 'Import CSV');
      await click('Back to Your data');
      await click('Open medical records');
      await inspect('medical-records', 'Medical records & doctor visits');
      await click('Add bloodwork / lab result');
      await inspect('medical-form', 'Medical record');
      await click('Cancel medical record changes');
      await click('Back to Your data');
      await click('Create doctor summary');
      await inspect('report-options', 'A clearer picture');
      await click('Preview doctor summary');
      await inspect('report-preview', 'Review your doctor summary');
      await click('Back to Your data');
      await click('Import wearable sleep');
      await inspect('wearable-sleep', 'Wearable sleep');
      await click('Back to Your data');
      await click('Privacy & support');
      await page.getByRole('dialog', { name: 'Privacy & support', exact: true }).waitFor();
      await inspect('privacy', null);
      await page.keyboard.press('Escape');
      await page.getByRole('dialog').waitFor({ state: 'hidden' });
      assert.deepEqual(errors, []);
      await context.close();
    }
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    console.log(
      JSON.stringify({
        screens: results.length,
        pageErrors: 0,
        resultsFile: path.join(output, 'results.json'),
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
