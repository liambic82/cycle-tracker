import type { Journal } from '../domain/journal.ts';
import { planAutomaticSleep } from '../domain/automaticSleep.ts';
import { toDay } from '../domain/dates.ts';

export type AutoSleepState = {
  state: 'idle' | 'checking' | 'saved' | 'paused' | 'error';
  message: string;
};
interface Ports {
  current(): Journal | null;
  active(): boolean;
  status(): Promise<string>;
  read(): Promise<unknown[]>;
  save(next: Journal): Promise<void>;
  report(state: AutoSleepState): void;
  now(): Date;
}
// No timers or background jobs. One bounded read, initiated after unlock or explicit Check now.
export class ForegroundSleepImporter {
  private epoch = 0;
  private running = false;
  private runningEpoch = 0;
  private pending = false;
  private checked = -Infinity;
  private ports: Ports;
  constructor(ports: Ports) {
    this.ports = ports;
  }
  cancel(resetCooldown = false) {
    this.epoch++;
    if (resetCooldown) this.checked = -Infinity;
    this.ports.report({ state: 'idle', message: '' });
  }
  async check(force = false): Promise<void> {
    const p = this.ports,
      config = p.current()?.preferences.sleepAutomation;
    if (this.running) {
      if (this.runningEpoch !== this.epoch) this.pending = true;
      return;
    }
    if (
      !p.active() ||
      !config?.enabled ||
      !config.source ||
      (!force && p.now().getTime() - this.checked < 60000)
    )
      return;
    this.running = true;
    this.runningEpoch = this.epoch;
    this.checked = p.now().getTime();
    const epoch = this.epoch;
    const valid = () =>
      epoch === this.epoch &&
      p.active() &&
      p.current()?.preferences.sleepAutomation.enabled === true &&
      p.current()?.preferences.sleepAutomation.source === config.source;
    p.report({ state: 'checking', message: 'Checking recent sleep…' });
    try {
      if ((await p.status()) !== 'granted') {
        if (valid())
          p.report({
            state: 'paused',
            message: 'Sleep import paused. Open Wearable sleep to check access.',
          });
        return;
      }
      if (!valid()) return;
      const raw = await p.read();
      if (!valid()) return;
      // Permission can change during a read. Never prompt automatically.
      if ((await p.status()) !== 'granted') {
        if (valid())
          p.report({
            state: 'paused',
            message: 'Sleep access changed. Check the connection in Wearable sleep.',
          });
        return;
      }
      if (!valid()) return;
      const now = p.now();
      // Read the latest journal after all asynchronous reads, preserving edits made meanwhile.
      const next = planAutomaticSleep(p.current()!, raw, toDay(now), now.toISOString());
      await p.save(next);
      if (!valid()) return;
      const result = next.preferences.sleepAutomation.lastCheck!;
      p.report({
        state: 'saved',
        message: `${result.added} new sleep session${result.added === 1 ? '' : 's'} saved${result.review ? ` · ${result.review} to review` : ''}.${result.sourceSeen ? '' : ' No sessions from the chosen source; sync your tracker in its phone app.'}`,
      });
    } catch (error) {
      if (valid())
        p.report({
          state: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Sleep could not be checked. Try again in Wearable sleep.',
        });
    } finally {
      this.running = false;
      if (!valid() && epoch === this.epoch) p.report({ state: 'idle', message: '' });
      if (this.pending) {
        this.pending = false;
        await this.check(true);
      }
    }
  }
}
