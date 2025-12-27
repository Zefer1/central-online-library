$ErrorActionPreference = 'Stop'

function Invoke-Checked([string] $FilePath, [string[]] $Arguments) {
  & $FilePath @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "Command failed ($LASTEXITCODE): $FilePath $($Arguments -join ' ')"
  }
}

function Invoke-Step([string] $Title, [scriptblock] $Block) {
  Write-Host "`n=== $Title ===" -ForegroundColor Cyan
  & $Block
}

$repoRoot = Split-Path -Parent $PSScriptRoot

Invoke-Step "Verify API (tests)" {
  Push-Location (Join-Path $repoRoot 'desafio05-api')
  try {
    if (-not $env:SKIP_INSTALL) {
      Invoke-Checked npm @('ci')
    }
    Invoke-Checked npm @('test')
  } finally {
    Pop-Location
  }
}

Invoke-Step "Verify Frontend (lint/test/build)" {
  Push-Location (Join-Path $repoRoot 'Desafio05-Front')
  try {
    if (-not $env:SKIP_INSTALL) {
      Invoke-Checked npm @('ci')
    }
    Invoke-Checked npm @('run', 'lint')
    Invoke-Checked npm @('test')
    Invoke-Checked npm @('run', 'build')
  } finally {
    Pop-Location
  }
}

Write-Host "`nAll checks passed." -ForegroundColor Green
