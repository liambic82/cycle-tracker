import { pbkdf2Async } from '@noble/hashes/pbkdf2.js';
import { sha256 } from '@noble/hashes/sha2.js';

export const KDF_ITERATIONS = 600000;
export type KeyDeriver = (password: Uint8Array, salt: Uint8Array) => Promise<Uint8Array>;

export const portableKeyDeriver: KeyDeriver = (password, salt) =>
  pbkdf2Async(sha256, password, salt, { c: KDF_ITERATIONS, dkLen: 32, asyncTick: 20 });

// Only key calculation is timed out. Never race a journal write or allow a late key to open it.
export function boundedKeyDerivation(
  work: () => Promise<Uint8Array>,
  timeoutMs = 30000,
): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      reject(
        new Error(
          'Securing the journal took too long. Please restart the app and try again. Your saved journal has not been replaced.',
        ),
      );
    }, timeoutMs);
    Promise.resolve()
      .then(work)
      .then(
        (key) => {
          if (settled) {
            key.fill(0);
            return;
          }
          settled = true;
          clearTimeout(timer);
          if (key.length !== 32) {
            key.fill(0);
            reject(new Error('The device could not prepare the journal encryption key.'));
          } else resolve(key);
        },
        () => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          // Native errors must not echo inputs or implementation details into the UI.
          reject(
            new Error(
              'The device could not prepare the journal encryption key. Restart the app and try again.',
            ),
          );
        },
      );
  });
}
