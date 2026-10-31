// Code-authored review compositions; no changes to application UI or store listing.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { format, resolveConfig } from 'prettier';
import { TRIFELLE_LEAF, TRIFELLE_STEM } from '../src/brand/trifelle.ts';
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.TRIFELLE_PLAYWRIGHT_MODULE || 'playwright');
const root = new URL('../docs/design/play-store-2026-10-31/', import.meta.url);
await mkdir(root, { recursive: true });
const font = await readFile(new URL('../assets/fonts/NotoSans-Regular.ttf', import.meta.url));
const bold = await readFile(new URL('../assets/fonts/NotoSans-Bold.ttf', import.meta.url));
const escape = (text) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const mark = (base, accent) =>
  `<svg viewBox="20 25 220 225" aria-hidden="true"><path d="${TRIFELLE_STEM}" fill="${base}"/>${[0, 90, 180, 270].map((angle, index) => `<path d="${TRIFELLE_LEAF}" transform="rotate(${angle} 128 120)" fill="${index === 0 ? accent : base}"/>`).join('')}</svg>`;
const leaf = (fill, style) =>
  `<svg class="petal" viewBox="120 38 106 85" style="${style}" aria-hidden="true"><path d="${TRIFELLE_LEAF}" fill="${fill}"/></svg>`;
const schemes = [
  {
    id: 'clover-cream',
    name: 'Clover & cream',
    label: 'A',
    description: 'Ivory, soft sage and the existing plum mark. Recommended.',
    background: '#F7F4EA',
    ink: '#50394A',
    accent: '#D8E3D3',
    leaf: '#7D967D',
    feature: '#F1F0E4',
    featureInk: '#50394A',
  },
  {
    id: 'plum-petal',
    name: 'Plum & petal',
    label: 'B',
    description: 'Rose backgrounds and a deeper plum feature graphic.',
    background: '#F3E4E9',
    ink: '#503447',
    accent: '#E4BACB',
    leaf: '#B97994',
    feature: '#604054',
    featureInk: '#FBF7F5',
  },
];
const screens = [
  {
    id: '01-calendar',
    title: ['Your cycle,', 'clearly recorded.'],
    subtitle: 'Calendar, flow and daily notes.',
    alt: 'Trifelle calendar showing fictional period days in October, with month navigation and daily journal access.',
  },
  {
    id: '02-period',
    title: ['Log a period', 'in one go.'],
    subtitle: 'Start and finish. Details can wait.',
    alt: 'Add a period with October 21 and 25 selected as its start and finish, with optional flow details and Save period.',
  },
  {
    id: '03-daily',
    title: ['Space for how', 'you feel.'],
    subtitle: 'Keep symptoms and observations together.',
    alt: 'Daily journal with a fictional bloating rating, pinned symptoms, daily observations, medication and sleep sections.',
  },
  {
    id: '04-history',
    title: ['See your', 'recorded patterns.'],
    subtitle: 'Review cycle lengths over time.',
    alt: 'History chart of fictional recorded cycle lengths, with average, shortest and longest intervals in days.',
  },
  {
    id: '05-appearance',
    title: ['A little more', 'you.'],
    subtitle: 'Choose colors that feel like yours.',
    alt: 'Appearance settings showing the included color palettes, with Plum selected.',
  },
  {
    id: '06-backup',
    title: ['Keep a copy.', 'Keep control.'],
    subtitle: 'Export your journal as an encrypted backup.',
    alt: 'Keep a copy settings with encrypted backup export and the reminder to retain the backup passphrase.',
  },
];
const captures = {};
for (const screen of screens)
  captures[screen.id] =
    'data:image/png;base64,' +
    (await readFile(new URL(`captures/${screen.id}.png`, root))).toString('base64');
const css = `@font-face{font-family:Noto;src:url(data:font/ttf;base64,${font.toString('base64')})}@font-face{font-family:Noto;src:url(data:font/ttf;base64,${bold.toString('base64')});font-weight:700}*{box-sizing:border-box}body{margin:0;font-family:Noto,Arial,sans-serif}.art{position:relative;overflow:hidden}.petal{position:absolute;pointer-events:none}.brand{position:absolute;display:flex;align-items:center;gap:14px;font:40px Georgia,serif}.brand svg{height:49px;width:49px}.screen{position:absolute;width:840px;height:auto;left:120px;top:368px;border-radius:22px;box-shadow:0 18px 48px #50394a1a;display:block}.heading{position:absolute;left:76px;top:130px;font-size:68px;font-weight:700;line-height:1.08;letter-spacing:-2.1px;margin:0}.sub{position:absolute;left:80px;top:293px;font-size:31px;line-height:1.3;margin:0;max-width:930px}.wordmark{font-family:Georgia,serif}.feature-title{position:absolute;top:175px;left:84px;font-family:Georgia,serif;font-size:65px;line-height:1.05;letter-spacing:-1.5px;margin:0}.feature-sub{position:absolute;left:88px;top:342px;font-size:22px;margin:0}.calendar-window{position:absolute;left:658px;top:78px;width:276px;height:350px;overflow:hidden;border-radius:16px;box-shadow:0 12px 28px #261f2826}.calendar-window img{width:100%;display:block;margin-top:-51px}.feature .brand{left:82px;top:81px;font-size:31px}.feature .brand svg{width:35px;height:35px}`;
const document = (html) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${css}</style></head><body>${html}</body></html>`;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const files = [];
try {
  const page = await browser.newPage({
    viewport: { width: 1080, height: 1920 },
    deviceScaleFactor: 1,
  });
  page.on('pageerror', (error) => {
    throw error;
  });
  const render = async (filename, width, height, content, alt) => {
    await page.setViewportSize({ width, height });
    await page.setContent(document(content));
    await page.evaluate(async () => {
      await document.fonts.ready;
      await Promise.all([...document.images].map((img) => img.decode()));
    });
    const output = await page.screenshot();
    await sharp(output)
      .removeAlpha()
      .png()
      .toFile(fileURLToPath(new URL(filename, root)));
    const metadata = await sharp(fileURLToPath(new URL(filename, root))).metadata();
    if (metadata.width !== width || metadata.height !== height || metadata.hasAlpha)
      throw new Error('Invalid asset dimensions/alpha: ' + filename);
    if (alt.length > 140) throw new Error('Alt text too long: ' + filename);
    files.push({ file: filename, width, height, alpha: false, alt });
  };
  for (const scheme of schemes) {
    const { id, background, ink, accent } = scheme;
    const decoration =
      leaf(
        scheme.leaf,
        'width:510px;height:410px;left:-255px;top:1330px;opacity:.19;transform:rotate(-30deg)',
      ) +
      leaf(
        accent,
        'width:540px;height:430px;right:-300px;top:15px;transform:rotate(95deg);opacity:.55',
      );
    await render(
      `${id}-feature.png`,
      1024,
      500,
      `<main class="art feature" style="width:1024px;height:500px;background:${scheme.feature};color:${scheme.featureInk}">${leaf(accent, 'width:500px;height:400px;right:-210px;top:-125px;opacity:.48;transform:rotate(95deg)')}${leaf(scheme.leaf, 'width:300px;height:260px;left:-180px;bottom:-130px;opacity:.27;transform:rotate(-20deg)')}<div class="brand">${mark(scheme.featureInk, id === 'plum-petal' ? '#E4BACB' : '#C47D9E')}<span>Trifelle</span></div><h1 class="feature-title">Your cycle.<br>Your space.</h1><p class="feature-sub">A period &amp; wellbeing journal</p><div class="calendar-window"><img src="${captures['01-calendar']}" alt="Fictional calendar excerpt"></div></main>`,
      `Trifelle: Your cycle. Your space. A period and wellbeing journal, with a fictional calendar excerpt. ${scheme.name}.`,
    );
    for (const screen of screens)
      await render(
        `${id}-${screen.id}.png`,
        1080,
        1920,
        `<main class="art" style="width:1080px;height:1920px;background:${background};color:${ink}">${decoration}<div class="brand" style="left:74px;top:56px">${mark(ink, '#C47D9E')}<span>Trifelle</span></div><h1 class="heading">${screen.title.map(escape).join('<br>')}</h1><p class="sub">${escape(screen.subtitle)}</p><img class="screen" src="${captures[screen.id]}" alt="${escape(screen.alt)}"></main>`,
        screen.alt,
      );
  }
} finally {
  await browser.close();
}

// Review boards are previews of the exported assets, never additional store uploads.
for (const scheme of schemes) {
  const canvas = sharp({
    create: { width: 1200, height: 1620, channels: 3, background: '#FBF7F5' },
  });
  const overlays = [
    {
      input: await sharp(fileURLToPath(new URL(`${scheme.id}-feature.png`, root)))
        .resize(1120, 547)
        .toBuffer(),
      left: 40,
      top: 82,
    },
  ];
  for (const [index, id] of ['01-calendar', '02-period'].entries())
    overlays.push({
      input: await sharp(fileURLToPath(new URL(`${scheme.id}-${id}.png`, root)))
        .resize(550, 978)
        .toBuffer(),
      left: 40 + index * 570,
      top: 650,
    });
  overlays.push({
    input: Buffer.from(
      `<svg width="1200" height="75"><text x="42" y="48" font-family="Arial" font-size="29" fill="#50394A">${scheme.label} · ${escape(scheme.name)} · design proposal</text></svg>`,
    ),
    left: 0,
    top: 0,
  });
  // Leave full screenshot bottoms intact.
  await canvas
    .resize(1200, 1660)
    .composite(overlays)
    .png()
    .toFile(fileURLToPath(new URL(`${scheme.id}-board.png`, root)));
}
const grid = [];
for (const [index, screen] of screens.entries())
  grid.push({
    input: await sharp(fileURLToPath(new URL(`clover-cream-${screen.id}.png`, root)))
      .resize(540, 960)
      .toBuffer(),
    left: 24 + (index % 3) * 564,
    top: 70 + Math.floor(index / 3) * 984,
  });
grid.push({
  input: Buffer.from(
    '<svg width="1716" height="60"><text x="24" y="40" font-family="Arial" font-size="26" fill="#50394A">Clover &amp; cream · proposed six-screen sequence · fictional records</text></svg>',
  ),
  left: 0,
  top: 0,
});
await sharp({ create: { width: 1716, height: 2038, channels: 3, background: '#FBF7F5' } })
  .composite(grid)
  .png()
  .toFile(fileURLToPath(new URL('clover-cream-sequence.png', root)));

const gallery = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Trifelle · Play design proposals</title><style>*{box-sizing:border-box}body{margin:0;background:#FBF7F5;color:#50394A;font-family:system-ui,sans-serif}main{max-width:1180px;margin:auto;padding:32px 20px}h1{font:38px Georgia,serif;margin:12px 0}p{line-height:1.55;max-width:850px}.toolbar{display:flex;flex-wrap:wrap;gap:12px;margin:24px 0}button{padding:14px 20px;font:inherit;border:1px solid #604054;border-radius:8px;color:#604054;background:transparent;cursor:pointer}button[aria-selected=true]{background:#604054;color:#FBF7F5}:focus-visible{outline:3px solid #38634C;outline-offset:3px}.feature{display:block;width:100%;max-width:1024px;margin:24px auto}section[hidden]{display:none}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}figure{margin:0}figure img{width:100%;display:block}figcaption{font-size:15px;padding:12px 0 24px}a{color:inherit}.kicker{font-size:13px;letter-spacing:.1em;text-transform:uppercase}.note{border-top:1px solid #DBCFD4;padding-top:18px}@media(max-width:760px){.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:480px){.grid{grid-template-columns:1fr}h1{font-size:31px}}</style></head><body><main><div class="kicker">Plowden Digital · review only</div><h1>Trifelle, on the shelf.</h1><p>Two visual directions using the approved clover identity. Screens are real captures of the 0.27.0 mobile browser interface with fictional records. Final store uploads require approval and verified Android captures.</p><div class="toolbar" role="tablist" aria-label="Design direction">${schemes.map((s, i) => `<button id="tab-${s.id}" type="button" role="tab" aria-selected="${i === 0}" aria-controls="${s.id}" data-target="${s.id}">${s.label} · ${escape(s.name)}${i === 0 ? ' (recommended)' : ''}</button>`).join('')}</div>${schemes.map((s, i) => `<section id="${s.id}" role="tabpanel" aria-labelledby="tab-${s.id}" ${i ? 'hidden' : ''}><h2>${escape(s.name)}</h2><p>${escape(s.description)}</p><a href="${s.id}-feature.png"><img class="feature" src="${s.id}-feature.png" alt="${escape(files.find((f) => f.file === s.id + '-feature.png').alt)}"></a><div class="grid">${screens.map((screen, j) => `<figure><a href="${s.id}-${screen.id}.png"><img loading="lazy" src="${s.id}-${screen.id}.png" alt="${escape(screen.alt)}"></a><figcaption>${j + 1}. ${escape(screen.title.join(' '))}</figcaption></figure>`).join('')}</div></section>`).join('')}<p class="note">Approval covers the color treatment, feature-graphic composition, captions and screen sequence. It does not change the app’s themes or authorize publication. Sleep permissions, biometric prompts and reminder delivery will use native Android evidence.</p><p><a href="https://support.google.com/googleplay/android-developer/answer/9866151?hl=en">Google Play preview-asset guidance</a> · 1024 × 500 feature graphic · 1080 × 1920 portraits.</p></main><script>const tabs=[...document.querySelectorAll('[role=tab]')];function select(t){for(const tab of tabs){const active=tab===t;tab.setAttribute('aria-selected',String(active));document.getElementById(tab.dataset.target).hidden=!active;}}for(const tab of tabs){tab.addEventListener('click',()=>select(tab));tab.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();const next=tabs[(tabs.indexOf(tab)+(e.key==='ArrowRight'?1:tabs.length-1))%tabs.length];select(next);next.focus();}});}</script></body></html>`;
const formatting = await resolveConfig(fileURLToPath(new URL('index.html', root)));
await writeFile(
  new URL('index.html', root),
  await format(gallery, { ...formatting, parser: 'html' }),
);
await writeFile(
  new URL('assets.json', root),
  await format(
    JSON.stringify({ status: 'proposed; not approved or uploaded', schemes, screens, files }),
    { ...formatting, parser: 'json' },
  ),
);
console.log(
  `Rendered ${files.length} RGB proposal assets, two review boards and a six-screen sequence.`,
);
