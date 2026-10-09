import { readFile, mkdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = path.join(root, 'artifacts', 'kdf-check');
await mkdir(out, { recursive: true });
const jdk = process.env.JAVA_HOME;
if (!jdk) throw new Error('Set JAVA_HOME to the installed JDK before running this check.');
const executable = (name) =>
  path.join(jdk, 'bin', `${name}${process.platform === 'win32' ? '.exe' : ''}`);
const compile = spawnSync(
  executable('javac'),
  [
    '-d',
    out,
    path.join(
      root,
      'modules/cycle-crypto/android/src/main/java/com/liambic/cyclecrypto/PassphraseKdf.java',
    ),
    path.join(root, 'tests/native/PassphraseKdfCheck.java'),
  ],
  { encoding: 'utf8' },
);
if (compile.status !== 0) throw new Error(compile.stderr || String(compile.error));
const vectors = JSON.parse(
  await readFile(path.join(root, 'tests/fixtures/kdf-vectors.json'), 'utf8'),
);
const check = spawnSync(executable('java'), ['-cp', out, 'PassphraseKdfCheck'], {
  encoding: 'utf8',
  input: vectors.map((v) => `${v.passwordHex}:${v.saltHex}:${v.expectedHex}`).join('\n'),
});
if (check.status !== 0) throw new Error(check.stderr || String(check.error));
process.stdout.write(check.stdout);
