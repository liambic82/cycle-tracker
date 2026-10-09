import { KDF_ITERATIONS, type KeyDeriver } from '../domain/keyDerivation.ts';

export const derivePassphraseKey: KeyDeriver = async (password, salt) => {
  const material = await crypto.subtle.importKey('raw', new Uint8Array(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: new Uint8Array(salt), iterations: KDF_ITERATIONS },
    material,
    256,
  );
  return new Uint8Array(bits);
};
