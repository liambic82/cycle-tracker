import {
  defaultAppearance,
  parseAppearance,
  type AppearanceSettings,
} from '../domain/appearance.ts';

export const APPEARANCE_KEY = 'cycle-tracker.appearance.v1';
type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};
type Snapshot = {
  settings: AppearanceSettings;
  ready: boolean;
  saving: boolean;
  error: string;
  demo: boolean;
};

export class AppearanceStore {
  private storage: Storage;
  private device = defaultAppearance();
  private preview: AppearanceSettings | null = null;
  private ready = false;
  private saving = false;
  private error = '';
  private revision = 0;
  private queue: Promise<unknown> = Promise.resolve();
  private loading: Promise<void> | null = null;
  private listeners = new Set<() => void>();
  private snapshot: Snapshot = {
    settings: this.device,
    ready: false,
    saving: false,
    error: '',
    demo: false,
  };

  constructor(storage: Storage) {
    this.storage = storage;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private emit() {
    this.snapshot = {
      settings: this.preview ?? this.device,
      ready: this.ready,
      saving: !this.preview && this.saving,
      error: this.preview ? '' : this.error,
      demo: !!this.preview,
    };
    this.listeners.forEach((listener) => listener());
  }
  load() {
    if (this.loading) return this.loading;
    this.loading = (async () => {
      try {
        const raw = await this.storage.getItem(APPEARANCE_KEY);
        this.device = raw === null ? defaultAppearance() : parseAppearance(JSON.parse(raw));
      } catch {
        this.error =
          'Saved appearance could not be read. Choose your preferences again to save them on this device.';
      } finally {
        // Sample mode can open while storage is still loading. Start its preview
        // from the saved device preference once available; editing is gated by ready.
        if (this.preview) this.preview = { ...this.device };
        this.ready = true;
        this.emit();
      }
    })();
    return this.loading;
  }
  setDemo = (demo: boolean) => {
    if (demo === !!this.preview) return;
    this.preview = demo ? { ...this.device } : null;
    this.emit();
  };
  update = (value: AppearanceSettings) => {
    if (!this.ready) return Promise.resolve();
    const next = parseAppearance(value);
    if (this.preview) {
      this.preview = next;
      this.emit();
      return Promise.resolve();
    }
    this.device = next;
    const revision = ++this.revision;
    this.saving = true;
    this.error = '';
    this.emit();
    // Ordered writes prevent a slower earlier choice replacing the latest preference.
    const write = this.queue
      .catch(() => {})
      .then(() => this.storage.setItem(APPEARANCE_KEY, JSON.stringify(next)));
    this.queue = write;
    return write.then(
      () => {
        if (revision === this.revision) {
          this.saving = false;
          this.error = '';
          this.emit();
        }
      },
      () => {
        if (revision === this.revision) {
          this.saving = false;
          this.error =
            'Appearance could not be saved. Your journal is unaffected. Retry saving appearance.';
          this.emit();
        }
      },
    );
  };
  reset = () => this.update(defaultAppearance());
  retry = () => this.update(this.device);
}
