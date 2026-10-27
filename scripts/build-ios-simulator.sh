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

workspace=$(find "$PWD/ios" -maxdepth 1 -name '*.xcworkspace' -print -quit)
[[ -n "$workspace" ]] || { echo 'Generated Xcode workspace missing.' >&2; exit 1; }
scheme=$(basename "$workspace" .xcworkspace)
mkdir -p artifacts/ios
output="$PWD/artifacts/ios"
xcodebuild -workspace "$workspace" -scheme "$scheme" -configuration Release \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -derivedDataPath "$output/build" ARCHS=arm64 ONLY_ACTIVE_ARCH=YES \
  CODE_SIGNING_ALLOWED=NO build > "$output/xcodebuild.log" 2>&1 || {
    tail -100 "$output/xcodebuild.log"
    exit 1
  }
app=$(find "$output/build/Build/Products/Release-iphonesimulator" -maxdepth 1 -name '*.app' -print -quit)
[[ -n "$app" ]] || { echo 'Compiled app missing.' >&2; exit 1; }
version=$(node -p "JSON.parse(require('fs').readFileSync('package.json')).version")
archive="$output/trifelle-preview-$version-ios-simulator-arm64.zip"
ditto -c -k --sequesterRsrc --keepParent "$app" "$archive"
shasum -a 256 "$archive" > "$archive.sha256"
printf '%s\n' "$app" > "$output/app-path.txt"
echo "Built Apple Silicon iOS Simulator app: $archive"
echo 'This unsigned simulator app cannot be installed on an iPhone.'
