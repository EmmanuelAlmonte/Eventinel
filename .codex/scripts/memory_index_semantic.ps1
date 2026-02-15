param(
  [string]$Model,
  [int]$MaxChars = 1200,
  [int]$Overlap = 200,
  [int]$BatchSize = 64,
  [switch]$Force
)

$ErrorActionPreference = 'Stop'
$scriptPath = Join-Path $PSScriptRoot 'memory_index_semantic.mjs'
$args = @($scriptPath, '--max-chars', $MaxChars, '--overlap', $Overlap, '--batch-size', $BatchSize)
if ($Model) { $args += @('--model', $Model) }
if ($Force) { $args += '--force' }
node @args