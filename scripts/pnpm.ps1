param([Parameter(ValueFromRemainingArguments = $true)][string[]]$PnpmArguments)

$taskPnpm = Get-Command pnpm -ErrorAction SilentlyContinue
if ($taskPnpm) {
    & $taskPnpm.Source @PnpmArguments
    exit $LASTEXITCODE
}

# Reuse the desktop workspace runtime when pnpm is not on PATH.
$taskRuntime = Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node'
$taskPnpmPath = Join-Path $taskRuntime 'node_modules\pnpm\bin\pnpm.cjs'
$taskNodePath = Join-Path $taskRuntime 'bin\node.exe'
if ((Test-Path -LiteralPath $taskPnpmPath) -and (Test-Path -LiteralPath $taskNodePath)) {
    & $taskNodePath $taskPnpmPath @PnpmArguments
    exit $LASTEXITCODE
}

Write-Error 'Install Node.js 24 LTS and pnpm 11, then run pnpm install.'
exit 1
