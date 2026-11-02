// Production-browser navigation checks in a fresh sample-data session.
const { chromium } = require(process.env.TRIFELLE_PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin = process.env.TRIFELLE_QA_URL || 'http://127.0.0.1:4177/';
const output = path.resolve('artifacts/qa/navigation-layout');
const labels = ['Calendar', 'Your history', 'Medications', 'Your data'];

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [];
  const results = [];
  try {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 } });
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(origin);
    await page.getByRole('button', { name: 'Explore with sample data', exact: true }).click();
    await page.getByRole('tab', { name: 'Calendar', exact: true }).waitFor();
    for (const width of [320, 360, 432, 800, 1280, 280, 432]) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate(
        () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
      );
      const boxes = [];
      for (const label of labels) {
        const tab = page.getByRole('tab', { name: label, exact: true });
        // Keyboard activation verifies the same routes as a tap, including selected semantics.
        await tab.focus();
        await tab.press('Enter');
        await page.waitForFunction(
          (label) =>
            [...document.querySelectorAll('[role=tab]')]
              .find((e) => e.getAttribute('aria-label') === label)
              ?.getAttribute('aria-selected') === 'true',
          label,
        );
        assert.equal(await page.locator('[role=tab][aria-selected=true]').count(), 1);
        const target =
          label === 'Calendar'
            ? page.getByText('Your calendar', { exact: true })
            : page.getByRole('heading', { name: label, exact: true });
        await target.waitFor();
        const box = await tab.boundingBox();
        assert.ok(box && box.width >= 48 && box.height >= 48, label + ': touch target');
        assert.ok(
          box.x >= -1 && box.x + box.width <= width + 1 && box.y + box.height <= 901,
          label + ': offscreen tab',
        );
        const text = await tab.getByText(label, { exact: true }).evaluate((element) => {
          const range = document.createRange();
          range.selectNodeContents(element);
          return [...range.getClientRects()].map((r) => ({
            x: r.x,
            y: r.y,
            width: r.width,
            height: r.height,
          }));
        });
        assert.equal(text.length, 1, label + ': label split across lines');
        assert.ok(
          text[0].x >= box.x && text[0].x + text[0].width <= box.x + box.width + 1,
          label + ': label overflow',
        );
        boxes.push(box);
      }
      const rows = new Set(boxes.map((b) => Math.round(b.y))).size;
      assert.equal(rows, width >= 900 ? 4 : width < 320 ? 2 : 1);
      await page.getByRole('tab', { name: 'Calendar', exact: true }).click();
      await page.screenshot({ path: path.join(output, `calendar-${width}.png`) });
      results.push({
        width,
        rows,
        routes: 4,
        keyboard: 'pass',
        fullLabels: 'pass',
        touchTargets: 'pass',
      });
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(output, 'browser-results.json'),
      JSON.stringify({ results, pageErrors: errors }, null, 2) + '\n',
    );
    console.log(JSON.stringify({ results, pageErrors: errors }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
