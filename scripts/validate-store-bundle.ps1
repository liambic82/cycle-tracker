param(
    [Parameter(Mandatory=$true)][string]$Bundle,
    [string]$JdkPath = 'C:\Program Files\Java\jdk-22'
)
$ErrorActionPreference = 'Stop'
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskTool = Join-Path $taskRoot '.tools\bundletool-all-1.18.3.jar'
if (!(Test-Path -LiteralPath $taskTool)) { throw 'Download the official bundletool 1.18.3 JAR into .tools first; see the release build guide.' }
if ((Get-FileHash -LiteralPath $taskTool -Algorithm SHA256).Hash.ToLowerInvariant() -ne 'a099cfa1543f55593bc2ed16a70a7c67fe54b1747bb7301f37fdfd6d91028e29') { throw 'bundletool checksum mismatch.' }
$taskBundle = (Resolve-Path -LiteralPath $Bundle).Path
$taskOutput = Join-Path $taskRoot 'artifacts\android-store'
$taskName = [IO.Path]::GetFileNameWithoutExtension($taskBundle)
$taskApks = Join-Path $taskOutput "$taskName.apks"
$taskApk = Join-Path $taskOutput "$taskName-bundletool-universal.apk"
$taskKeyRoot = Join-Path $taskRoot '.tools\android-signing\store-upload'
$taskSecure = (Get-Content -LiteralPath (Join-Path $taskKeyRoot 'password.dpapi') -Raw).Trim() | ConvertTo-SecureString
try { $taskPassword = [Net.NetworkCredential]::new('', $taskSecure).Password } finally { $taskSecure.Dispose() }
$taskProcess = [Diagnostics.Process]::new()
try {
    $taskProcess.StartInfo.FileName = Join-Path $JdkPath 'bin\java.exe'
    $taskProcess.StartInfo.UseShellExecute = $false
    $taskProcess.StartInfo.CreateNoWindow = $true
    $taskProcess.StartInfo.RedirectStandardInput = $true
    $taskProcess.StartInfo.RedirectStandardOutput = $true
    $taskProcess.StartInfo.RedirectStandardError = $true
    foreach ($taskArg in @('-jar',$taskTool,'build-apks',"--bundle=$taskBundle","--output=$taskApks",'--mode=universal','--overwrite',"--ks=$(Join-Path $taskKeyRoot 'upload.keystore')",'--ks-key-alias=trifelle-upload')) {
        $taskProcess.StartInfo.ArgumentList.Add($taskArg)
    }
    [void]$taskProcess.Start()
    $taskOut = $taskProcess.StandardOutput.ReadToEndAsync()
    $taskErr = $taskProcess.StandardError.ReadToEndAsync()
    # Supply the key password through stdin, never command arguments or a plaintext file.
    $taskProcess.StandardInput.WriteLine($taskPassword)
    $taskProcess.StandardInput.Close()
    $taskProcess.WaitForExit()
    $taskLog = ($taskOut.Result + $taskErr.Result).Replace($taskPassword, '[redacted]')
    $taskLog | Set-Content -LiteralPath (Join-Path $taskOutput "$taskName-bundletool.log")
    if ($taskProcess.ExitCode -ne 0) { throw 'Bundletool failed. Inspect the redacted artifact log.' }
    $taskArchive = [IO.Compression.ZipFile]::OpenRead($taskApks)
    try {
        $taskEntry = $taskArchive.GetEntry('universal.apk')
        if (!$taskEntry) { throw 'Bundletool did not produce universal.apk.' }
        [IO.Compression.ZipFileExtensions]::ExtractToFile($taskEntry, $taskApk, $true)
    } finally { $taskArchive.Dispose() }
    Write-Output "Generated from the AAB for local validation: $taskApk"
    Write-Output 'This uses the upload certificate. Google Play installation still needs separate testing.'
} finally {
    $taskPassword = $null
    $taskProcess.Dispose()
}
