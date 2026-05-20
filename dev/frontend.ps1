#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Frontend = Join-Path $RepoRoot 'frontend'

if (-not (Test-Path (Join-Path $Frontend 'node_modules'))) {
    Write-Host 'Nema node_modules - pokreni prvo: dev\setup.ps1' -ForegroundColor Yellow
}

Push-Location $Frontend
try {
    Write-Host 'Frontend: http://127.0.0.1:5173  (API mock: http://127.0.0.1:8000)' -ForegroundColor Cyan
    npm run dev
} finally {
    Pop-Location
}
