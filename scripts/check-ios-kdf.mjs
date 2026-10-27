import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

if (process.platform !== 'darwin')
  throw new Error('The native CommonCrypto check requires macOS and Xcode command-line tools.');
const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'artifacts', 'ios-kdf-check');
await mkdir(out, { recursive: true });
const binary = path.join(out, 'PassphraseKdfCheck');
const compile = spawnSync(
  'xcrun',
  [
    'swiftc',
    path.join(root, 'modules/cycle-crypto/ios/PassphraseKdf.swift'),
    path.join(root, 'tests/native/PassphraseKdfCheck.swift'),
    '-o',
    binary,
  ],
  { encoding: 'utf8' },
);
if (compile.status !== 0) throw new Error(compile.stderr || String(compile.error));
const vectors = JSON.parse(
  await readFile(path.join(root, 'tests/fixtures/kdf-vectors.json'), 'utf8'),
);
const check = spawnSync(binary, [], {
  encoding: 'utf8',
  input: vectors.map((v) => `${v.passwordHex}:${v.saltHex}:${v.expectedHex}`).join('\n'),
});
if (check.status !== 0) throw new Error(check.stderr || String(check.error));
process.stdout.write(check.stdout);
