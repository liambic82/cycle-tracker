"""Audit the actual IPA; a simulator ARM64 executable is not an iPhone build."""

import hashlib
import json
import pathlib
import plistlib
import struct
import sys
import zipfile


def device_binary(data, name):
    # Xcode's device archive should contain thin ARM64 binaries, including frameworks.
    assert data[:4] == b'\xcf\xfa\xed\xfe', f'{name}: expected thin 64-bit Mach-O'
    _, cpu, _, _, count, size, _, _ = struct.unpack_from('<IiiIIIII', data)
    assert cpu == 0x0100000C, f'{name}: expected ARM64'
    offset = 32
    end = offset + size
    assert end <= len(data), f'{name}: truncated load commands'
    platforms = []
    for _ in range(count):
        command, length = struct.unpack_from('<II', data, offset)
        assert length >= 8 and offset + length <= end, f'{name}: invalid command'
        if command == 0x32:  # LC_BUILD_VERSION; 2 = physical iOS, 7 = Simulator
            platforms.append(struct.unpack_from('<I', data, offset + 8)[0])
        elif command == 0x25:  # LC_VERSION_MIN_IPHONEOS in older bundled libraries
            platforms.append(2)
        elif command == 0x2C:  # LC_ENCRYPTION_INFO_64
            assert struct.unpack_from('<I', data, offset + 16)[0] == 0, f'{name}: encrypted binary'
        offset += length
    assert offset == end, f'{name}: mismatched command size'
    assert platforms and set(platforms) == {2}, f'{name}: not built for physical iOS: {platforms}'


def verify(path, expected_version):
    with zipfile.ZipFile(path) as archive:
        assert archive.testzip() is None, 'Corrupt ZIP member'
        names = archive.namelist()
        assert all(not name.startswith('/') and '..' not in pathlib.PurePosixPath(name).parts for name in names)
        roots = {name.split('/')[1] for name in names if name.startswith('Payload/') and len(name.split('/')) > 1 and name.split('/')[1].endswith('.app')}
        assert len(roots) == 1, f'Expected one app under Payload: {roots}'
        root = f'Payload/{roots.pop()}/'
        info = plistlib.loads(archive.read(root + 'Info.plist'))
        assert info['CFBundleSupportedPlatforms'] == ['iPhoneOS'], 'Simulator platform in Info.plist'
        assert info['DTPlatformName'] == 'iphoneos', 'Wrong SDK platform'
        assert info['CFBundleIdentifier'] == 'com.liambic.cycletracker.preview', 'Wrong app identity'
        assert info['CFBundleShortVersionString'] == expected_version, 'Wrong app version'
        assert info.get('NSFaceIDUsageDescription'), 'Missing Face ID usage description'
        assert 'remote-notification' not in info.get('UIBackgroundModes', []), 'Remote push not supported'
        assert root + 'main.jsbundle' in names, 'Missing standalone JavaScript bundle'
        assert archive.getinfo(root + 'main.jsbundle').file_size > 100_000, 'Empty JavaScript bundle'
        assert not any('/PlugIns/' in name for name in names), 'Unreviewed app extension'
        assert not any(name.endswith(('.mobileprovision', '.p12', '.p8')) for name in names), 'Signing material in unsigned package'
        binaries = [root + info['CFBundleExecutable']]
        for name in names:
            parts = pathlib.PurePosixPath(name).parts
            if name.endswith('.dylib') or (len(parts) >= 2 and parts[-2].endswith('.framework') and parts[-1] == parts[-2][:-10]):
                binaries.append(name)
        for name in binaries:
            device_binary(archive.read(name), name)
        return {
            'file': path.name,
            'bytes': path.stat().st_size,
            'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
            'name': info['CFBundleDisplayName'],
            'bundleIdentifier': info['CFBundleIdentifier'],
            'version': info['CFBundleShortVersionString'],
            'build': info['CFBundleVersion'],
            'minimumIOS': info['MinimumOSVersion'],
            'platform': 'iPhoneOS',
            'architecture': 'arm64',
            'nativeBinariesChecked': len(binaries),
            'bundledJavaScript': True,
            'signing': 'Unsigned: must be signed locally before installation',
            'physicalDeviceValidation': 'Pending',
        }


if __name__ == '__main__':
    print(json.dumps(verify(pathlib.Path(sys.argv[1]), sys.argv[2]), indent=2))
