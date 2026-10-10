import { gcm } from '@noble/ciphers/aes.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { hkdf } from '@noble/hashes/hkdf.js';
import { sha256 } from '@noble/hashes/sha2.js';
import type { RandomBytes, VaultKey } from '../domain/vault.ts';
import {
  MAX_PHOTO_BYTES,
  prepareEncodedPhoto,
  photoDataUri,
  type PreparedPhoto,
} from '../domain/personalImage.ts';

export const PERSONAL_BACKGROUND_KEY = 'cycle-tracker.personal-background.v1';
const aad = new TextEncoder().encode('cycle-tracker:personal-background:v1');
type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<unknown>;
  removeItem(key: string): Promise<unknown>;
};
type Session = { key: Uint8Array; salt: string };
export type PhotoSnapshot = { uri: string | null; ready: boolean; busy: boolean; error: string };
export type PhotoControls = PhotoSnapshot & {
  apply: (photo: PreparedPhoto) => Promise<boolean>;
  remove: () => Promise<boolean>;
};

export class PersonalBackgroundStore {
  private session: Session | null = null;
  private demo = false;
  private epoch = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private listeners = new Set<() => void>();
  private snapshot: PhotoSnapshot = { uri: null, ready: false, busy: false, error: '' };
  private storage: Storage;
  private random: RandomBytes;
  constructor(storage: Storage, random: RandomBytes) {
    this.storage = storage;
    this.random = random;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit(patch: Partial<PhotoSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((fn) => fn());
  }
  close = () => {
    this.epoch++;
    this.session?.key.fill(0);
    this.session = null;
    this.demo = false;
    this.emit({ uri: null, ready: false, busy: false, error: '' });
  };
  openDemo = () => {
    this.close();
    this.demo = true;
    this.emit({ ready: true });
  };
  async open(vault: VaultKey) {
    this.close();
    const epoch = this.epoch;
    this.session = {
      salt: vault.salt,
      key: hkdf(sha256, vault.key, hexToBytes(vault.salt), aad, 32),
    };
    try {
      await this.queue.catch(() => {});
      const raw = await this.storage.getItem(PERSONAL_BACKGROUND_KEY);
      if (epoch !== this.epoch) return;
      if (raw === null) return;
      if (raw.length > MAX_PHOTO_BYTES * 2 + 1024) throw new Error('size');
      const e = JSON.parse(raw);
      if (
        e.version !== 1 ||
        e.salt !== vault.salt ||
        !/^[a-f0-9]{24}$/.test(e.nonce) ||
        typeof e.ciphertext !== 'string' ||
        !/^(?:[a-f0-9]{2})+$/.test(e.ciphertext) ||
        e.ciphertext.length < 32
      )
        throw new Error('invalid');
      const plain = gcm(this.session!.key, hexToBytes(e.nonce), aad).decrypt(
        hexToBytes(e.ciphertext),
      );
      try {
        const photo = prepareEncodedPhoto(plain);
        try {
          this.emit({ uri: photoDataUri(photo) });
        } finally {
          photo.bytes.fill(0);
        }
      } finally {
        plain.fill(0);
      }
    } catch {
      if (epoch === this.epoch)
        this.emit({
          error:
            'Your personal background could not be opened. Choose it again or remove the saved copy. Your journal is unaffected.',
        });
    } finally {
      if (epoch === this.epoch) this.emit({ ready: true });
    }
  }
  apply = async (photo: PreparedPhoto) => {
    if (!this.snapshot.ready || this.snapshot.busy || (!this.session && !this.demo)) return false;
    const epoch = this.epoch;
    const clean = prepareEncodedPhoto(photo.bytes);
    const uri = photoDataUri(clean);
    if (this.demo) {
      clean.bytes.fill(0);
      this.emit({ uri, error: '' });
      return true;
    }
    this.emit({ busy: true, error: '' });
    try {
      const nonce = this.random(12);
      const raw = JSON.stringify({
        version: 1,
        salt: this.session!.salt,
        nonce: bytesToHex(nonce),
        ciphertext: bytesToHex(gcm(this.session!.key, nonce, aad).encrypt(clean.bytes)),
      });
      const write = this.queue
        .catch(() => {})
        .then(() => this.storage.setItem(PERSONAL_BACKGROUND_KEY, raw));
      this.queue = write;
      await write;
      if (epoch !== this.epoch) return false;
      this.emit({ uri });
      return true;
    } catch {
      if (epoch === this.epoch)
        this.emit({
          error:
            'The photo could not be saved. Your previous background is unchanged. Try again or choose a smaller photo.',
        });
      return false;
    } finally {
      clean.bytes.fill(0);
      if (epoch === this.epoch) this.emit({ busy: false });
    }
  };
  remove = async () => {
    if (!this.snapshot.ready || this.snapshot.busy) return false;
    const epoch = this.epoch;
    if (this.demo) {
      this.emit({ uri: null, error: '' });
      return true;
    }
    this.emit({ busy: true, error: '' });
    try {
      await this.clearPersistent();
      if (epoch !== this.epoch) return false;
      this.emit({ uri: null });
      return true;
    } catch {
      if (epoch === this.epoch)
        this.emit({ error: 'The saved photo could not be removed. Please retry.' });
      return false;
    } finally {
      if (epoch === this.epoch) this.emit({ busy: false });
    }
  };
  // Creation/restore/deletion must drain earlier photo writes before removing their single slot.
  clearPersistent = async () => {
    const epoch = this.epoch;
    const removal = this.queue
      .catch(() => {})
      .then(() => this.storage.removeItem(PERSONAL_BACKGROUND_KEY));
    this.queue = removal;
    await removal;
    if (epoch === this.epoch) this.emit({ uri: null, error: '' });
  };
}
