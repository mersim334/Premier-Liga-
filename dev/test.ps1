#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $RepoRoot 'backend'
$VenvPy = Join-Path $Backend '.venv\Scripts\python.exe'

$env:DATABASE_URL = ''
$env:BIH_PREMIER_FORCE_MOCK = '1'

Push-Location $Backend
try {
    if (Test-Path $VenvPy) {
        & $VenvPy -m pytest tests -v
    } else {
        python -m pytest tests -v
    }
} finally {
    Pop-Location
}
