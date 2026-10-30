param(
    [string]$SdkPath = (Join-Path $env:LOCALAPPDATA 'Android\Sdk'),
    [string]$JdkPath = 'C:\Program Files\Java\jdk-22',
    [switch]$CreateUploadKey
)

$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskSigning = Join-Path $taskRoot '.tools\android-signing\store-upload'
$taskKeystore = Join-Path $taskSigning 'upload.keystore'
$taskPasswordFile = Join-Path $taskSigning 'password.dpapi'
$taskOutput = Join-Path $taskRoot 'artifacts\android-store'
$taskKeytool = Join-Path $JdkPath 'bin\keytool.exe'
$taskBuildRoot = [IO.Path]::GetFullPath((Join-Path $env:USERPROFILE '.ct-store'))
$taskBuildMarker = Join-Path $taskBuildRoot '.cycle-tracker-build.json'
if (!(Test-Path -LiteralPath (Join-Path $SdkPath 'platform-tools\adb.exe'))) { throw 'Android SDK not found.' }
if (!(Test-Path -LiteralPath $taskKeytool)) { throw 'Java development kit not found.' }
if ($env:OS -ne 'Windows_NT') { throw 'This helper uses Windows DPAPI for upload-key credentials.' }

$taskEnvNames = @('ANDROID_HOME','JAVA_HOME','PATH','APP_VARIANT','EXPO_NO_TELEMETRY','NODE_ENV','TRIFELLE_UPLOAD_KEYSTORE','TRIFELLE_UPLOAD_PASSWORD')
$taskOriginalEnv = @{}
foreach ($taskName in $taskEnvNames) { $taskOriginalEnv[$taskName] = [Environment]::GetEnvironmentVariable($taskName, 'Process') }
Push-Location $taskRoot
try {
    $env:ANDROID_HOME = $SdkPath
    $env:JAVA_HOME = $JdkPath
    $env:PATH = (Join-Path $JdkPath 'bin') + [IO.Path]::PathSeparator + $env:PATH
    $env:APP_VARIANT = 'production'
    $env:EXPO_NO_TELEMETRY = '1'
    $env:NODE_ENV = 'production'
    New-Item -ItemType Directory -Force -Path $taskSigning, $taskOutput | Out-Null
    if ((Test-Path -LiteralPath $taskKeystore) -ne (Test-Path -LiteralPath $taskPasswordFile)) {
        throw 'Upload signing files are incomplete. Restore the pair; never replace an established key.'
    }
    if (!(Test-Path -LiteralPath $taskKeystore)) {
        if (!$CreateUploadKey) { throw 'No upload key exists. Use -CreateUploadKey only for the initial setup.' }
        $taskBytes = New-Object byte[] 32
        $taskRandom = [Security.Cryptography.RandomNumberGenerator]::Create()
        try { $taskRandom.GetBytes($taskBytes) } finally { $taskRandom.Dispose() }
        $env:TRIFELLE_UPLOAD_PASSWORD = [Convert]::ToBase64String($taskBytes)
        [Array]::Clear($taskBytes, 0, $taskBytes.Length)
        & $taskKeytool -genkeypair -keystore $taskKeystore -storetype PKCS12 -alias trifelle-upload `
            -storepass:env TRIFELLE_UPLOAD_PASSWORD -keypass:env TRIFELLE_UPLOAD_PASSWORD `
            -keyalg RSA -keysize 3072 -validity 10000 -dname 'CN=Trifelle Upload' -noprompt
        if ($LASTEXITCODE -ne 0) { throw 'Upload key creation failed.' }
        $taskSecure = ConvertTo-SecureString -String $env:TRIFELLE_UPLOAD_PASSWORD -AsPlainText -Force
        $taskSecure | ConvertFrom-SecureString | Set-Content -LiteralPath $taskPasswordFile -Encoding ascii
        $taskSecure.Dispose()
    }
    $taskSecure = (Get-Content -LiteralPath $taskPasswordFile -Raw).Trim() | ConvertTo-SecureString
    try { $env:TRIFELLE_UPLOAD_PASSWORD = [Net.NetworkCredential]::new('', $taskSecure).Password } finally { $taskSecure.Dispose() }
    $env:TRIFELLE_UPLOAD_KEYSTORE = $taskKeystore
    & $taskKeytool -exportcert -rfc -keystore $taskKeystore -alias trifelle-upload -storepass:env TRIFELLE_UPLOAD_PASSWORD -file (Join-Path $taskOutput 'upload-certificate.pem')
    if ($LASTEXITCODE -ne 0) { throw 'Upload certificate verification failed.' }

    # Guard every recursive replacement with the fixed cache path and source marker.
    if (Test-Path -LiteralPath $taskBuildRoot) {
        if (!(Test-Path -LiteralPath $taskBuildMarker)) { throw 'Store build cache lacks a project marker.' }
        $taskMarker = Get-Content -LiteralPath $taskBuildMarker -Raw | ConvertFrom-Json
        if ($taskMarker.source -ne $taskRoot -or $taskMarker.variant -ne 'store') { throw 'Store build cache belongs to another task.' }
    } else {
        New-Item -ItemType Directory -Path $taskBuildRoot | Out-Null
        @{ source = $taskRoot; variant = 'store' } | ConvertTo-Json | Set-Content -LiteralPath $taskBuildMarker -Encoding utf8
    }
    foreach ($taskFile in @('App.tsx','index.ts','app.json','app.config.ts','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','tsconfig.json','metro.config.cjs','.prettierrc.json')) {
        Copy-Item -LiteralPath (Join-Path $taskRoot $taskFile) -Destination (Join-Path $taskBuildRoot $taskFile) -Force
    }
    foreach ($taskFolder in @('src','public','scripts','assets','plugins','modules')) {
        $taskTarget = [IO.Path]::GetFullPath((Join-Path $taskBuildRoot $taskFolder))
        if (!$taskTarget.StartsWith($taskBuildRoot + '\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Unsafe store build cache target.' }
        if (Test-Path -LiteralPath $taskTarget) { Remove-Item -LiteralPath $taskTarget -Recurse -Force }
        Copy-Item -LiteralPath (Join-Path $taskRoot $taskFolder) -Destination $taskTarget -Recurse
    }
    Set-Location $taskBuildRoot
    & (Join-Path $PSScriptRoot 'pnpm.ps1') install --frozen-lockfile --prefer-offline --prod=false
    if ($LASTEXITCODE -ne 0) { throw 'Store dependencies failed.' }
    & node scripts/build-privacy-pages.mjs --check
    if ($LASTEXITCODE -ne 0) { throw 'Generated privacy text is stale.' }
    & node node_modules/expo/bin/cli prebuild --platform android --no-install
    if ($LASTEXITCODE -ne 0) { throw 'Android project generation failed.' }
    Push-Location (Join-Path $taskBuildRoot 'android')
    try {
        & .\gradlew.bat :app:bundleRelease :app:assembleRelease --no-daemon --console=plain --max-workers=2 `
            '-Dorg.gradle.jvmargs=-Xmx4096m -XX:MaxMetaspaceSize=1024m' '-PreactNativeArchitectures=arm64-v8a,x86_64' `
            --init-script (Join-Path $PSScriptRoot 'android-store.init.gradle')
        if ($LASTEXITCODE -ne 0) { throw 'Store bundle compilation failed.' }
    } finally { Pop-Location }
    $taskVersion = (Get-Content package.json -Raw | ConvertFrom-Json).version
    $taskArtifacts = @{
        "trifelle-$taskVersion-upload.aab" = 'android\app\build\outputs\bundle\release\app-release.aab'
        "trifelle-$taskVersion-store-local-test.apk" = 'android\app\build\outputs\apk\release\app-release.apk'
    }
    foreach ($taskName in $taskArtifacts.Keys) {
        $taskDestination = Join-Path $taskOutput $taskName
        Copy-Item -LiteralPath $taskArtifacts[$taskName] -Destination $taskDestination -Force
        $taskHash = (Get-FileHash -LiteralPath $taskDestination -Algorithm SHA256).Hash.ToLowerInvariant()
        "$taskHash  $taskName" | Set-Content -LiteralPath "$taskDestination.sha256" -Encoding ascii
        Write-Output "Built: $taskDestination"
        Write-Output "SHA-256: $taskHash"
    }
    Write-Output 'Not uploaded. The local-test APK uses the upload certificate, not a future Play App Signing certificate.'
    Write-Output 'Upload key credentials use this Windows user/machine DPAPI. Arrange a separate recoverable secret backup before first Play upload.'
} finally {
    foreach ($taskName in $taskEnvNames) { [Environment]::SetEnvironmentVariable($taskName, $taskOriginalEnv[$taskName], 'Process') }
    Pop-Location
}
