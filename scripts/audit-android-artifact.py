"""Read-only checks on the actual Android Release artifact; no device pass implied."""
import argparse
import hashlib
import json
import re
import struct
import subprocess
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET


def command(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True, encoding="utf-8").stdout


def require(condition, message):
    if not condition:
        raise ValueError(message)


def audit(args):
    artifact = Path(args.artifact)
    bundle = artifact.suffix == ".aab"
    prefix = "base/" if bundle else ""
    with zipfile.ZipFile(artifact) as archive:
        require(archive.testzip() is None, "ZIP CRC failure")
        config = json.loads(archive.read(prefix + "assets/app.config"))
        require(config["android"]["package"] == args.package, "Unexpected embedded package")
        require(config["version"] == args.version, "Unexpected embedded version")
        require(config["android"]["versionCode"] == args.code, "Unexpected embedded version code")
        require(config["extra"]["allowPreviewScreenshots"] == args.preview, "Screenshot policy mismatch")
        if bundle:
            command(args.java, "-jar", args.bundletool, "validate", "--bundle=" + str(artifact))
            xml = command(args.java, "-jar", args.bundletool, "dump", "manifest", "--bundle=" + str(artifact))
            root = ET.fromstring(xml)
            ns = "{http://schemas.android.com/apk/res/android}"
            require(root.get("package") == args.package, "Manifest package mismatch")
            require(root.get(ns + "versionCode") == str(args.code), "Manifest code mismatch")
            require(root.get(ns + "versionName") == args.version, "Manifest version mismatch")
            permissions = {e.get(ns + "name") for e in root.findall("uses-permission")}
            app = root.find("application")
            require(app is not None, "No application")
            require(app.get(ns + "debuggable", "false") == "false", "Debuggable artifact")
            require(app.get(ns + "allowBackup") == "false", "Backup is enabled")
            require(app.get(ns + "usesCleartextTraffic") == "false", "Cleartext is enabled")
            metadata = {e.get(ns + "name"): e.get(ns + "value") for e in app.findall("meta-data")}
            for name in ["firebase_messaging_auto_init_enabled", "firebase_analytics_collection_enabled", "firebase_data_collection_default_enabled", "expo.modules.updates.ENABLED"]:
                require(metadata.get(name) == "false", name + " must be disabled")
            components = {e.get(ns + "name") for e in app}
            require("com.google.firebase.provider.FirebaseInitProvider" not in components, "Firebase auto-init provider retained")
            require("expo.modules.notifications.service.NotificationsService" in components, "Local notification receiver missing")
            require(root.find("uses-sdk").get(ns + "targetSdkVersion") == "36", "Unexpected target API")
        else:
            permissions = set(re.findall(r"uses-permission: name='([^']+)'", command(args.aapt, "dump", "permissions", str(artifact))))
            xml = command(args.aapt, "dump", "xmltree", str(artifact), "AndroidManifest.xml")
            require(re.search(r"android:allowBackup[^\n]+=\(type 0x12\)0x0", xml), "Backup is enabled")
            require(re.search(r"android:usesCleartextTraffic[^\n]+=\(type 0x12\)0x0", xml), "Cleartext is enabled")
            require(not re.search(r"android:debuggable[^\n]+=\(type 0x12\)0xffffffff", xml), "Debuggable artifact")
            require("com.google.firebase.provider.FirebaseInitProvider" not in xml, "Firebase auto-init provider retained")
            require("expo.modules.notifications.service.NotificationsService" in xml, "Local notification receiver missing")
            domains = ["root", "file", "database", "sharedpref", "external", "device_root", "device_file", "device_database", "device_sharedpref"]
            resources = command(args.aapt, "dump", "--values", "resources", str(artifact))
            for filename, count in [("trifelle_backup_rules.xml", 1), ("trifelle_data_extraction_rules.xml", 2)]:
                # AGP optimizes resource filenames. Resolve the compiled resource table.
                match = re.search(r"resource [^\n]+:xml/" + re.escape(filename[:-4]) + r':[^\n]+\n\s+\(string8\) "([^"]+)"', resources)
                require(match is not None, "Backup rules missing from resource table")
                rules = command(args.aapt, "dump", "xmltree", str(artifact), match.group(1))
                require("E: include" not in rules, "Unexpected backup inclusion")
                require(rules.count("E: exclude") == len(domains) * count, "Missing backup exclusions")
                for domain in domains:
                    require(len(re.findall(r'domain="' + domain + r'"', rules)) == count, "Missing backup domain " + domain)
                require(len(re.findall(r'path="\."', rules)) == len(domains) * count, "Backup exclusions must cover entire domains")
            command(args.zipalign, "-c", "-P", "16", "4", str(artifact))
        forbidden = {"android.permission.INTERNET", "android.permission.ACCESS_NETWORK_STATE", "android.permission.READ_EXTERNAL_STORAGE", "android.permission.WRITE_EXTERNAL_STORAGE", "android.permission.READ_MEDIA_IMAGES", "android.permission.SYSTEM_ALERT_WINDOW", "com.google.android.c2dm.permission.RECEIVE", "com.google.android.finsky.permission.BIND_GET_INSTALL_REFERRER_SERVICE", "android.permission.health.READ_HEALTH_DATA_IN_BACKGROUND"}
        require(not permissions & forbidden, "Unexpected permissions: " + str(sorted(permissions & forbidden)))
        allowed = {"android.permission.VIBRATE", "android.permission.health.READ_SLEEP", "android.permission.health.READ_HEALTH_DATA_HISTORY", "android.permission.RECEIVE_BOOT_COMPLETED", "android.permission.POST_NOTIFICATIONS", "android.permission.DETECT_SCREEN_CAPTURE", "android.permission.USE_BIOMETRIC", "android.permission.USE_FINGERPRINT", "android.permission.WAKE_LOCK", args.package + ".DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"}
        require(not permissions - allowed, "Unreviewed permissions: " + str(sorted(permissions - allowed)))
        require({p for p in permissions if ".health." in p} == {"android.permission.health.READ_SLEEP", "android.permission.health.READ_HEALTH_DATA_HISTORY"}, "Health access changed")
        require("android.permission.POST_NOTIFICATIONS" in permissions, "Reminder permission missing")
        libraries = [name for name in archive.namelist() if name.startswith(prefix + "lib/") and name.endswith(".so")]
        require(bool(libraries), "No native libraries")
        abis = set()
        for name in libraries:
            abis.add(name.split("/")[-2])
            data = archive.read(name)
            require(data[:6] == b"\x7fELF\x02\x01", "Expected little-endian ELF64: " + name)
            phoff = struct.unpack_from("<Q", data, 32)[0]
            phsize, phcount = struct.unpack_from("<HH", data, 54)
            require(phsize >= 56 and phoff + phsize * phcount <= len(data), "Invalid ELF program headers")
            loads = 0
            for index in range(phcount):
                offset = phoff + index * phsize
                if struct.unpack_from("<I", data, offset)[0] == 1:
                    loads += 1
                    file_offset, virtual = struct.unpack_from("<QQ", data, offset + 8)
                    alignment = struct.unpack_from("<Q", data, offset + 48)[0]
                    require(alignment >= 16384 and (virtual - file_offset) % 16384 == 0, "ELF not 16 KiB aligned: " + name)
            require(loads > 0, "No load segments: " + name)
        if bundle:
            require(abis == {"arm64-v8a", "x86_64"}, "Unexpected bundle ABIs")
        return {"artifact": artifact.name, "bytes": artifact.stat().st_size, "sha256": hashlib.file_digest(artifact.open("rb"), "sha256").hexdigest(), "package": args.package, "version": args.version, "code": args.code, "preview_screenshots": args.preview, "direct_internet_permission": False, "native_libraries": len(libraries), "abis": sorted(abis), "elf_16k_alignment": "pass", "device_runtime": "not tested"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("artifact")
    parser.add_argument("--package", default="com.liambic.cycletracker")
    parser.add_argument("--version", required=True)
    parser.add_argument("--code", type=int, required=True)
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--aapt", default="aapt")
    parser.add_argument("--zipalign", default="zipalign")
    parser.add_argument("--java", default="java")
    parser.add_argument("--bundletool", default=".tools/bundletool-all-1.18.3.jar")
    print(json.dumps(audit(parser.parse_args()), indent=2))
