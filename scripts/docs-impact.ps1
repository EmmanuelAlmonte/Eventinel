[CmdletBinding()]
param(
  [string]$BaseRef = "origin/main",
  [string]$HeadRef = "HEAD",
  [int]$LookbackDays = 7,
  [string]$DocsitePath = "eventinel-mobile-docsite",
  [string]$OutputDir = "agent-outputs/docs-impact",
  [switch]$SkipValidation,
  [switch]$CommittedOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"
if (Get-Variable -Name PSNativeCommandUseErrorActionPreference -ErrorAction SilentlyContinue) {
  $PSNativeCommandUseErrorActionPreference = $false
}

function Normalize-Path {
  param([string]$PathValue)
  return ($PathValue -replace "\\", "/").Trim()
}

function Should-IncludePath {
  param(
    [string]$PathValue,
    [string]$NormalizedOutputDir
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $false
  }

  $normalized = Normalize-Path $PathValue
  if ($normalized -eq "") {
    return $false
  }

  if ($normalized.StartsWith("$NormalizedOutputDir/")) {
    return $false
  }

  return $true
}

function Invoke-Capture {
  param(
    [string]$Label,
    [string]$Command,
    [scriptblock]$Action
  )

  $output = & $Action 2>&1
  $status = $LASTEXITCODE
  return [pscustomobject]@{
    Label = $Label
    Command = $Command
    Status = $status
    Output = @($output)
  }
}

function Get-StatusRank {
  param([string]$Status)
  switch ($Status) {
    "Unstable" { return 3 }
    "Moderate" { return 2 }
    default { return 1 }
  }
}

function Get-MaxStatus {
  param(
    [string]$Current,
    [string]$Candidate
  )
  if ((Get-StatusRank $Candidate) -gt (Get-StatusRank $Current)) {
    return $Candidate
  }
  return $Current
}

function Get-PathStatus {
  param(
    [string]$PathValue,
    [hashtable]$ChurnByPath,
    [string[]]$UnstablePatterns
  )

  foreach ($pattern in $UnstablePatterns) {
    if ($PathValue -match $pattern) {
      return "Unstable"
    }
  }

  $churn = 0
  if ($ChurnByPath.ContainsKey($PathValue)) {
    $churn = [int]$ChurnByPath[$PathValue]
  }

  if ($churn -ge 4) {
    return "Moderate"
  }

  return "Stable"
}

function Get-DocMapping {
  param(
    [string]$PathValue,
    [object[]]$Mappings
  )

  foreach ($mapping in $Mappings) {
    foreach ($pattern in $mapping.Regexes) {
      if ($PathValue -match $pattern) {
        return $mapping
      }
    }
  }

  return $null
}

function Test-GitRef {
  param([string]$RefName)
  & git rev-parse --verify --quiet "$RefName`^{commit}" *> $null
  return ($LASTEXITCODE -eq 0)
}

function Resolve-Ref {
  param(
    [string]$Requested,
    [string[]]$Fallbacks
  )

  $candidates = @($Requested) + $Fallbacks
  $seen = @{}
  foreach ($candidate in $candidates) {
    if ([string]::IsNullOrWhiteSpace($candidate)) {
      continue
    }
    if ($seen.ContainsKey($candidate)) {
      continue
    }
    $seen[$candidate] = $true
    if (Test-GitRef -RefName $candidate) {
      return $candidate
    }
  }

  return $null
}

$repoRoot = (Get-Location).Path
$resolvedHeadRef = Resolve-Ref -Requested $HeadRef -Fallbacks @("HEAD")
if ($null -eq $resolvedHeadRef) {
  Write-Error "Unable to resolve head ref. Requested: $HeadRef"
  exit 1
}

$resolvedBaseRef = Resolve-Ref -Requested $BaseRef -Fallbacks @("origin/main", "main", "origin/master", "master", "HEAD~1")
if ($null -eq $resolvedBaseRef) {
  Write-Error "Unable to resolve base ref. Requested: $BaseRef"
  exit 1
}

$range = "$resolvedBaseRef...$resolvedHeadRef"
$sinceArg = "$LookbackDays days ago"
$outputRoot = Join-Path $repoRoot $OutputDir
$normalizedOutputDir = Normalize-Path $OutputDir
New-Item -ItemType Directory -Path $outputRoot -Force | Out-Null

$commands = @()
$errors = @()

$diffStatusResult = Invoke-Capture -Label "Diff name-status" -Command "git diff --name-status $range" -Action {
  git diff --name-status $range
}
$commands += $diffStatusResult
if ($diffStatusResult.Status -ne 0) {
  $errors += "git diff --name-status failed"
}

$diffNamesResult = Invoke-Capture -Label "Diff name-only" -Command "git diff --name-only $range" -Action {
  git diff --name-only $range
}
$commands += $diffNamesResult
if ($diffNamesResult.Status -ne 0) {
  $errors += "git diff --name-only failed"
}

$logNamesResult = Invoke-Capture -Label "Log name-only" -Command "git log --since=""$sinceArg"" --name-only --pretty=format:" -Action {
  git log --since="$sinceArg" --name-only --pretty=format:
}
$commands += $logNamesResult
if ($logNamesResult.Status -ne 0) {
  $errors += "git log --name-only failed"
}

$worktreeTrackedResult = $null
$worktreeCachedResult = $null
$worktreeUntrackedResult = $null

if (-not $CommittedOnly) {
  $worktreeTrackedResult = Invoke-Capture -Label "Working tree (tracked)" -Command "git diff --name-only" -Action {
    git diff --name-only
  }
  $commands += $worktreeTrackedResult
  if ($worktreeTrackedResult.Status -ne 0) {
    $errors += "git diff --name-only failed"
  }

  $worktreeCachedResult = Invoke-Capture -Label "Working tree (staged)" -Command "git diff --name-only --cached" -Action {
    git diff --name-only --cached
  }
  $commands += $worktreeCachedResult
  if ($worktreeCachedResult.Status -ne 0) {
    $errors += "git diff --name-only --cached failed"
  }

  $worktreeUntrackedResult = Invoke-Capture -Label "Working tree (untracked)" -Command "git ls-files --others --exclude-standard" -Action {
    git ls-files --others --exclude-standard
  }
  $commands += $worktreeUntrackedResult
  if ($worktreeUntrackedResult.Status -ne 0) {
    $errors += "git ls-files --others --exclude-standard failed"
  }
}

$changedFiles = @()
$changedFileSet = @{}

if ($diffNamesResult.Status -eq 0) {
  foreach ($line in $diffNamesResult.Output) {
    $candidate = Normalize-Path $line
    if (Should-IncludePath -PathValue $candidate -NormalizedOutputDir $normalizedOutputDir) {
      $changedFileSet[$candidate] = $true
    }
  }
}

if (-not $CommittedOnly) {
  foreach ($result in @($worktreeTrackedResult, $worktreeCachedResult, $worktreeUntrackedResult)) {
    if ($null -eq $result -or $result.Status -ne 0) {
      continue
    }
    foreach ($line in $result.Output) {
      $candidate = Normalize-Path $line
      if (Should-IncludePath -PathValue $candidate -NormalizedOutputDir $normalizedOutputDir) {
        $changedFileSet[$candidate] = $true
      }
    }
  }
}

$changedFiles = @($changedFileSet.Keys | Sort-Object)

$churnByPath = @{}
if ($logNamesResult.Status -eq 0) {
  $recentLines = @(
    $logNamesResult.Output |
      ForEach-Object { Normalize-Path $_ } |
      Where-Object { $_ -ne "" }
  )

  foreach ($line in $recentLines) {
    if (-not $churnByPath.ContainsKey($line)) {
      $churnByPath[$line] = 0
    }
    $churnByPath[$line] = [int]$churnByPath[$line] + 1
  }
}

$unstablePatterns = @(
  "^hooks/useIncidentSubscription(?:[./].*)?$",
  "^contexts/IncidentSubscriptionContext\.tsx$",
  "^lib/map/subscriptionPlanner\.ts$",
  "^lib/map/geohashViewport\.ts$"
)

$docMappings = @(
  [pscustomobject]@{
    Area = "Profile and Settings"
    Doc = "docs/features/profile-settings.md"
    Regexes = @(
      "^screens/MenuScreen\.tsx$",
      "^screens/menu/",
      "^screens/ProfileScreen\.tsx$",
      "^screens/profile/",
      "^lib/theme/",
      "^lib/brand/"
    )
  },
  [pscustomobject]@{
    Area = "Relay Management"
    Doc = "docs/features/relay-management.md"
    Regexes = @(
      "^screens/RelayConnectScreen\.tsx$",
      "^lib/relay/",
      "^hooks/useRelay",
      "^components/relay/"
    )
  },
  [pscustomobject]@{
    Area = "Login and Authentication"
    Doc = "docs/features/login-authentication.md"
    Regexes = @(
      "^screens/LoginScreen\.tsx$",
      "^hooks/useAuth",
      "^lib/nostr/",
      "^lib/ndk\.ts$",
      "^contexts/Auth"
    )
  },
  [pscustomobject]@{
    Area = "Map Screen"
    Doc = "docs/features/map-screen.md"
    Regexes = @(
      "^screens/MapScreen\.tsx$",
      "^components/map/",
      "^lib/map/",
      "^hooks/useMap",
      "^hooks/useLocation",
      "^contexts/Location"
    )
  },
  [pscustomobject]@{
    Area = "Incident Feed"
    Doc = "docs/features/incident-feed.md"
    Regexes = @(
      "^screens/IncidentFeedScreen\.tsx$",
      "^screens/incidentFeed/",
      "^components/incident/",
      "^components/ui/IncidentCard\.tsx$"
    )
  },
  [pscustomobject]@{
    Area = "Incident Detail"
    Doc = "docs/features/incident-detail.md"
    Regexes = @(
      "^screens/IncidentDetailScreen\.tsx$",
      "^screens/incidentDetail/",
      "^components/incident/detail"
    )
  },
  [pscustomobject]@{
    Area = "Push Notifications"
    Doc = "docs/features/push-notifications.md"
    Regexes = @(
      "^components/notifications/",
      "^lib/notifications/",
      "^hooks/useNotifications",
      "^plugins/withNotifications"
    )
  },
  [pscustomobject]@{
    Area = "Wallet and Payments"
    Doc = "docs/features/wallet-payments.md"
    Regexes = @(
      "^screens/wallet/",
      "^components/wallet/",
      "^lib/wallet/",
      "^lib/payments/"
    )
  },
  [pscustomobject]@{
    Area = "Location Architecture"
    Doc = "docs/architecture/location-provider.md"
    Regexes = @(
      "^contexts/LocationContext",
      "^hooks/useUserLocation",
      "^hooks/useLocation",
      "^lib/map/location"
    )
  },
  [pscustomobject]@{
    Area = "Docs Maintenance Pipeline"
    Doc = "docs/docs-maintenance-workflow.md"
    Regexes = @(
      "^scripts/docs-impact\.ps1$",
      "^eventinel-mobile-docsite/docs/docs-maintenance-workflow\.md$",
      "^eventinel-mobile-docsite/sidebars\.ts$"
    )
  }
)

$areaSummary = @{}
$deferredFiles = New-Object System.Collections.Generic.List[string]
$unmappedFiles = New-Object System.Collections.Generic.List[string]

foreach ($file in $changedFiles) {
  $pathStatus = Get-PathStatus -PathValue $file -ChurnByPath $churnByPath -UnstablePatterns $unstablePatterns

  if ($pathStatus -eq "Unstable") {
    $deferredFiles.Add($file)
    continue
  }

  $mapping = Get-DocMapping -PathValue $file -Mappings $docMappings
  if ($null -eq $mapping) {
    $unmappedFiles.Add($file)
    continue
  }

  if (-not $areaSummary.ContainsKey($mapping.Area)) {
    $areaSummary[$mapping.Area] = [pscustomobject]@{
      Area = $mapping.Area
      Doc = $mapping.Doc
      Status = "Stable"
      Files = New-Object System.Collections.Generic.List[string]
      MaxChurn = 0
    }
  }

  $entry = $areaSummary[$mapping.Area]
  $entry.Status = Get-MaxStatus -Current $entry.Status -Candidate $pathStatus
  $entry.Files.Add($file)

  if ($churnByPath.ContainsKey($file)) {
    $entry.MaxChurn = [Math]::Max([int]$entry.MaxChurn, [int]$churnByPath[$file])
  }
}

$docsiteFullPath = Join-Path $repoRoot $DocsitePath
if (-not (Test-Path $docsiteFullPath)) {
  $errors += "Docsite path not found: $docsiteFullPath"
}

if ((-not $SkipValidation) -and (Test-Path $docsiteFullPath)) {
  Push-Location $docsiteFullPath
  try {
    $buildResult = Invoke-Capture -Label "Docs build" -Command "npm run build" -Action {
      npm run build
    }
    $commands += $buildResult
    if ($buildResult.Status -ne 0) {
      $errors += "npm run build failed"
    }

    $typecheckResult = Invoke-Capture -Label "Docs typecheck" -Command "npx tsc --noEmit" -Action {
      npx tsc --noEmit
    }
    $commands += $typecheckResult
    if ($typecheckResult.Status -ne 0) {
      $errors += "npx tsc --noEmit failed"
    }
  } finally {
    Pop-Location
  }
}

$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ssK"
$reportPath = Join-Path $outputRoot "summary.md"
$diffStatusPath = Join-Path $outputRoot "diff-name-status.txt"
$diffNameOnlyPath = Join-Path $outputRoot "diff-name-only.txt"
$logNameOnlyPath = Join-Path $outputRoot "log-name-only.txt"
$worktreeTrackedPath = Join-Path $outputRoot "working-tree-tracked.txt"
$worktreeCachedPath = Join-Path $outputRoot "working-tree-staged.txt"
$worktreeUntrackedPath = Join-Path $outputRoot "working-tree-untracked.txt"
$buildPath = Join-Path $outputRoot "docs-build.txt"
$typecheckPath = Join-Path $outputRoot "docs-typecheck.txt"

$diffStatusResult.Output | Out-File -FilePath $diffStatusPath -Encoding utf8
$diffNamesResult.Output | Out-File -FilePath $diffNameOnlyPath -Encoding utf8
$logNamesResult.Output | Out-File -FilePath $logNameOnlyPath -Encoding utf8
if ($null -ne $worktreeTrackedResult) {
  $worktreeTrackedResult.Output | Out-File -FilePath $worktreeTrackedPath -Encoding utf8
}
if ($null -ne $worktreeCachedResult) {
  $worktreeCachedResult.Output | Out-File -FilePath $worktreeCachedPath -Encoding utf8
}
if ($null -ne $worktreeUntrackedResult) {
  $worktreeUntrackedResult.Output | Out-File -FilePath $worktreeUntrackedPath -Encoding utf8
}

$buildCmd = $commands | Where-Object { $_.Label -eq "Docs build" } | Select-Object -First 1
if ($null -ne $buildCmd) {
  $buildCmd.Output | Out-File -FilePath $buildPath -Encoding utf8
}

$typecheckCmd = $commands | Where-Object { $_.Label -eq "Docs typecheck" } | Select-Object -First 1
if ($null -ne $typecheckCmd) {
  $typecheckCmd.Output | Out-File -FilePath $typecheckPath -Encoding utf8
}

$reportLines = New-Object System.Collections.Generic.List[string]
$reportLines.Add("# Docs Impact Report")
$reportLines.Add("")
$reportLines.Add("- Generated: $timestamp")
$reportLines.Add("- Repo: $repoRoot")
$reportLines.Add("- Base ref (requested): $BaseRef")
$reportLines.Add("- Base ref (resolved): $resolvedBaseRef")
$reportLines.Add("- Head ref (requested): $HeadRef")
$reportLines.Add("- Head ref (resolved): $resolvedHeadRef")
$reportLines.Add("- Lookback window: $LookbackDays days")
$reportLines.Add("- Change sources: " + ($(if ($CommittedOnly) { "Commit range only" } else { "Commit range + working tree (tracked, staged, untracked)" })))
$reportLines.Add("- Changed files considered: $($changedFiles.Count)")
$reportLines.Add("- Deferred unstable files: $($deferredFiles.Count)")
$reportLines.Add("- Unmapped changed files: $($unmappedFiles.Count)")
$reportLines.Add("")
$reportLines.Add("## Commands and Exit Status")
$reportLines.Add("")
$reportLines.Add("| Step | Command | Exit |")
$reportLines.Add("| --- | --- | --- |")
foreach ($cmd in $commands) {
  $safeCommand = $cmd.Command.Replace("|", "\|")
  $reportLines.Add("| $($cmd.Label) | ``$safeCommand`` | $($cmd.Status) |")
}
$reportLines.Add("")
$reportLines.Add("## Impact Map")
$reportLines.Add("")

$impactEntries = @($areaSummary.Values) | Sort-Object @{Expression = { Get-StatusRank $_.Status }; Descending = $true }, Area
if ($impactEntries.Count -eq 0) {
  $reportLines.Add("No mapped stable/moderate areas were detected in this diff.")
  $reportLines.Add("")
} else {
  $reportLines.Add("| Area | Target doc | Status | Changed files |")
  $reportLines.Add("| --- | --- | --- | --- |")
  foreach ($entry in $impactEntries) {
    $fileCount = $entry.Files.Count
    $reportLines.Add("| $($entry.Area) | ``$($entry.Doc)`` | $($entry.Status) | $fileCount |")
  }
  $reportLines.Add("")
  $reportLines.Add("### Area Detail")
  $reportLines.Add("")
  foreach ($entry in $impactEntries) {
    $reportLines.Add("#### $($entry.Area) -> ``$($entry.Doc)`` ($($entry.Status))")
    foreach ($file in $entry.Files | Select-Object -Unique) {
      $churn = if ($churnByPath.ContainsKey($file)) { [int]$churnByPath[$file] } else { 0 }
      $reportLines.Add("- ``$file`` (recent churn: $churn)")
    }
    $reportLines.Add("")
  }
}

$reportLines.Add("## Deferred Unstable Files")
$reportLines.Add("")
if ($deferredFiles.Count -eq 0) {
  $reportLines.Add("None.")
} else {
  foreach ($file in $deferredFiles | Select-Object -Unique) {
    $reportLines.Add("- ``$file``")
  }
}
$reportLines.Add("")

$reportLines.Add("## Unmapped Changed Files")
$reportLines.Add("")
if ($unmappedFiles.Count -eq 0) {
  $reportLines.Add("None.")
} else {
  foreach ($file in $unmappedFiles | Select-Object -Unique) {
    $reportLines.Add("- ``$file``")
  }
}
$reportLines.Add("")

$reportLines.Add("## Raw Outputs")
$reportLines.Add("")
$reportLines.Add("- ``$OutputDir/diff-name-status.txt``")
$reportLines.Add("- ``$OutputDir/diff-name-only.txt``")
$reportLines.Add("- ``$OutputDir/log-name-only.txt``")
if ($null -ne $worktreeTrackedResult) {
  $reportLines.Add("- ``$OutputDir/working-tree-tracked.txt``")
}
if ($null -ne $worktreeCachedResult) {
  $reportLines.Add("- ``$OutputDir/working-tree-staged.txt``")
}
if ($null -ne $worktreeUntrackedResult) {
  $reportLines.Add("- ``$OutputDir/working-tree-untracked.txt``")
}
if ($null -ne $buildCmd) {
  $reportLines.Add("- ``$OutputDir/docs-build.txt``")
}
if ($null -ne $typecheckCmd) {
  $reportLines.Add("- ``$OutputDir/docs-typecheck.txt``")
}
$reportLines.Add("")

$reportLines | Out-File -FilePath $reportPath -Encoding utf8

Write-Host "Docs impact report written to: $reportPath"
Write-Host "Diff status output: $diffStatusPath"
Write-Host "Diff name-only output: $diffNameOnlyPath"
Write-Host "Log name-only output: $logNameOnlyPath"
if ($null -ne $worktreeTrackedResult) {
  Write-Host "Working tree tracked output: $worktreeTrackedPath"
}
if ($null -ne $worktreeCachedResult) {
  Write-Host "Working tree staged output: $worktreeCachedPath"
}
if ($null -ne $worktreeUntrackedResult) {
  Write-Host "Working tree untracked output: $worktreeUntrackedPath"
}
if ($null -ne $buildCmd) {
  Write-Host "Docs build output: $buildPath"
}
if ($null -ne $typecheckCmd) {
  Write-Host "Docs typecheck output: $typecheckPath"
}

if ($errors.Count -gt 0) {
  Write-Error ("docs-impact pipeline failed: " + ($errors -join "; "))
  exit 1
}

Write-Host "docs-impact pipeline completed successfully."
