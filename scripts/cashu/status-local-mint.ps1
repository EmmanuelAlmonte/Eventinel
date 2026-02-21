$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$composeFile = Join-Path $scriptDir "docker-compose.nutshell.yml"
$envFile = Join-Path $scriptDir ".env.nutshell"

$composeArgs = @(
  "compose",
  "-f", $composeFile
)

if (Test-Path $envFile) {
  $composeArgs += @("--env-file", $envFile)
}

$composeArgs += @("ps")

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  exit $LASTEXITCODE
}
