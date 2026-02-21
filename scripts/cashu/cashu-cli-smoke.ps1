param(
  [string]$MintUrl
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$cashuCliScript = Join-Path $scriptDir "cashu-cli.ps1"

Write-Host "Running Cashu CLI smoke test..."

if ($MintUrl) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $cashuCliScript -MintUrl $MintUrl info
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $cashuCliScript -MintUrl $MintUrl wallets
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $cashuCliScript -MintUrl $MintUrl balance
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
} else {
  & powershell -NoProfile -ExecutionPolicy Bypass -File $cashuCliScript info
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $cashuCliScript wallets
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }

  & powershell -NoProfile -ExecutionPolicy Bypass -File $cashuCliScript balance
  if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
  }
}

Write-Host "Cashu CLI smoke test completed."
