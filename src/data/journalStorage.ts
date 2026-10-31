import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEY } from './repository';

// iOS retains its existing backend. Android and web select platform adapters.
export const journalStorage = AsyncStorage;
export const replaceJournal = (encrypted: string) => journalStorage.setItem(STORAGE_KEY, encrypted);
export const prepareJournalStorage = async () => {};
