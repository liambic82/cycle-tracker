import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { getRandomValues } from 'expo-crypto';
import { BiometricVault } from './biometricVault';

const KEY = 'cycle-tracker.biometric-key.v1';
// This service is used exclusively for authenticated credentials. Never add an unguarded copy.
const options: SecureStore.SecureStoreOptions = {
  keychainService: 'cycle-tracker.biometric.v1',
  requireAuthentication: true,
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  authenticationPrompt: 'Unlock your Cycle journal',
};

export const biometrics = new BiometricVault(
  AsyncStorage,
  {
    available: () => {
      try {
        return SecureStore.canUseBiometricAuthentication();
      } catch {
        return false;
      }
    },
    read: () => SecureStore.getItemAsync(KEY, options),
    write: (value) =>
      SecureStore.setItemAsync(KEY, value, {
        ...options,
        authenticationPrompt: 'Enable biometric unlock for Cycle',
      }),
    remove: () => SecureStore.deleteItemAsync(KEY, options),
  },
  (length) => getRandomValues(new Uint8Array(length)),
);
