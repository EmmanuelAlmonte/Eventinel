[CmdletBinding(PositionalBinding = $false)]
param(
  [string]$MintUrl,
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$CashuArgs
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $scriptDir "docker-compose.nutshell.yml"
$envTemplate = Join-Path $scriptDir ".env.nutshell.example"
$envFile = Join-Path $scriptDir ".env.nutshell"

if (-not (Test-Path $envFile)) {
  Copy-Item $envTemplate $envFile
  Write-Host "Created $envFile from template."
}

if (-not $CashuArgs -or $CashuArgs.Count -eq 0) {
  $CashuArgs = @("--help")
}

$composeArgs = @(
  "compose",
  "-f", $composeFile,
  "--env-file", $envFile,
  "run",
  "--rm"
)

if ($MintUrl) {
  $composeArgs += @("-e", "CASHU_CLI_MINT_URL=$MintUrl")
}

$composeArgs += @("cashu-cli")
$composeArgs += $CashuArgs

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
