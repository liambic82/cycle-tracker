"""Controlled failures in the guarded, disposable Trifelle AVD only.

These are native filesystem/SQLite faults and process interruptions, not a physical
power-loss, OEM backup or full-device ENOSPC test. No production test hooks are used.
"""
import importlib.util
import json
from pathlib import Path
import shlex
import sys
import time

spec = importlib.util.spec_from_file_location('nativeqa', Path(__file__).with_name('native-journal-qa.py'))
q = importlib.util.module_from_spec(spec)
spec.loader.exec_module(q)
PHOTO = 'cycle-tracker.personal-background.v1'

def verify(snapshot, fixture, note=None):
    import subprocess
    import os
    node = os.environ.get('TRIFELLE_NODE', 'node')
    args = [node, '--experimental-strip-types', str(q.ROOT / 'scripts/verify-native-journal.mjs'), snapshot, fixture]
    if note is not None: args.append(note)
    result = subprocess.run(args, cwd=q.ROOT, capture_output=True, text=True, check=True)
    q.record('integrity', json.loads(result.stdout))

def cleanup_fault(enable):
    q.sql('DROP TRIGGER IF EXISTS trifelle_qa_block_cleanup;')
    if enable:
        q.write(PHOTO, 'Fictional QA cleanup sentinel')
        q.sql("CREATE TRIGGER trifelle_qa_block_cleanup BEFORE DELETE ON catalystLocalStorage WHEN OLD.key=" + q.literal(PHOTO) + " BEGIN SELECT RAISE(FAIL, 'Fictional QA cleanup fault'); END;")

def slot_recovery():
    q.seed('near-limit')
    before = q.read(q.VAULT)
    q.shell("printf 'incomplete fictional candidate' > " + q.DIRECTORY + '/b.vault')
    q.launch(); q.unlock()
    assert q.read(q.VAULT) == before
    assert q.shell('test ! -e ' + q.DIRECTORY + '/b.vault && echo absent') == 'absent'
    q.snapshot('orphan-candidate-recovered'); verify('orphan-candidate-recovered', 'near-limit')
    q.record('orphanCandidateIgnoredAndCleaned', True)

def open_note():
    q.tap(', today,', scroll=True, contains=True)
    q.tap('Notes', scroll=True)
    q.tap('Daily note', scroll=True)
    q.shell('input keycombination 113 29')

def write_failure():
    q.seed('near-limit'); q.launch(); q.unlock()
    open_note()
    before = q.read(q.VAULT)
    q.shell('chmod 500 ' + q.DIRECTORY)
    try:
        q.text('X')
        q.find('Not saved')
        assert q.read(q.VAULT) == before
        q.snapshot('write-failure-preserved'); verify('write-failure-preserved', 'near-limit')
        q.capture('write-failure')
        # Resolve the actual filesystem denial, then use the app's visible retry.
        q.shell('chmod 700 ' + q.DIRECTORY)
        start = q.tap('Retry saving')
        q.find('Saved on this device')
        q.record('retryUiUpperBoundSeconds', round(time.perf_counter()-start, 3))
        q.snapshot('write-retry-saved'); verify('write-retry-saved', 'near-limit', 'X')
        q.stopped(); q.launch(); q.unlock()
        q.snapshot('write-retry-reopened'); verify('write-retry-reopened', 'near-limit', 'X')
        q.record('writeFailurePreservedAndRetryReopened', True)
    finally:
        q.shell('chmod 700 ' + q.DIRECTORY)

def interrupted_save():
    import subprocess
    q.seed('near-limit'); q.launch(); q.unlock(); open_note()
    before = q.read(q.VAULT)
    pointer = json.loads(before)
    candidate = 'b' if pointer['slot'] == 'a' else 'a'
    pid = q.shell('pidof ' + q.APP)
    assert pid.isdecimal()
    # The watcher runs on-device, avoiding host polling latency at the file boundary.
    command = ('for i in $(seq 1 3000); do if [ -s ' + q.DIRECTORY + '/' + candidate + '.vault ]; then kill -STOP ' + pid + '; echo stopped; exit 0; fi; sleep 0.01; done; exit 1')
    watcher = subprocess.Popen([q.ADB, '-s', q.SERIAL, 'shell', command], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    try:
        q.text('Z')
        output, error = watcher.communicate(timeout=60)
        assert watcher.returncode == 0 and b'stopped' in output, error
        assert q.read(q.VAULT) == before, 'Watcher missed the pre-commit boundary; do not count this as a pass'
        candidate_bytes = q.shell('stat -c %s ' + q.DIRECTORY + '/' + candidate + '.vault')
        assert int(candidate_bytes) > 0, 'Stop only after the candidate has written bytes'
        q.shell('kill -KILL ' + pid)
        q.stopped(); q.launch(); q.unlock()
        q.snapshot('interrupted-save-reopened'); verify('interrupted-save-reopened', 'near-limit')
        q.record('processKilledBeforeSaveCommit', {'candidateBytesAtStop': int(candidate_bytes), 'oldJournalExact': True})
    finally:
        if watcher.poll() is None: watcher.terminate()
        q.adb('shell', 'kill -CONT ' + pid, check=False)

def lock_retry():
    q.seed('near-limit'); q.launch(); q.unlock(); open_note()
    before = q.read(q.VAULT)
    q.shell('chmod 500 ' + q.DIRECTORY)
    try:
        q.text('L'); q.find('Not saved')
        q.shell('input keyevent 4'); q.tap('Close daily journal')
        q.tap('Lock journal')
        q.find('Your latest changes could not be saved. Please retry before locking.', scroll=True)
        assert q.read(q.VAULT) == before
        assert not q.hits(q.dump(), 'Unlock journal')
        q.capture('lock-retains-unsaved-journal')
        q.shell('chmod 700 ' + q.DIRECTORY)
        q.tap('Lock journal'); q.find('Unlock journal', scroll=True)
        q.snapshot('lock-retry-saved'); verify('lock-retry-saved', 'near-limit', 'L')
        q.stopped(); q.launch(); q.unlock()
        q.snapshot('lock-retry-reopened'); verify('lock-retry-reopened', 'near-limit', 'L')
        q.record('failedLockRetainsJournalAndRetrySavesBeforeClosing', True)
    finally:
        q.shell('chmod 700 ' + q.DIRECTORY)

def pending_restore():
    q.seed('near-limit')
    pointer = json.loads(q.read(q.VAULT))
    q.write(q.INTENT, json.dumps({'version': 1, 'kind': 'restore', 'digest': pointer['digest']}))
    cleanup_fault(True)
    q.launch(); q.find('Finish journal recovery', scroll=True)
    assert q.read(q.INTENT) is not None and q.read(PHOTO) is not None
    q.capture('pending-restore-cleanup')
    q.stopped(); q.launch(); q.find('Finish journal recovery', scroll=True)
    q.stopped(); cleanup_fault(False); q.launch()
    q.find('Unlock journal', scroll=True)
    assert q.read(q.INTENT) is None and q.read(PHOTO) is None
    q.unlock(); q.snapshot('restore-cleanup-recovered'); verify('restore-cleanup-recovered', 'near-limit')
    q.record('seededPostCommitRestoreCleanupRecoversAfterRestart', True)

def delete_cleanup():
    q.seed('near-limit'); q.launch(); q.unlock()
    cleanup_fault(True)
    q.tap('Your data')
    q.tap('Delete journal from this device', scroll=True)
    q.tap('Type DELETE to confirm journal deletion', scroll=True)
    q.text('DELETE')
    q.tap('Permanently delete journal', scroll=True)
    q.find('Finish journal recovery', scroll=True)
    assert q.read(q.VAULT) is None and json.loads(q.read(q.INTENT))['kind'] == 'delete'
    assert q.shell('test ! -e ' + q.DIRECTORY + '/a.vault && test ! -e ' + q.DIRECTORY + '/b.vault && echo absent') == 'absent'
    q.stopped(); q.launch(); q.find('Finish journal recovery', scroll=True)
    q.stopped(); cleanup_fault(False); q.launch()
    q.find('Create my journal', scroll=True)
    assert q.read(q.VAULT) is None and q.read(q.INTENT) is None and q.read(PHOTO) is None
    q.stopped(); q.launch(); q.find('Create my journal', scroll=True)
    q.record('actualDeleteCleanupRecoversWithoutResurrection', True)

def corrupt_active():
    q.seed('near-limit')
    before = q.read(q.VAULT)
    q.adb('push', str(q.OUT/'one-year.cyclevault'), q.DIRECTORY+'/b.vault')
    q.shell("printf 'truncated fictional active vault' > " + q.DIRECTORY+'/a.vault')
    q.launch(); q.find('Local storage could not be read.', scroll=True, contains=True)
    assert q.read(q.VAULT) == before
    assert q.shell('test -e ' + q.DIRECTORY+'/b.vault && echo present') == 'present'
    assert not q.hits(q.dump(), 'Create my journal')
    q.capture('damaged-active-no-rollback')
    q.record('damagedActiveDoesNotSilentlyUseOlderFile', True)

if __name__ == '__main__':
    actions = {'orphan': slot_recovery, 'write-failure': write_failure, 'interrupted-save': interrupted_save, 'pending-restore': pending_restore, 'delete-cleanup': delete_cleanup, 'corrupt-active': corrupt_active, 'lock-retry': lock_retry}
    if len(sys.argv) != 2 or sys.argv[1] not in actions: raise SystemExit('Choose: ' + ', '.join(actions))
    q.guard()
    actions[sys.argv[1]]()
