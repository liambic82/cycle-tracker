import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY } from './repository';

// Web and iOS retain their existing backend. Android selects .android.ts.
export const journalStorage = AsyncStorage;
export const replaceJournal = (encrypted: string) => journalStorage.setItem(STORAGE_KEY, encrypted);
