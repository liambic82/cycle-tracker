import { requireOptionalNativeModule } from 'expo';
import type { KeyDeriver } from '../domain/keyDerivation';

interface NativeKdf {
  supported: boolean;
  derive(password: number[], salt: number[]): Promise<number[]>;
}
const native = requireOptionalNativeModule<NativeKdf>('CyclePassphraseCrypto');

export const derivePassphraseKey: KeyDeriver = async (password, salt) => {
  if (!native?.supported)
    throw new Error('Install the standalone Trifelle preview to use native encryption.');
  const passwordCopy = Array.from(password);
  const saltCopy = Array.from(salt);
  try {
    const result = await native.derive(passwordCopy, saltCopy);
    try {
      return new Uint8Array(result);
    } finally {
      result.fill(0);
    }
  } finally {
    passwordCopy.fill(0);
    saltCopy.fill(0);
  }
};
