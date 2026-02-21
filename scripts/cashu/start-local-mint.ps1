param(
  [switch]$Recreate
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

$composeArgs = @(
  "compose",
  "-f", $composeFile,
  "--env-file", $envFile,
  "up",
  "-d"
)

if ($Recreate) {
  $composeArgs += "--force-recreate"
}

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}

Write-Host "Cashu mint local URL: http://127.0.0.1:3338"
Write-Host "Cashu mint physical phone URL: http://10.0.0.197:3338"
