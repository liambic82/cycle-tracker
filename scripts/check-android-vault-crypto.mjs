// Compare the exact Android Java helper with Node/OpenSSL and the portable vault.
import assert from 'node:assert/strict';
import { createCipheriv, createHash, randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { sealSerializedJournal } from '../src/domain/vault.ts';

const jdk = process.env.JAVA_HOME || 'C:/Program Files/Java/jdk-22';
const output = 'artifacts/qa/native-crypto';
mkdirSync(output, { recursive: true });
const run = (command, args, input) => {
  const result = spawnSync(join(jdk, 'bin', command), args, {
    input,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr + result.stdout);
  return result.stdout;
};
run('javac', [
  '-d',
  output,
  'modules/cycle-crypto/android/src/main/java/com/liambic/cyclecrypto/VaultCrypto.java',
  'tests/native/VaultCryptoCheck.java',
]);
const vectors = [
  '',
  'Fictional journal',
  'Café 🌷 中文\r\n',
  '\ud800X\udfff',
  JSON.stringify({ note: '🌸\ud800' }),
  'Fictional '.repeat(400000),
];
const lines = vectors.map((plain) => {
  const key = randomBytes(32),
    nonce = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, nonce);
  cipher.setAAD(Buffer.from('cycle-tracker:vault:1'));
  const encrypted = Buffer.concat([
    cipher.update(plain, 'utf8'),
    cipher.final(),
    cipher.getAuthTag(),
  ]).toString('hex');
  const portable = JSON.parse(
    sealSerializedJournal(plain, { key, salt: '00'.repeat(16) }, () => nonce),
  );
  assert.equal(portable.ciphertext, encrypted);
  const utf16 = plain
    .split('')
    .map((c) => c.charCodeAt(0).toString(16).padStart(4, '0'))
    .join('');
  return [
    utf16,
    key.toString('hex'),
    nonce.toString('hex'),
    encrypted,
    createHash('sha256').update(plain).digest('hex'),
    Buffer.byteLength(plain),
  ].join(':');
});
console.log(run('java', ['-cp', output, 'VaultCryptoCheck'], lines.join('\n')));
