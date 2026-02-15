param(
  [Parameter(Mandatory = $true, Position = 0, ValueFromRemainingArguments = $true)]
  [string[]]$Query,
  [int]$TopK = 5,
  [switch]$Json
)

$ErrorActionPreference = 'Stop'
$q = ($Query -join ' ').Trim()
if ([string]::IsNullOrWhiteSpace($q)) {
  throw 'usage: .\.codex\scripts\memory_semantic_search.ps1 "query" [-TopK 5] [-Json]'
}

$scriptPath = Join-Path $PSScriptRoot 'memory_semantic_search.mjs'
$args = @($scriptPath, $q, '--top-k', $TopK)
if ($Json) { $args += '--json' }
node @args