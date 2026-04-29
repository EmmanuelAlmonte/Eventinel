param(
  [string]$Serial = "emulator-5554",
  [int]$DevicePort = 8085
)

$adb = "adb"
$deviceSpec = if ([string]::IsNullOrWhiteSpace($Serial)) { @() } else { @("-s", $Serial) }

Write-Host "Removing adb reverse tcp:$DevicePort for $Serial..."
& $adb @deviceSpec reverse --remove "tcp:$DevicePort"
if ($LASTEXITCODE -ne 0) {
  throw "adb reverse --remove failed with exit code $LASTEXITCODE."
}

Write-Host ""
Write-Host "Current adb reverse rules:"
& $adb @deviceSpec reverse --list
if ($LASTEXITCODE -ne 0) {
  throw "adb reverse --list failed with exit code $LASTEXITCODE."
}
