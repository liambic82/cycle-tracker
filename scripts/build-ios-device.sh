#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ "$(uname -s)" != Darwin ]]; then
  echo 'This build requires macOS, Xcode 26.4+ and CocoaPods.' >&2
  exit 1
fi
export APP_VARIANT=preview EXPO_NO_TELEMETRY=1 CI=1
pnpm check:ios-kdf
pnpm exec expo prebuild --platform ios --no-install
(cd ios && pod install)

# A free Apple Account cannot provision APNs. Local reminders need no APNs entitlement.
python3 - <<'PY'
import pathlib, plistlib
files = list(pathlib.Path('ios').glob('*/*.entitlements'))
assert files, 'Generated app entitlements missing'
for path in files:
    entitlements = plistlib.loads(path.read_bytes())
    assert 'aps-environment' not in entitlements, f'Unexpected APNs entitlement: {path}'
    assert not entitlements, f'Unreviewed signing capabilities: {path}: {list(entitlements)}'
print('Generated app requires no additional signing capabilities.')
PY

workspace=$(find "$PWD/ios" -maxdepth 1 -name '*.xcworkspace' -print -quit)
[[ -n "$workspace" ]] || { echo 'Generated Xcode workspace missing.' >&2; exit 1; }
scheme=$(basename "$workspace" .xcworkspace)
output="$PWD/artifacts/ios-device"
mkdir -p "$output"
xcodebuild -workspace "$workspace" -scheme "$scheme" -configuration Release \
  -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath "$output/build" -archivePath "$output/Trifelle.xcarchive" \
  ARCHS=arm64 ONLY_ACTIVE_ARCH=NO CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO CODE_SIGN_IDENTITY='' archive > "$output/xcodebuild.log" 2>&1 || {
    tail -100 "$output/xcodebuild.log"
    exit 1
  }
app=$(find "$output/Trifelle.xcarchive/Products/Applications" -maxdepth 1 -name '*.app' -print -quit)
[[ -n "$app" ]] || { echo 'Archived iPhone app missing.' >&2; exit 1; }
version=$(node -p "JSON.parse(require('fs').readFileSync('package.json')).version")
staging=$(mktemp -d "$output/payload.XXXXXX")
mkdir -p "$staging/Payload"
ditto "$app" "$staging/Payload/$(basename "$app")"
ipa="$output/trifelle-preview-$version-iphone-unsigned.ipa"
(cd "$staging" && ditto -c -k --keepParent Payload "$ipa")
python3 scripts/verify-ios-device.py "$ipa" "$version" > "$output/verification.json"
cat "$output/verification.json"
shasum -a 256 "$ipa" > "$ipa.sha256"
echo "Built native iPhone IPA for local signing: $ipa"
echo 'Sign and install using a free Apple Account in Sideloadly. This file is not signed yet.'
