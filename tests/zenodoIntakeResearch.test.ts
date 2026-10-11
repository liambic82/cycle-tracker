import test from 'node:test';
import assert from 'node:assert/strict';
import { auditZenodoMenstruation } from '../research/zenodo-intake.mjs';

const header = 'Woman;Date;Birthday;Study;Country;Origin;BeforeBirth;AfterBirth;Birth';
// Entirely fictional records. No downloaded participant rows belong in tests.
const row = (id = 'fictional-a', date = '01.01.2020', before = '0', birth = '0') =>
  `${id};${date};unused;new;unused;unused;${before};0;${birth}`;
test('intake separates birth events and reports duplicate inconsistencies without choosing a row', () => {
  const text =
    [
      header,
      row(),
      row(),
      row('fictional-a', '01.01.2020', '1'),
      row('fictional-a', '29.01.2020'),
      row('fictional-b', '01.01.2020', '0', '1'),
    ].join('\r\n') + '\r\n';
  const report = auditZenodoMenstruation(text);
  assert.equal(report.sourceRows, 5);
  assert.equal(report.birthOnlyIdentifiers, 1);
  assert.equal(report.menstrualParticipants, 1);
  assert.equal(report.distinctMenstrualDates, 2);
  assert.equal(report.duplicateExcessRows, 2);
  assert.equal(report.duplicateGroupsWithDifferentFields, 1);
  assert.equal(JSON.stringify(report).includes('fictional'), false);
});
test('intake rejects invalid dates, flags and unexpected CSV structures without exposing source values', () => {
  for (const bad of [
    row('private-value', '31.02.2020'),
    row('private-value', '29.02.2019'),
    row('private-value', '01.01.2020', 'unknown'),
    row('private-value') + ';extra',
    '"private-value"',
  ]) {
    assert.throws(
      () => auditZenodoMenstruation(`${header}\n${bad}`),
      (error: Error) => {
        assert.equal(error.message.includes('private-value'), false);
        return /Unexpected source format/.test(error.message);
      },
    );
  }
  assert.equal(
    auditZenodoMenstruation(`${header}\n${row('fictional', '29.02.2020')}`).menstrualRows,
    1,
  );
});
test('source row order problems are counted, not silently repaired', () => {
  const report = auditZenodoMenstruation(
    [header, row('fictional', '29.01.2020'), row()].join('\n'),
  );
  // Distinct identifiers do not establish an ordering problem.
  assert.equal(report.descendingDateTransitions, 0);
  const descending = auditZenodoMenstruation(
    [header, row('fictional-a', '29.01.2020'), row()].join('\n'),
  );
  assert.equal(descending.descendingDateTransitions, 1);
});
