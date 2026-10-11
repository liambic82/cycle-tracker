import { fileURLToPath } from 'node:url';
import { runHeldoutComparison } from '../research/heldout-comparison.mjs';

try {
  const [split, extra] = process.argv.slice(2);
  if (!split || extra)
    throw new Error(
      'Usage: node --experimental-strip-types scripts/compare-zenodo-heldout.mjs calibration|test',
    );
  const result = await runHeldoutComparison(fileURLToPath(new URL('../', import.meta.url)), split);
  const { report, receipt, status } = result;
  console.log(
    JSON.stringify(
      {
        status,
        ...receipt,
        warning: report.warning,
        participants: report.overall.participants,
        scored: report.overall.scored,
        availability: report.overall.availability,
        methods: report.overall.methods,
        weightedMinusMedian: report.overall.weightedMinusMedian,
        primaryContrastInterval: report.uncertainty.weightedMinusMedian,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(
    error?.code
      ? 'Unable to read or write held-out files. Source values are omitted.'
      : error.message,
  );
  process.exitCode = 1;
}
