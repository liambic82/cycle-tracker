import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = path.resolve('dist');
const indexPath = path.join(root, 'index.html');
let html = await readFile(indexPath, 'utf8');
html = html.replace(
  '</head>',
  '<link rel="manifest" href="/manifest.webmanifest"/><link rel="icon" href="/icon.svg" type="image/svg+xml"/><meta name="theme-color" content="#56394B"/></head>',
);
await writeFile(indexPath, html);
const assets = (await readdir(root, { recursive: true }))
  .filter(
    (file) => /\.(html|js|css|svg|png|webp|woff2?|webmanifest)$/.test(file) && file !== 'sw.js',
  )
  .map((file) => '/' + file.split(path.sep).join('/'));
const version = createHash('sha256')
  .update(html + assets.join('\n'))
  .digest('hex')
  .slice(0, 16);
const worker = `// Generated at build time. Cache only the application shell, never health data.
const CACHE = 'cycle-app-${version}';
const ASSETS = ${JSON.stringify(assets)};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('cycle-app-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(() => caches.match('/index.html')));
  } else if (ASSETS.includes(url.pathname)) {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
  }
});
`;
await writeFile(path.join(root, 'sw.js'), worker);
console.log(`Prepared offline web shell: ${assets.length} assets, version ${version}`);
