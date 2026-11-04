"""Compare release PDF exports on the guarded fictional Android QA journal.

Requires native-journal-qa.py's attachments fixture and disposable rooted AVD.
Never chooses a share recipient. Run without concurrent builds for useful timings.
"""
import argparse
from datetime import date, timedelta
import importlib.util
import json
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location('nativeqa', Path(__file__).with_name('native-journal-qa.py'))
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)

parser = argparse.ArgumentParser()
parser.add_argument('--cancel', action='store_true')
args = parser.parse_args()
q.guard()
version = json.loads((q.ROOT / 'package.json').read_text())['version']
out = q.ROOT / 'artifacts/qa/pdf-performance' / version
out.mkdir(parents=True, exist_ok=True)
prefix = q.PRIVATE + '/cache/cycle-report-exports'


def paths():
    return set(q.shell('find ' + prefix + " -type f -name '*.pdf' 2>/dev/null || true").splitlines())


q.seed('attachments')
q.launch()
q.unlock()
q.tap('Your data')
q.tap('Create doctor summary', scroll=True)
today = json.loads((q.OUT / 'fixtures.json').read_text())[0]['today']
for label, value in [
    ('Report start date', (date.fromisoformat(today) - timedelta(days=365)).isoformat()),
    ('Report end date', today),
]:
    q.tap(label, scroll=True)
    q.shell('input keycombination 113 29')
    q.text(value)
q.tap('Preview doctor summary', scroll=True)
q.find('Review your doctor summary', scroll=True, up=True)
for _ in range(60):
    found = q.hits(q.dump(), 'Export readable PDF')
    if any(q.box(n)[3] - q.box(n)[1] >= 35 and 60 <= q.box(n)[1] and q.box(n)[3] <= 1800 for n in found):
        break
    q.shell('input swipe 360 1500 360 400 100')
else:
    raise RuntimeError('Could not reach the end of the fictional report')

result = {'version': version, 'apkSha256': q.INSTALLED_SHA, 'fixture': 'attachments',
          'from': (date.fromisoformat(today) - timedelta(days=365)).isoformat(),
          'through': today, 'fileReadyObservedSeconds': [], 'bytes': []}
for run in range(3):
    before = paths()
    start = q.tap('Export readable PDF', scroll=True)
    while time.perf_counter() - start < 120:
        created = paths() - before
        assert len(created) <= 1
        if created:
            path = created.pop()
            assert path.startswith(prefix + '/')
            raw = q.adb('exec-out', 'cat', path)
            if b'%%EOF' in raw[-40:]:
                elapsed = round(time.perf_counter() - start, 3)
                (out / f'report-{run + 1}.pdf').write_bytes(raw)
                result['fileReadyObservedSeconds'].append(elapsed)
                result['bytes'].append(len(raw))
                print(json.dumps({'run': run + 1, 'seconds': elapsed, 'bytes': len(raw)}), flush=True)
                q.find('Sharing', contains=True)
                q.shell('input keyevent 4')
                q.find('Export readable PDF', scroll=True)
                break
        time.sleep(.1)
    else:
        raise RuntimeError('PDF export did not finish')

if args.cancel:
    before = paths()
    lock = q.find('Lock journal')
    start = q.tap('Export readable PDF', scroll=True)
    time.sleep(.2)
    q.tap_node(lock)
    q.find('Unlock journal', scroll=True)
    result['lockUiObservedSeconds'] = round(time.perf_counter() - start, 3)
    # Longer than the baseline generation: no delayed share/file after lock.
    time.sleep(20)
    assert paths() == before, 'Cancelled report left a new readable file'
    q.find('Unlock journal', scroll=True)
    result['cancelledWithoutFileOrShare'] = True

q.stopped()
q.launch()
q.find('Unlock journal', scroll=True)
assert not paths(), 'Readable PDF cache survived startup cleanup'
result['cacheClearedOnRestart'] = True
(out / 'results.json').write_text(json.dumps(result, indent=2))
print(json.dumps(result), flush=True)
