import { requireOptionalNativeModule } from 'expo';
import { portableKeyDeriver, type KeyDeriver } from '../domain/keyDerivation';

interface NativeKdf {
  supported: boolean;
  derive(password: number[], salt: number[]): Promise<number[]>;
}
const native = requireOptionalNativeModule<NativeKdf>('CyclePassphraseCrypto');

export const derivePassphraseKey: KeyDeriver = async (password, salt) => {
  if (!native) throw new Error('Install the current standalone preview to use native encryption.');
  // Android 7 lacks PBKDF2WithHmacSHA256. Retain the compatible bounded portable path there.
  if (!native.supported) return portableKeyDeriver(password, salt);
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
