import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrowserJournalStorage } from './browserJournalStorage';
import { IndexedVaultDatabase } from './indexedVaultDatabase';

export const journalStorage = new BrowserJournalStorage(AsyncStorage, new IndexedVaultDatabase());
export const replaceJournal = (encrypted: string) => journalStorage.replace(encrypted);
export const prepareJournalStorage = () => journalStorage.prepare();
