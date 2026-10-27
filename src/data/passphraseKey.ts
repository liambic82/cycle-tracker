// Fallback for other platforms; Android, iOS and web use their own adapters.
export { portableKeyDeriver as derivePassphraseKey } from '../domain/keyDerivation';
