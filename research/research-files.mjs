import {
  readFile,
  realpath,
  stat,
  lstat,
  readdir,
  mkdtemp,
  writeFile,
  rename,
} from 'node:fs/promises';
import { resolve, relative, isAbsolute, join } from 'node:path';
import { createHash } from 'node:crypto';
import { ZENODO_SOURCE } from './zenodo-intake.mjs';

export async function readVerifiedZenodoSource(privateRoot, path) {
  const root = await realpath(privateRoot);
  const inputPath = await realpath(resolve(path));
  const within = relative(root, inputPath);
  if (
    isAbsolute(within) ||
    within === '..' ||
    within.startsWith('../') ||
    within.startsWith('..\\')
  )
    throw new Error('Keep external inputs under the ignored research/private-data directory.');
  if ((await stat(inputPath)).size !== ZENODO_SOURCE.bytes)
    throw new Error('Source size differs from the reviewed deposit.');
  const bytes = await readFile(inputPath);
  for (const algorithm of ['md5', 'sha256']) {
    if (createHash(algorithm).update(bytes).digest('hex') !== ZENODO_SOURCE[algorithm])
      throw new Error('Source checksum differs from the reviewed deposit.');
  }
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
}

// Files are assembled before writing. Publish a completed directory by rename;
// reruns compare exact bytes and never overwrite prior output. No recursive deletion.
export async function writeResearchBundle(privateRoot, outputName, files) {
  if (
    !/^[a-z0-9-]+$/.test(outputName) ||
    !files['manifest.json'] ||
    Object.entries(files).some(
      ([name, contents]) => !/^[a-z0-9-]+\.json$/.test(name) || typeof contents !== 'string',
    )
  )
    throw new Error('Invalid research bundle layout.');
  const root = await realpath(privateRoot);
  const output = join(root, outputName);
  let existing;
  try {
    existing = await lstat(output);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (existing) {
    if (existing.isSymbolicLink() || !existing.isDirectory())
      throw new Error('Research output must be an ordinary directory.');
    const names = (await readdir(output)).sort();
    if (JSON.stringify(names) !== JSON.stringify(Object.keys(files).sort()))
      throw new Error('Existing preparation differs or is incomplete; no files were overwritten.');
    for (const name of names) {
      const path = join(output, name);
      const info = await lstat(path);
      if (
        info.isSymbolicLink() ||
        !info.isFile() ||
        info.size !== Buffer.byteLength(files[name]) ||
        !Buffer.from(files[name]).equals(await readFile(path))
      )
        throw new Error(
          'Existing preparation differs or is incomplete; no files were overwritten.',
        );
    }
    return 'verified-existing';
  }
  const temporary = await mkdtemp(join(root, '.zenodo-preparation-'));
  for (const [name, contents] of Object.entries(files).filter(([name]) => name !== 'manifest.json'))
    await writeFile(join(temporary, name), contents, { flag: 'wx' });
  await writeFile(join(temporary, 'manifest.json'), files['manifest.json'], { flag: 'wx' });
  await rename(temporary, output);
  return 'created';
}
