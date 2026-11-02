"""Exercise local Android export UI with fictional data; never choose a recipient."""
import importlib.util
import json
from pathlib import Path
import shlex
import time
from datetime import date, timedelta

spec=importlib.util.spec_from_file_location('nativeqa', Path(__file__).with_name('native-journal-qa.py'))
q=importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)

def exported(kind, suffix, target, start):
    prefix=q.PRIVATE+'/cache/'+kind
    for _ in range(600):
        paths=q.shell('find '+prefix+' -type f -name '+shlex.quote('*'+suffix)+' 2>/dev/null || true').splitlines()
        for p in paths:
            assert p.startswith(prefix+'/')
            raw=q.adb('exec-out','cat',p)
            if suffix=='.cyclevault':
                try: json.loads(raw)
                except ValueError: continue
            elif suffix=='.pdf' and b'%%EOF' not in raw[-40:]: continue
            if not raw: continue
            elapsed=round(time.perf_counter()-start,3)
            (q.OUT/target).write_bytes(raw)
            q.record('export',{'name':target,'bytes':len(raw),'fileReadyObservedSeconds':elapsed})
            q.capture(target.replace('.','-')+'-chooser')
            q.shell('input keyevent 4')
            q.find('Your data')
            return
        time.sleep(.1)
    raise RuntimeError('Export file not created')

q.guard()
q.seed('attachments'); q.launch(); q.unlock()
q.tap('Your data')
start=q.tap('Download encrypted backup',scroll=True)
exported('cycle-text-exports','.cyclevault','attachments-exported.cyclevault',start)
q.tap('Export CSV',scroll=True)
start=q.tap('Export readable CSV',scroll=True)
exported('cycle-text-exports','.csv','attachments-exported.csv',start)
q.tap('Create doctor summary',scroll=True,up=True)
q.tap('Report start date',scroll=True)
q.shell('input keycombination 113 29')
today=json.loads((q.OUT/'fixtures.json').read_text())[0]['today']
q.text((date.fromisoformat(today)-timedelta(days=365)).isoformat())
q.tap('Preview doctor summary',scroll=True)
q.find('Review your doctor summary',scroll=True,up=True)
# The export action is at the end of the reviewed report. A 366-day preview can
# be many phone screens long: fling toward the end, then locate the control.
for _ in range(60):
    found = q.hits(q.dump(), 'Export readable PDF')
    if any(q.box(n)[3] - q.box(n)[1] >= 35 and 60 <= q.box(n)[1] and q.box(n)[3] <= 1800 for n in found): break
    q.shell('input swipe 360 1500 360 400 100')
else: raise RuntimeError('Could not reach the end of the fictional report')
start=q.tap('Export readable PDF',scroll=True,timeout=180)
exported('cycle-report-exports','.pdf','attachments-report-366-days.pdf',start)
q.stopped(); q.launch(); q.find('Unlock journal',scroll=True)
assert q.shell('test ! -d '+q.PRIVATE+'/cache/cycle-text-exports && test ! -d '+q.PRIVATE+'/cache/cycle-report-exports && echo absent')=='absent'
q.record('exportCachesRemovedOnRestart',True)
