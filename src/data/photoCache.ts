import { Directory, File, Paths } from 'expo-file-system';

export function removePhotoTemp(uri: string, folder: 'DocumentPicker' | 'ImageManipulator') {
  const directory = new Directory(Paths.cache, folder);
  const prefix = directory.uri.replace(/\/$/, '') + '/';
  if (!uri.startsWith(prefix))
    throw new Error(
      'The temporary photo could not be safely cleaned up. Restart the app and try again.',
    );
  const file = new File(uri);
  if (file.exists) file.delete();
}

// These are app-private SDK work directories, never the user's photo library.
// Run before mounting the native journal, also recovering interrupted imports.
export function clearPhotoCache() {
  for (const name of ['DocumentPicker', 'ImageManipulator']) {
    const directory = new Directory(Paths.cache, name);
    if (directory.exists) directory.delete();
  }
}
