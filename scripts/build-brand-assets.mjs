import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { TRIFELLE_COLORS as colors, TRIFELLE_LEAF, TRIFELLE_STEM } from '../src/brand/trifelle.ts';

const directory = new URL('../assets/brand/', import.meta.url);
await mkdir(directory, { recursive: true });
const mark = (base, accent = base) =>
  `<path d="${TRIFELLE_STEM}" fill="${base}"/>${[0, 1, 2, 3].map((leaf) => `<path d="${TRIFELLE_LEAF}" transform="rotate(${leaf * 90} 128 120)" fill="${leaf === 0 ? accent : base}"/>`).join('')}`;
const svg = (size, content) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${content}</svg>`;
const icon = svg(
  1024,
  `<rect width="1024" height="1024" fill="${colors.plum}"/><g transform="translate(90 63) scale(3.3)">${mark(colors.ivory, colors.rose)}</g>`,
);
const foreground = svg(
  1024,
  `<g transform="translate(192 172) scale(2.5)">${mark(colors.ivory, colors.rose)}</g>`,
);
const monochrome = svg(1024, `<g transform="translate(192 172) scale(2.5)">${mark('#ffffff')}</g>`);
for (const [name, source] of Object.entries({
  icon,
  'adaptive-foreground': foreground,
  monochrome,
  'splash-light': svg(
    512,
    `<g transform="translate(64 52) scale(1.5)">${mark(colors.plum, colors.roseOnLight)}</g>`,
  ),
  'splash-dark': svg(
    512,
    `<g transform="translate(64 52) scale(1.5)">${mark(colors.ivory, colors.rose)}</g>`,
  ),
})) {
  await writeFile(new URL(`${name}.svg`, directory), source + '\n');
  await sharp(Buffer.from(source))
    .png()
    .toFile(fileURLToPath(new URL(`${name}.png`, directory)));
}
// The system applies icon masks; opaque exports do not bake in rounded corners.
for (const size of [192, 512])
  await sharp(Buffer.from(icon)).resize(size).png().toFile(`public/icon-${size}.png`);
await sharp(Buffer.from(icon)).resize(180).png().toFile('public/apple-touch-icon.png');
await sharp(Buffer.from(icon)).resize(48).png().toFile('public/favicon.png');
await sharp(Buffer.from(monochrome)).resize(96).png().toFile('assets/brand/notification.png');
await writeFile('public/icon.svg', icon + '\n');
console.log('Exported Trifelle icons, adaptive/monochrome layers and light/dark launch marks.');
