"""Guarded diagnostics for one disposable AOSP AVD; never selects a tester phone.

Requires generated fictional fixtures. UI timings include adb/UI Automator polling;
they are upper bounds, not device SLAs or JS-only benchmarks.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import time
import threading
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'artifacts/qa/native-recovery'
ADB = os.environ.get('TRIFELLE_ADB', str(Path(os.environ['LOCALAPPDATA']) / 'Android/Sdk/platform-tools/adb.exe'))
SERIAL = 'emulator-5580'
APP = 'com.liambic.cycletracker.preview'
PRIVATE = '/data/user/0/' + APP
DB = PRIVATE + '/databases/RKStorage'
DIRECTORY = PRIVATE + '/files/cycle-encrypted-journal-v1'
VAULT = 'cycle-tracker.encrypted-vault.v1'
INTENT = 'cycle-tracker.journal-operation.v1'
PASSWORD = 'Fictional native QA 2026'
INSTALLED_SHA = None

def adb(*args, check=True):
    return subprocess.run([ADB, '-s', SERIAL, *args], check=check, capture_output=True, timeout=180).stdout

def shell(command):
    return adb('shell', command).decode('utf-8').strip()

def guard():
    global INSTALLED_SHA
    assert shell('getprop ro.kernel.qemu') == '1', 'Not an emulator'
    assert adb('emu', 'avd', 'name').decode().splitlines()[0] == 'TrifelleStoreAPI36', 'Wrong AVD'
    assert shell('id -u') == '0', 'Run adb root on the disposable AVD first'
    version = json.loads((ROOT / 'package.json').read_text())['version']
    assert ('versionName=' + version) in shell('dumpsys package ' + APP), 'Unexpected installed version'
    installed = shell('pm path ' + APP).removeprefix('package:')
    assert installed.startswith('/data/app/') and installed.endswith('/base.apk') and '\n' not in installed
    INSTALLED_SHA = shell('sha256sum ' + shlex.quote(installed)).split()[0]
    assert re.fullmatch('[a-f0-9]{64}', INSTALLED_SHA)
    OUT.mkdir(parents=True, exist_ok=True)

def sql(statement):
    return shell('sqlite3 -cmd ' + shlex.quote('.timeout 1000') + ' ' + shlex.quote(DB) + ' ' + shlex.quote(statement))

def literal(value):
    return "CAST(X'" + value.encode().hex() + "' AS TEXT)"

def read(key):
    raw = sql('SELECT hex(value) FROM catalystLocalStorage WHERE key=' + literal(key) + ';')
    return bytes.fromhex(raw).decode() if raw else None

def write(key, value):
    if value is None:
        sql('DELETE FROM catalystLocalStorage WHERE key=' + literal(key) + ';')
    else:
        sql('INSERT OR REPLACE INTO catalystLocalStorage(key,value) VALUES(' + literal(key) + ',' + literal(value) + ');')

def stopped():
    shell('am force-stop ' + APP)
    assert not adb('shell', 'pidof ' + APP, check=False).strip(), 'App must be stopped before seeding'

def launch():
    shell('am start -W -n ' + APP + '/.MainActivity')

def seed(name):
    fixtures = json.loads((OUT / 'fixtures.json').read_text())
    fixture = next(x for x in fixtures if x['name'] == name and x['fictional'] is True)
    source = OUT / (name + '.cyclevault')
    raw = source.read_bytes()
    assert hashlib.sha256(raw).hexdigest() == fixture['sha256']
    assert len(raw) == fixture['encryptedBytes'] < 8 * 1024 * 1024
    stopped()
    uid = shell('stat -c %u ' + PRIVATE)
    assert uid.isdecimal() and int(uid) >= 10000
    sql('DROP TRIGGER IF EXISTS trifelle_qa_block_cleanup;')
    shell('mkdir -p ' + DIRECTORY + '; chmod 700 ' + DIRECTORY)
    adb('push', str(source), DIRECTORY + '/a.vault')
    shell('chown ' + uid + ':' + uid + ' ' + DIRECTORY + ' ' + DIRECTORY + '/a.vault; chmod 600 ' + DIRECTORY + '/a.vault; restorecon -R ' + DIRECTORY)
    shell('rm -f ' + DIRECTORY + '/b.vault')
    write(VAULT, json.dumps({'format': 'trifelle-vault-files', 'version': 1, 'state': 'active', 'slot': 'a', 'bytes': len(raw), 'digest': fixture['sha256']}, separators=(',', ':')))
    write(INTENT, None)
    print('Seeded fictional ' + name, flush=True)

def snapshot(name):
    assert re.fullmatch(r'[a-z0-9-]+', name), 'Fictional QA filename only'
    pointer = json.loads(read(VAULT))
    assert pointer['state'] == 'active' and pointer['slot'] in ['a', 'b']
    raw = adb('exec-out', 'cat', DIRECTORY + '/' + pointer['slot'] + '.vault')
    assert len(raw) == pointer['bytes'] and hashlib.sha256(raw).hexdigest() == pointer['digest']
    (OUT / (name + '.cyclevault')).write_bytes(raw)
    (OUT / (name + '-pointer.json')).write_text(json.dumps(pointer, indent=2))
    return pointer

def dump():
    adb('shell', 'uiautomator dump /sdcard/trifelle-native-qa.xml')
    raw = adb('exec-out', 'cat', '/sdcard/trifelle-native-qa.xml')
    (OUT / 'window.xml').write_bytes(raw)
    return ET.fromstring(raw)

def box(node):
    return list(map(int, re.findall(r'\d+', node.get('bounds'))))

def hits(root, label, contains=False):
    nodes = list(root.iter('node'))
    found = [n for n in nodes if n.get('content-desc') == label or (contains and label in n.get('content-desc', ''))]
    return found or [n for n in nodes if n.get('text') == label or (contains and label in n.get('text', ''))]

def find(label, scroll=False, up=False, contains=False, timeout=90):
    start = time.perf_counter()
    previous = None
    unchanged = 0
    while time.perf_counter() - start < timeout:
        root = dump()
        for node in hits(root, label, contains):
            x1, y1, x2, y2 = box(node)
            if x2 > x1 and y2-y1 >= 35 and 60 <= y1 and y2 <= 1800:
                return node
        if scroll:
            state = tuple((n.get('text'), n.get('content-desc'), n.get('bounds')) for n in root.iter('node') if n.get('text') or n.get('content-desc'))
            unchanged = unchanged + 1 if state == previous else 0
            previous = state
            if unchanged >= 2:
                up = not up
                unchanged = 0
            areas = [n for n in root.iter('node') if n.get('scrollable') == 'true' and n.get('package') == APP]
            if areas:
                area = max(areas, key=lambda n: (box(n)[2]-box(n)[0])*(box(n)[3]-box(n)[1]))
                x1, y1, x2, y2 = box(area)
                top, bottom = max(100, y1+35), min(1730, y2-35)
                # Short, slow swipes retain overlap. A full-height fling can
                # skip an entire section between UI Automator snapshots.
                high, low = top + (bottom-top)//4, top + 3*(bottom-top)//4
                a, b = (high, low) if up else (low, high)
                x = x1 + (x2-x1)//3
                shell(f'input swipe {x} {a} {x} {b} 700')
    raise RuntimeError('Could not reach ' + label)

def tap_node(node):
    x1, y1, x2, y2 = box(node)
    start = time.perf_counter()
    shell(f'input tap {(x1+x2)//2} {(y1+y2)//2}')
    return start

def tap(label, **kwargs):
    return tap_node(find(label, **kwargs))

def text(value):
    assert re.fullmatch(r'[A-Za-z0-9 ._-]+', value), 'QA text only'
    shell('input text ' + shlex.quote(value.replace(' ', '%s')))

def unlock():
    tap('Passphrase', scroll=True)
    text(PASSWORD)
    start = tap('Unlock journal', scroll=True)
    find('Calendar')
    return round(time.perf_counter() - start, 3)

def capture(name):
    assert re.fullmatch(r'[a-z0-9-]+', name), 'Fictional QA filename only'
    root = dump()
    (OUT / (name + '.xml')).write_bytes(ET.tostring(root))
    (OUT / (name + '.png')).write_bytes(adb('exec-out', 'screencap', '-p'))

def record(name, value):
    with (OUT / 'events.jsonl').open('a') as f:
        f.write(json.dumps({'time': time.time(), 'version': json.loads((ROOT/'package.json').read_text())['version'], 'apkSha256': INSTALLED_SHA, 'name': name, 'value': value}) + '\n')
    print(json.dumps({name: value}), flush=True)

def selected(label):
    start = time.perf_counter()
    while time.perf_counter() - start < 90:
        if any(n.get('selected') == 'true' for n in hits(dump(), label)):
            return
    raise RuntimeError('Tab did not become selected: ' + label)

def performance_case(name):
    seed(name)
    times = []
    for _ in range(3):
        stopped(); launch()
        times.append(unlock())
    result = {'fixture': name, 'unlockUiUpperBoundSeconds': times}
    record('unlock-samples', result)
    start = tap('Your history'); selected('Your history')
    result['historyUiUpperBoundSeconds'] = round(time.perf_counter()-start, 3)
    capture(name + '-history')
    tap('Calendar'); selected('Calendar')
    before_open = read(VAULT)
    tap(', today,', scroll=True, contains=True)
    tap('Notes', scroll=True)
    tap('Daily note', scroll=True)
    assert read(VAULT) == before_open, 'Opening the selected date should not rewrite the vault'
    shell('input keycombination 113 29')
    before = read(VAULT)
    changes = []
    done = threading.Event()
    committed = threading.Event()
    start = time.perf_counter()
    def watch():
        previous = before
        while not done.is_set():
            current = read(VAULT)
            if current != previous:
                changes.append(round(time.perf_counter()-start, 3))
                committed.set()
                previous = current
            done.wait(.1)
    observer = threading.Thread(target=watch)
    observer.start()
    try:
        text('QA-' + name)
        assert committed.wait(90), 'No committed save observed'
        find('Saved on this device')
    finally:
        done.set(); observer.join()
    assert changes, 'No committed save observed'
    result['noteCommitObservedSeconds'] = changes
    result['noteSaveUiUpperBoundSeconds'] = round(time.perf_counter()-start, 3)
    snapshot(name + '-edited')
    capture(name + '-note')
    shell('input keyevent 4')
    tap('Close daily journal')
    before_lock = read(VAULT)
    start = tap('Lock journal')
    find('Unlock journal', scroll=True)
    assert read(VAULT) == before_lock, 'Locking a saved journal should not rewrite the vault'
    result['unchangedOpenAndLockDoNotRewrite'] = True
    result['lockUiUpperBoundSeconds'] = round(time.perf_counter()-start, 3)
    stopped(); launch()
    result['reopenAfterEditUiUpperBoundSeconds'] = unlock()
    snapshot(name + '-reopened')
    record('performance', result)
    return result

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['seed', 'unlock', 'snapshot', 'capture', 'tap', 'dump', 'performance'])
    parser.add_argument('value', nargs='?')
    args = parser.parse_args()
    guard()
    if args.action == 'seed': seed(args.value); launch()
    elif args.action == 'unlock': record('unlock-ui-upper-bound-seconds', unlock())
    elif args.action == 'snapshot': print(json.dumps(snapshot(args.value)))
    elif args.action == 'capture': capture(args.value)
    elif args.action == 'tap': tap(args.value, scroll=True)
    elif args.action == 'performance': performance_case(args.value)
    else:
        for n in dump().iter('node'):
            if n.get('text') or n.get('content-desc'):
                print(json.dumps({k:n.get(k) for k in ['text','content-desc','bounds','focused']}, ensure_ascii=True))
