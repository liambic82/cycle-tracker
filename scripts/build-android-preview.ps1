param(
    [string]$SdkPath = (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
    [string]$JdkPath = 'C:\Program Files\Java\jdk-22',
    [ValidateSet('arm64-v8a', 'x86_64')][string]$Architecture = 'arm64-v8a'
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSigning = Join-Path $taskRoot '.tools\android-signing'
$taskKeystore = Join-Path $taskSigning 'preview.keystore'
$taskCredentials = Join-Path $taskSigning 'preview.json'
$taskOutput = Join-Path $taskRoot 'artifacts\android'
$taskKeytool = Join-Path $JdkPath 'bin\keytool.exe'
$taskBuildRoot = [IO.Path]::GetFullPath((Join-Path $env:USERPROFILE '.ct-android'))
$taskBuildMarker = Join-Path $taskBuildRoot '.cycle-tracker-build.json'

if (!(Test-Path -LiteralPath (Join-Path $SdkPath 'platform-tools\adb.exe'))) {
    throw 'Android SDK platform tools were not found. Pass -SdkPath with your installed SDK.'
}
if (!(Test-Path -LiteralPath $taskKeytool)) {
    throw 'A Java development kit was not found. Pass -JdkPath with your installed JDK.'
}

$taskEnvNames = @('ANDROID_HOME', 'JAVA_HOME', 'PATH', 'APP_VARIANT', 'EXPO_NO_TELEMETRY', 'NODE_ENV',
    'CYCLE_PREVIEW_KEYSTORE', 'CYCLE_PREVIEW_STORE_PASSWORD', 'CYCLE_PREVIEW_KEY_ALIAS')
$taskOriginalEnv = @{}
foreach ($taskName in $taskEnvNames) { $taskOriginalEnv[$taskName] = [Environment]::GetEnvironmentVariable($taskName, 'Process') }

Push-Location $taskRoot
try {
    $env:ANDROID_HOME = $SdkPath
    $env:JAVA_HOME = $JdkPath
    $env:PATH = (Join-Path $JdkPath 'bin') + [IO.Path]::PathSeparator + $env:PATH
    $env:APP_VARIANT = 'preview'
    $env:EXPO_NO_TELEMETRY = '1'
    $env:NODE_ENV = 'production'

    New-Item -ItemType Directory -Force -Path $taskSigning, $taskOutput | Out-Null
    if ((Test-Path -LiteralPath $taskKeystore) -ne (Test-Path -LiteralPath $taskCredentials)) {
        throw 'Preview signing files are incomplete. Restore the original pair before building an update.'
    }
    if (!(Test-Path -LiteralPath $taskKeystore)) {
        $taskBytes = New-Object byte[] 32
        $taskRandom = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $taskRandom.GetBytes($taskBytes) } finally { $taskRandom.Dispose() }
        $taskSecret = [Convert]::ToBase64String($taskBytes)
        [Array]::Clear($taskBytes, 0, $taskBytes.Length)
        $env:CYCLE_PREVIEW_STORE_PASSWORD = $taskSecret
        & $taskKeytool -genkeypair -keystore $taskKeystore -storetype PKCS12 -alias cycle-preview `
            -storepass:env CYCLE_PREVIEW_STORE_PASSWORD -keypass:env CYCLE_PREVIEW_STORE_PASSWORD `
            -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Cycle Tracker Internal Preview' -noprompt
        if ($LASTEXITCODE -ne 0) { throw 'Preview signing key generation failed.' }
        @{ password = $taskSecret; alias = 'cycle-preview' } | ConvertTo-Json | Set-Content -LiteralPath $taskCredentials -Encoding utf8
    }
    $taskSigningData = Get-Content -LiteralPath $taskCredentials -Raw | ConvertFrom-Json
    $env:CYCLE_PREVIEW_KEYSTORE = $taskKeystore
    $env:CYCLE_PREVIEW_STORE_PASSWORD = $taskSigningData.password
    $env:CYCLE_PREVIEW_KEY_ALIAS = $taskSigningData.alias

    # CMake/Ninja impose path limits; Expo resolves drive aliases back to their long physical paths.
    # Use a dedicated short build cache, and copy only application/build inputs into it.
    if (Test-Path -LiteralPath $taskBuildRoot) {
        if (!(Test-Path -LiteralPath $taskBuildMarker)) { throw 'The short build directory already exists without this project marker.' }
        $taskMarker = Get-Content -LiteralPath $taskBuildMarker -Raw | ConvertFrom-Json
        if ($taskMarker.source -ne $taskRoot) { throw 'The short build directory belongs to another project.' }
    } else {
        New-Item -ItemType Directory -Path $taskBuildRoot | Out-Null
        @{ source = $taskRoot } | ConvertTo-Json | Set-Content -LiteralPath $taskBuildMarker -Encoding utf8
    }
    foreach ($taskFile in @('App.tsx', 'index.ts', 'app.json', 'app.config.ts', 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', 'tsconfig.json')) {
        Copy-Item -LiteralPath (Join-Path $taskRoot $taskFile) -Destination (Join-Path $taskBuildRoot $taskFile) -Force
    }
    foreach ($taskFolder in @('src', 'public', 'scripts', 'assets', 'plugins')) {
        $taskTarget = [IO.Path]::GetFullPath((Join-Path $taskBuildRoot $taskFolder))
        if (!$taskTarget.StartsWith($taskBuildRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe build cache target.' }
        if (Test-Path -LiteralPath $taskTarget) { Remove-Item -LiteralPath $taskTarget -Recurse -Force }
        $taskSource = Join-Path $taskRoot $taskFolder
        if (Test-Path -LiteralPath $taskSource) { Copy-Item -LiteralPath $taskSource -Destination $taskTarget -Recurse }
    }
    Set-Location $taskBuildRoot
    & (Join-Path $PSScriptRoot 'pnpm.ps1') install --frozen-lockfile --prefer-offline --prod=false
    if ($LASTEXITCODE -ne 0) { throw 'Build cache dependency installation failed.' }

    & node node_modules/expo/bin/cli prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android project generation failed.' }

    Push-Location (Join-Path $taskBuildRoot 'android')
    try {
        & .\gradlew.bat :app:assembleRelease --no-daemon --console=plain --max-workers=2 `
            '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m' `
            "-PreactNativeArchitectures=$Architecture" `
            --init-script (Join-Path $PSScriptRoot 'android-preview.init.gradle')
        if ($LASTEXITCODE -ne 0) { throw 'Android APK compilation failed.' }
    } finally { Pop-Location }

    $taskVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
    $taskApk = Join-Path $taskOutput "cycle-tracker-preview-$taskVersion-$Architecture.apk"
    Copy-Item -LiteralPath 'android\app\build\outputs\apk\release\app-release.apk' -Destination $taskApk
    $taskHash = (Get-FileHash -LiteralPath $taskApk -Algorithm SHA256).Hash.ToLowerInvariant()
    "$taskHash  $([IO.Path]::GetFileName($taskApk))" | Set-Content -LiteralPath "$taskApk.sha256" -Encoding ascii
    Write-Output "Android preview ready: $taskApk"
    Write-Output "SHA-256: $taskHash"
} finally {
    foreach ($taskName in $taskEnvNames) { [Environment]::SetEnvironmentVariable($taskName, $taskOriginalEnv[$taskName], 'Process') }
    $taskSecret = $null
    $taskSigningData = $null
    Pop-Location
}
