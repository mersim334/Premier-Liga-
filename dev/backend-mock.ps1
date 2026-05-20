#Requires -Version 5.1
<#
  API u mock nacinu (bez PostgreSQL). Koristi backend\.env ako postoji; inace prazna baza.
#>
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $RepoRoot 'backend'
$VenvPy = Join-Path $Backend '.venv\Scripts\python.exe'

# Mock: prazan URL + forsiranje (pregazi DATABASE_URL iz backend\.env)
$env:DATABASE_URL = ''
$env:BIH_PREMIER_FORCE_MOCK = '1'

Push-Location $Backend
try {
    if (Test-Path $VenvPy) {
        Write-Host 'Backend (mock): http://127.0.0.1:8000  |  docs: /docs' -ForegroundColor Cyan
        & $VenvPy -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    } else {
        Write-Host 'Nema .venv - prvo pokreni: dev\setup.ps1' -ForegroundColor Yellow
        Write-Host 'Pokusavam sistemski python...' -ForegroundColor DarkYellow
        python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
    }
} finally {
    Pop-Location
}
