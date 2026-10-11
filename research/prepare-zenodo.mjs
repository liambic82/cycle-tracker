import { createHash } from 'node:crypto';
import { parseZenodoMenstruation, ZENODO_SOURCE } from './zenodo-intake.mjs';
import {
  DATASET_PROTOCOL,
  SPLIT_PROTOCOL,
  parsePeriodDataset,
  participantSplit,
} from './period-dataset.ts';

export const PREPARATION_VERSION = 'zenodo-recorded-starts-v1';
export const ZENODO_DATASET_ID = 'zenodo-15598359-v1';
export const RESEARCH_SPLITS = ['development', 'calibration', 'test'];
export const jsonBytes = (value) => JSON.stringify(value, null, 2) + '\n';
export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const pseudonym = (id) => 'z_' + sha256(JSON.stringify(['zenodo-15598359-identifier-v1', id]));

// Pure transformation; use the CLI's checksum verification for the actual deposit.
// It never calls a prediction function or infers a clinical context.
export function prepareZenodoRecords(text) {
  const records = parseZenodoMenstruation(text);
  const unique = new Map();
  let duplicateRowsRemoved = 0;
  for (const record of records) {
    const key = JSON.stringify([record.id, record.day, record.birth]);
    const previous = unique.get(key);
    if (previous) {
      if (previous.fingerprint !== record.fingerprint)
        throw new Error(
          'Conflicting records share an event date. Preparation stopped without selecting a row.',
        );
      duplicateRowsRemoved++;
    } else unique.set(key, record);
  }
  const people = new Map();
  for (const record of unique.values()) {
    const person = people.get(record.id) ?? { starts: [], births: [], studies: new Set() };
    (record.birth ? person.births : person.starts).push(record);
    person.studies.add(record.study);
    people.set(record.id, person);
  }
  const participants = [];
  const annotations = [];
  const pseudonyms = new Set();
  let birthOnlyIdentifiersOmitted = 0;
  for (const [sourceId, person] of people) {
    if (!person.starts.length) {
      birthOnlyIdentifiersOmitted++;
      continue;
    }
    person.starts.sort((a, b) => a.day - b.day);
    person.births.sort((a, b) => a.day - b.day);
    const origin = person.starts[0].day;
    const id = pseudonym(sourceId);
    if (pseudonyms.has(id)) throw new Error('Participant identifier collision.');
    pseudonyms.add(id);
    const startDays = person.starts.map((row) => row.day - origin);
    participants.push({
      id,
      segments: [
        {
          startDays,
          observedThrough: startDays.at(-1),
          context: 'unknown',
          complete: false,
        },
      ],
    });
    annotations.push({
      id,
      studySources: [...person.studies].sort(),
      birthEventDays: person.births.map((row) => row.day - origin),
      onsetFlags: person.starts
        .filter((row) => row.beforeBirth || row.afterBirth)
        .map((row) => ({
          day: row.day - origin,
          beforeBirth: row.beforeBirth,
          afterBirth: row.afterBirth,
        })),
    });
  }
  const compareId = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  participants.sort(compareId);
  annotations.sort(compareId);
  const dataset = parsePeriodDataset({
    protocol: DATASET_PROTOCOL,
    provenance: {
      datasetId: ZENODO_DATASET_ID,
      kind: 'external',
      sourceUrl: ZENODO_SOURCE.url,
      sourceSha256: ZENODO_SOURCE.sha256,
      rightsReference: 'https://creativecommons.org/licenses/by/4.0/',
      loggingAssumption: 'same-day-assumed',
    },
    participants,
  });
  const datasets = {};
  const auditAnnotations = {};
  const splitCounts = {};
  for (const split of RESEARCH_SPLITS) {
    const members = dataset.participants.filter(
      (p) => participantSplit(ZENODO_DATASET_ID, p.id) === split,
    );
    splitCounts[split] = {
      participants: members.length,
      starts: members.reduce((n, p) => n + p.segments[0].startDays.length, 0),
    };
    // Empty fictional groups have no dataset file: the contract requires at least one person.
    if (!members.length) continue;
    datasets[split] = parsePeriodDataset({ ...dataset, participants: members });
    const ids = new Set(members.map((p) => p.id));
    auditAnnotations[split] = {
      preparationVersion: PREPARATION_VERSION,
      role: 'retrospective-audit-only-not-predictor-input',
      split,
      participants: annotations.filter((p) => ids.has(p.id)),
    };
  }
  return {
    datasets,
    auditAnnotations,
    summary: {
      preparationVersion: PREPARATION_VERSION,
      splitProtocol: SPLIT_PROTOCOL,
      sourceRows: records.length,
      duplicateRowsRemoved,
      birthEventRowsExcludedFromStarts: [...unique.values()].filter((r) => r.birth).length,
      birthOnlyIdentifiersOmitted,
      retainedParticipants: participants.length,
      retainedStarts: participants.reduce((n, p) => n + p.segments[0].startDays.length, 0),
      // No split was created from a long interval or a retrospectively known annotation.
      historySegments: participants.length,
      contextInferred: false,
      forecastsScored: 0,
      splitCounts,
    },
  };
}
