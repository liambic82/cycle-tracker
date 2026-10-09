import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyEntry, emptyJournal } from '../src/domain/journal.ts';
import {
  planReminders,
  reminderContent,
  REMINDER_PREFIX,
  TEST_REMINDER_ID,
  type Reminder,
} from '../src/domain/reminders.ts';
import {
  ReminderService,
  REMINDER_SETTINGS_KEY,
  type ReminderBackend,
  type ReminderPermission,
} from '../src/data/reminderService.ts';
import type { MedicationPlan } from '../src/domain/medications.ts';
import { recordDose } from '../src/domain/medicationActions.ts';
import { plannedDoses } from '../src/domain/medications.ts';

// Each Node test file runs in its own process. Exercise DST explicitly, including on Windows.
process.env.TZ = 'America/New_York';
const now = () => new Date(2026, 9, 9, 7, 0);
const plan: MedicationPlan = {
  id: 'plan1',
  startsOn: '2026-10-01',
  name: 'Private fictional name',
  kind: 'medication',
  dose: 'Private amount',
  instructions: 'Private note',
  mode: 'daily',
  times: ['08:00', '20:00'],
  weekdays: [],
  onDays: null,
  offDays: null,
  offDose: null,
};
function journal(patch: Partial<MedicationPlan> = {}) {
  return {
    ...emptyJournal('2026-10-09'),
    medications: [{ id: 'med1', plans: [{ ...plan, ...patch }] }],
  };
}
const doses = (value: ReturnType<typeof planReminders>) =>
  value.notifications.filter((item) => item.kind === 'dose');

test('reminders are opt-in, future only, generic, and bounded', () => {
  const value = journal();
  assert.equal(planReminders(value, [], now()).notifications.length, 0);
  const result = planReminders(value, ['med1'], now());
  assert.equal(result.count, 60);
  assert.equal(result.notifications.length, 61);
  assert.equal(doses(result)[0]!.at, new Date(2026, 9, 9, 8).getTime());
  assert.ok(result.refreshAt! > doses(result).at(-1)!.at);
  const raw = JSON.stringify(result) + JSON.stringify(reminderContent('dose'));
  for (const sensitive of [plan.name, plan.dose, plan.instructions, 'med1', 'plan1'])
    assert.ok(!raw.includes(sensitive));
  const later = planReminders(value, ['med1'], new Date(2026, 9, 9, 8));
  assert.equal(doses(later)[0]!.at, new Date(2026, 9, 9, 20).getTime());
});

test('selected weekdays, dated changes, future starts, and pauses control alerts', () => {
  const value = journal({ mode: 'weekdays', weekdays: [1, 3] });
  value.medications[0]!.plans.push({
    ...plan,
    id: 'pause',
    startsOn: '2026-10-15',
    mode: 'paused',
    times: [],
  });
  const result = planReminders(value, ['med1'], now());
  assert.deepEqual(
    doses(result).map((item) => new Date(item.at).getDate()),
    [12, 12, 14, 14],
  );
  const future = planReminders(journal({ startsOn: '2026-10-12' }), ['med1'], now());
  assert.equal(new Date(doses(future)[0]!.at).getDate(), 12);
  const paused = planReminders(value, ['med1'], new Date(2026, 9, 16));
  assert.equal(paused.notifications.length, 0);
});

test('cycle off days send nothing unless a placebo/off-day dose was entered', () => {
  const value = journal({
    startsOn: '2026-10-07',
    mode: 'cycle',
    onDays: 2,
    offDays: 1,
    times: ['12:00'],
  });
  assert.equal(new Date(doses(planReminders(value, ['med1'], now()))[0]!.at).getDate(), 10);
  value.medications[0]!.plans[0]!.offDose = 'Private placebo label';
  assert.equal(new Date(doses(planReminders(value, ['med1'], now()))[0]!.at).getDate(), 9);
  assert.equal(
    planReminders(journal({ mode: 'as-needed', times: [] }), ['med1'], now()).notifications.length,
    0,
  );
});

test('taken, skipped, and late records suppress their occurrence; removal restores it', () => {
  for (const status of ['taken', 'skipped', 'late'] as const) {
    const value = journal();
    const logged = recordDose(
      value,
      '2026-10-09',
      '2026-10-09',
      plannedDoses(value.medications, '2026-10-09')[0]!,
      'dose',
      {
        status,
        actualDose: status === 'skipped' ? '' : 'Private amount',
        takenOn: status === 'skipped' ? null : '2026-10-09',
        actualTime: null,
        note: '',
      },
    );
    assert.equal(
      doses(planReminders(logged, ['med1'], now()))[0]!.at,
      new Date(2026, 9, 9, 20).getTime(),
    );
    logged.entries['2026-10-09'] = emptyEntry();
    assert.equal(
      doses(planReminders(logged, ['med1'], now()))[0]!.at,
      new Date(2026, 9, 9, 8).getTime(),
    );
  }
});

test('same-time medications share one alert until every occurrence is recorded', () => {
  const value = journal({ times: ['08:00'] });
  value.medications.push({ id: 'med2', plans: [{ ...plan, id: 'plan2', times: ['08:00'] }] });
  const first = plannedDoses(value.medications, '2026-10-09')[0]!;
  const logged = recordDose(value, '2026-10-09', '2026-10-09', first, 'dose', {
    status: 'skipped',
    actualDose: '',
    takenOn: null,
    actualTime: null,
    note: '',
  });
  assert.equal(planReminders(logged, ['med1', 'med2'], now()).count, 30);
  assert.equal(
    doses(planReminders(logged, ['med1', 'med2'], now()))[0]!.at,
    new Date(2026, 9, 9, 8).getTime(),
  );
});

test('dense schedules stop at 60 unique times and request refresh before the first omitted time', () => {
  const result = planReminders(
    journal({ times: ['00:00', '03:00', '06:00', '09:00', '12:00', '15:00', '18:00', '21:00'] }),
    ['med1'],
    now(),
  );
  assert.equal(result.count, 60);
  assert.equal(result.notifications.length, 61);
  assert.ok(result.refreshAt! > doses(result).at(-1)!.at);
  assert.ok(result.refreshAt! < now().getTime() + 9 * 86400000);
});

test('local wall-clock schedules survive DST and timezone changes without daily drift', () => {
  const value = journal({ startsOn: '2026-01-01', times: ['08:00'] });
  const fall = doses(planReminders(value, ['med1'], new Date(2026, 9, 31)));
  assert.equal(fall[1]!.at - fall[0]!.at, 25 * 3600000);
  assert.ok(fall.every((item) => new Date(item.at).getHours() === 8));
  const spring = doses(planReminders(value, ['med1'], new Date(2026, 2, 7)));
  assert.equal(spring[1]!.at - spring[0]!.at, 23 * 3600000);
  const eastern = doses(planReminders(value, ['med1'], now()))[0]!.at;
  process.env.TZ = 'America/Los_Angeles';
  try {
    const pacific = doses(planReminders(value, ['med1'], now()))[0]!.at;
    assert.equal(pacific - eastern, 3 * 3600000);
  } finally {
    process.env.TZ = 'America/New_York';
  }
});

test('spring gaps roll forward and fall repeated times produce a single occurrence', () => {
  const spring = doses(
    planReminders(
      journal({ startsOn: '2026-01-01', times: ['02:30'] }),
      ['med1'],
      new Date(2026, 2, 8),
    ),
  );
  assert.equal(new Date(spring[0]!.at).getHours(), 3);
  const fall = doses(
    planReminders(
      journal({ startsOn: '2026-01-01', times: ['01:30'] }),
      ['med1'],
      new Date(2026, 10, 1),
    ),
  );
  assert.equal(new Date(fall[0]!.at).getTimezoneOffset(), 240);
  assert.equal(new Date(fall[1]!.at).getDate(), 2);
});

function harness() {
  const data = new Map<string, string>();
  const pending = new Map<string, Reminder>();
  const calls: string[] = [];
  let permission: ReminderPermission = 'granted';
  let failSchedule = false;
  let failCancel = false;
  let failWrite = false;
  const backend: ReminderBackend = {
    available: true,
    permission: async (request) => {
      calls.push(request ? 'request' : 'read-permission');
      return permission;
    },
    list: async () => [...pending.keys()],
    schedule: async (item) => {
      calls.push('schedule');
      if (failSchedule) throw new Error('OS failed');
      pending.set(item.id, item);
    },
    cancel: async (id) => {
      if (failCancel) throw new Error('OS failed');
      calls.push('cancel');
      pending.delete(id);
    },
    dismissObsolete: async () => {},
    clear: async () => {
      if (failCancel) throw new Error('OS failed');
      calls.push('clear');
      pending.clear();
    },
  };
  const service = new ReminderService(
    {
      getItem: async (key) => data.get(key) ?? null,
      setItem: async (key, value) => {
        if (failWrite) throw new Error('Storage failed');
        data.set(key, value);
      },
      removeItem: async (key) => {
        data.delete(key);
      },
    },
    backend,
    now,
  );
  return {
    data,
    pending,
    calls,
    service,
    backend,
    permission: (value: ReminderPermission) => {
      permission = value;
    },
    failSchedule: (value: boolean) => {
      failSchedule = value;
    },
    failCancel: (value: boolean) => {
      failCancel = value;
    },
    failWrite: (value: boolean) => {
      failWrite = value;
    },
  };
}

test('opening never requests permission; opt-ins are device-local and persistence contains no regimen', async () => {
  const h = harness();
  const value = journal();
  const original = JSON.stringify(value);
  assert.deepEqual((await h.service.sync('vault1', value)).enabled, []);
  assert.ok(!h.calls.includes('request'));
  const result = await h.service.setEnabled('vault1', value, 'med1', true);
  assert.equal(result.count, 60);
  assert.equal(h.pending.size, 61);
  assert.equal(JSON.stringify(value), original);
  assert.deepEqual(JSON.parse(h.data.get(REMINDER_SETTINGS_KEY)!), {
    vault: 'vault1',
    enabled: ['med1'],
  });
  h.calls.length = 0;
  await h.service.sync('vault1', value);
  assert.ok(!h.calls.includes('schedule'));
  assert.ok(!h.calls.includes('request'));
});

test('denied permission does not opt in or schedule; external revocation cancels pending alerts', async () => {
  const h = harness();
  h.permission('denied');
  await assert.rejects(h.service.setEnabled('vault1', journal(), 'med1', true), /not allowed/);
  assert.equal(h.pending.size, 0);
  assert.deepEqual((await h.service.sync('vault1', journal())).enabled, []);
  h.permission('granted');
  await h.service.setEnabled('vault1', journal(), 'med1', true);
  h.permission('denied');
  const result = await h.service.sync('vault1', journal());
  assert.equal(result.permission, 'denied');
  assert.equal(result.count, 0);
  assert.equal(h.pending.size, 0);
});

test('plan edits replace pending times and switching off cancels the last medication’s notices', async () => {
  const h = harness();
  await h.service.setEnabled('vault1', journal(), 'med1', true);
  const oldId = `${REMINDER_PREFIX}${new Date(2026, 9, 9, 8).getTime()}`;
  assert.ok(h.pending.has(oldId));
  await h.service.sync('vault1', journal({ times: ['09:00'] }));
  assert.ok(!h.pending.has(oldId));
  assert.equal(h.pending.size, 31);
  await h.service.setEnabled('vault1', journal(), 'med1', false);
  assert.equal(h.pending.size, 0);
});

test('serialized enable then clear cannot recreate reminders after deletion/restore', async () => {
  const h = harness();
  await Promise.all([h.service.setEnabled('vault1', journal(), 'med1', true), h.service.clear()]);
  assert.equal(h.pending.size, 0);
  assert.ok(!h.data.has(REMINDER_SETTINGS_KEY));
  assert.deepEqual((await h.service.sync('vault1', journal())).enabled, []);
  assert.equal(h.pending.size, 0);
});

test('restored/replaced vaults and corrupt preferences never reuse another journal’s opt-ins', async () => {
  const h = harness();
  await h.service.setEnabled('vault1', journal(), 'med1', true);
  assert.deepEqual((await h.service.sync('vault2', journal())).enabled, []);
  assert.equal(h.pending.size, 0);
  h.data.set(REMINDER_SETTINGS_KEY, '{broken');
  await h.service.sync('vault2', journal());
  assert.equal(h.pending.size, 0);
});

test('native scheduling failure clears partial results and remains retryable', async () => {
  const h = harness();
  h.failSchedule(true);
  await assert.rejects(
    h.service.setEnabled('vault1', journal(), 'med1', true),
    /could not be refreshed/,
  );
  assert.equal(h.pending.size, 0);
  h.failSchedule(false);
  assert.equal((await h.service.sync('vault1', journal())).count, 60);
});

test('failed cancellation reports failure; persisted off state prevents reactivation on retry', async () => {
  const h = harness();
  await h.service.setEnabled('vault1', journal(), 'med1', true);
  h.failCancel(true);
  await assert.rejects(h.service.clear());
  assert.ok(!h.data.has(REMINDER_SETTINGS_KEY));
  h.failCancel(false);
  assert.deepEqual((await h.service.sync('vault1', journal())).enabled, []);
  assert.equal(h.pending.size, 0);
});

test('failed preference writes do not schedule an unpersisted opt-in', async () => {
  const h = harness();
  await h.service.sync('vault1', journal());
  h.failWrite(true);
  await assert.rejects(h.service.setEnabled('vault1', journal(), 'med1', true));
  assert.equal(h.pending.size, 0);
});

test('test reminders are generic, replaceable, preserved during refresh, and cleared with all reminders', async () => {
  const h = harness();
  await h.service.sync('vault1', journal());
  await h.service.test();
  await h.service.test();
  assert.equal(h.pending.size, 1);
  assert.equal(h.pending.get(TEST_REMINDER_ID)!.at, now().getTime() + 60000);
  await h.service.sync('vault1', journal());
  assert.ok(h.pending.has(TEST_REMINDER_ID));
  await h.service.clear();
  assert.equal(h.pending.size, 0);
});

test('browser backend never requests permission, writes preferences, or schedules reminders', async () => {
  const h = harness();
  h.backend.available = false;
  assert.equal((await h.service.sync('vault1', journal())).permission, 'unavailable');
  assert.equal(h.data.size, 0);
  assert.equal(h.calls.length, 0);
  await assert.rejects(h.service.setEnabled('vault1', journal(), 'med1', true), /installed/);
});

test('unlock and manual refresh rearm native alarms that a force-stop may have removed', async () => {
  const h = harness();
  await h.service.setEnabled('vault1', journal(), 'med1', true);
  h.calls.length = 0;
  await h.service.sync('vault1', journal(), true);
  assert.equal(h.calls.filter((call) => call === 'schedule').length, 61);
  assert.equal(h.pending.size, 61); // Stable identifiers replace, never duplicate.
  assert.ok(!h.calls.includes('request'));
});
