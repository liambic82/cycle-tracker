// Browser passphrase behavior is unchanged; native credentials never enter browser storage.
export const biometrics = {
  available: () => false,
  enabled: async (_salt: string | null) => false,
  clear: async () => {},
  enable: async (_vault: import('../domain/vault').VaultKey): Promise<void> => {
    throw new Error('Biometric unlock is available in the installed mobile app.');
  },
  unlock: async (
    _raw: string,
  ): Promise<{
    journal: import('../domain/journal').Journal;
    vault: import('../domain/vault').VaultKey;
  }> => {
    throw new Error('Use your passphrase to unlock in a browser.');
  },
};
