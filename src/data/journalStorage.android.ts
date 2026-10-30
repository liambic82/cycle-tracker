import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';
import { readAsStringAsync, writeAsStringAsync } from 'expo-file-system/legacy';
import { FileJournalStorage, type VaultFiles } from './fileJournalStorage';
import { MAX_BACKUP_BYTES } from '../domain/vault';

// App-private persistent files, never cache, shared storage, or an export folder.
// Android OS backup remains disabled in app.json.
const directory = () => new Directory(Paths.document, 'cycle-encrypted-journal-v1');
const fileFor = (slot: 'a' | 'b') => new File(directory(), `${slot}.vault`);
const files: VaultFiles = {
  async read(slot) {
    const file = fileFor(slot);
    if (!file.exists) return null;
    if (file.size > MAX_BACKUP_BYTES) throw new Error('The saved journal file exceeds 8 MB.');
    return readAsStringAsync(file.uri);
  },
  async write(slot, encrypted) {
    directory().create({ idempotent: true, intermediates: true });
    await writeAsStringAsync(fileFor(slot).uri, encrypted);
  },
  async remove(slot) {
    const file = fileFor(slot);
    if (file.exists) file.delete();
  },
};

export const journalStorage = new FileJournalStorage(AsyncStorage, files);
export const replaceJournal = (encrypted: string) => journalStorage.replace(encrypted);
