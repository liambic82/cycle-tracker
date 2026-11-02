"""Restore an actual fictional Android backup through the system document picker."""
import importlib.util
from pathlib import Path
import time

spec = importlib.util.spec_from_file_location('native_recovery', Path(__file__).with_name('native-journal-recovery.py'))
r = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r)
q = r.q

q.guard()
source = q.OUT / 'attachments-exported.cyclevault'
assert source.is_file(), 'Run and verify native export checks first'
r.verify('attachments-exported', 'attachments')
q.seed('one-year')
before = q.read(q.VAULT)
q.write(r.PHOTO, 'Fictional prior photo sentinel')
destination = '/sdcard/Download/trifelle-qa-attachments.cyclevault'
q.adb('push', str(source), destination)
q.launch()
q.tap('Restore a backup', scroll=True)
q.tap('Show roots')
q.tap('Downloads')
# Exact filename selects the document; a substring also matches Android's
# separate "Preview the file ..." affordance, which does not return a file.
q.tap('trifelle-qa-attachments.cyclevault', scroll=True)
q.tap('Passphrase', scroll=True)
q.text('Fictional wrong passphrase')
q.tap('I have saved what I need', scroll=True)
q.tap('Restore journal', scroll=True)
q.find('The passphrase is incorrect', contains=True, scroll=True)
assert q.read(q.VAULT) == before and q.read(r.PHOTO) == 'Fictional prior photo sentinel'
q.snapshot('wrong-passphrase-preserved'); r.verify('wrong-passphrase-preserved', 'one-year')
q.record('actualWrongPassphraseRestorePreservesPriorJournalAndPhoto', True)
q.tap('Passphrase', scroll=True, up=True)
q.text(q.PASSWORD)
start = q.tap('Restore journal', scroll=True)
q.find('Calendar')
q.record('actualAttachmentRestoreUiUpperBoundSeconds', round(time.perf_counter()-start, 3))
assert q.read(q.INTENT) is None and q.read(r.PHOTO) is None
q.snapshot('actual-restored'); r.verify('actual-restored', 'attachments')
q.stopped(); q.launch(); q.unlock()
q.snapshot('actual-restored-reopened'); r.verify('actual-restored-reopened', 'attachments')
q.record('actualExportRestoreAndRestartPreserveAllAttachments', True)
q.shell('rm -f ' + destination)
