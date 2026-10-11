// Source-specific structural audit, not a forecast adapter or a general CSV parser.
export const ZENODO_SOURCE = {
  url: 'https://zenodo.org/records/15598359',
  metadataUrl: 'https://zenodo.org/api/records/15598359',
  license: 'CC-BY-4.0',
  file: 'menstruationdata.csv',
  bytes: 887713,
  md5: '1409abf2d80a62a26922ae62a487f5c9',
  sha256: '7712b11290d2d34384eaa3bca02739067a0dd6ddc8bd90c6fe91c545efffe28f',
};
const HEADER = 'Woman;Date;Birthday;Study;Country;Origin;BeforeBirth;AfterBirth;Birth';
const invalid = () => {
  throw new Error('Unexpected source format. No participant values are included in this error.');
};
function dateDay(value) {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
  if (!match) invalid();
  const [, day, month, year] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    year < 1900 ||
    year > 2100 ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    invalid();
  return date.getTime() / 86400000;
}

export function auditZenodoMenstruation(text) {
  // This exact deposit uses unquoted semicolon-separated fields. Fail if it changes.
  if (text.includes('"') || text.includes('\0')) invalid();
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.shift() !== HEADER || !lines.length) invalid();
  const allPeople = new Set();
  const people = new Map();
  let birthRows = 0;
  let beforeBirth = 0;
  let afterBirth = 0;
  const study = { old: 0, new: 0 };
  for (const line of lines) {
    const fields = line.split(';');
    if (fields.length !== 9) invalid();
    const [id, date, , source, , , before, after, birth] = fields;
    if (
      !id ||
      !['old', 'new'].includes(source) ||
      ![before, after, birth].every((flag) => flag === '0' || flag === '1')
    )
      invalid();
    const day = dateDay(date);
    allPeople.add(id);
    if (birth === '1') {
      birthRows++;
      continue;
    }
    beforeBirth += Number(before);
    afterBirth += Number(after);
    study[source]++;
    const person = people.get(id) ?? { rows: 0, dates: new Map(), last: null, descending: 0 };
    person.rows++;
    if (person.last !== null && day < person.last) person.descending++;
    person.last = day;
    const copies = person.dates.get(day) ?? [];
    copies.push(line);
    person.dates.set(day, copies);
    people.set(id, person);
  }
  const histories = [...people.values()];
  if (!histories.length) invalid();
  const duplicateGroups = histories
    .flatMap((p) => [...p.dates.values()])
    .filter((g) => g.length > 1);
  return {
    sourceRows: lines.length,
    allEventIdentifiers: allPeople.size,
    birthRows,
    birthOnlyIdentifiers: allPeople.size - people.size,
    menstrualRows: histories.reduce((n, p) => n + p.rows, 0),
    menstrualParticipants: people.size,
    distinctMenstrualDates: histories.reduce((n, p) => n + p.dates.size, 0),
    recordsPerParticipant: {
      min: Math.min(...histories.map((p) => p.rows)),
      max: Math.max(...histories.map((p) => p.rows)),
    },
    duplicateDateGroups: duplicateGroups.length,
    duplicateExcessRows: duplicateGroups.reduce((n, g) => n + g.length - 1, 0),
    duplicateGroupsWithDifferentFields: duplicateGroups.filter((g) => new Set(g).size > 1).length,
    descendingDateTransitions: histories.reduce((n, p) => n + p.descending, 0),
    menstrualRowsFlaggedBeforeBirth: beforeBirth,
    menstrualRowsFlaggedAfterBirth: afterBirth,
    menstrualRowsByStudy: study,
  };
}
