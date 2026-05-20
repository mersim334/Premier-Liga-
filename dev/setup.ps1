#Requires -Version 5.1
<#
  Jednokratno: Python venv, pip, npm, .env fajlovi.
  Pokretanje iz roota repoa:
    powershell -ExecutionPolicy Bypass -File .\dev\setup.ps1
#>
$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path $PSScriptRoot -Parent
$Backend = Join-Path $RepoRoot "backend"
$Frontend = Join-Path $RepoRoot "frontend"

Write-Host "== Bih Premier Liga :: setup ==" -ForegroundColor Cyan
Write-Host "Repo: $RepoRoot"

if (-not (Test-Path $Backend)) { throw "Nema backend foldera: $Backend" }
if (-not (Test-Path $Frontend)) { throw "Nema frontend foldera: $Frontend" }

$py = Get-Command python -ErrorAction SilentlyContinue
if (-not $py) {
    throw "Python nije u PATH. Instaliraj Python 3.10+ i ponovi."
}

$VenvPy = Join-Path $Backend ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPy)) {
    Write-Host "Pravim Python venv u backend\.venv ..." -ForegroundColor Yellow
    & python -m venv (Join-Path $Backend ".venv")
    $VenvPy = Join-Path $Backend ".venv\Scripts\python.exe"
}

Write-Host "pip install -r requirements.txt ..." -ForegroundColor Yellow
& $VenvPy -m pip install --upgrade pip
& $VenvPy -m pip install -r (Join-Path $Backend "requirements.txt")

$BackendEnv = Join-Path $Backend ".env"
if (-not (Test-Path $BackendEnv)) {
    $example = Join-Path $Backend ".env.example"
    if (Test-Path $example) {
        Copy-Item $example $BackendEnv
        Add-Content $BackendEnv "`n# Mock bez baze - ostavi prazno DATABASE_URL za demo u terminalu:`nDATABASE_URL=`n"
    } else {
        $backendEnvLines = @(
            '# Mock nacin: prazno = API koristi ugradene demo podatke'
            'DATABASE_URL='
            ''
            '# Za PostgreSQL odkomentiraj:'
            '# DATABASE_URL=postgresql://postgres:LOZINKA@127.0.0.1:5432/bih_premier_liga'
        )
        Set-Content -Path $BackendEnv -Value $backendEnvLines -Encoding utf8
    }
    Write-Host "Kreiran $BackendEnv" -ForegroundColor Green
} else {
    Write-Host "Postoji već: $BackendEnv (nije mijenjan)" -ForegroundColor DarkGray
}

$FeEnv = Join-Path $Frontend ".env"
if (-not (Test-Path $FeEnv)) {
    $feEx = Join-Path $Frontend ".env.example"
    if (Test-Path $feEx) {
        Copy-Item $feEx $FeEnv
    } else {
        Set-Content $FeEnv "VITE_API_BASE_URL=http://127.0.0.1:8000`n"
    }
    Write-Host "Kreiran $FeEnv" -ForegroundColor Green
} else {
    Write-Host "Postoji već: $FeEnv (nije mijenjan)" -ForegroundColor DarkGray
}

Write-Host "npm install (frontend) ..." -ForegroundColor Yellow
Push-Location $Frontend
try {
    npm install
} finally {
    Pop-Location
}

Write-Host ""
Write-Host "Gotovo. Dalje:" -ForegroundColor Green
Write-Host '  Terminal 1:  powershell -ExecutionPolicy Bypass -File .\dev\backend-mock.ps1'
Write-Host '  Terminal 2:  powershell -ExecutionPolicy Bypass -File .\dev\frontend.ps1'
Write-Host '  Testovi:      powershell -ExecutionPolicy Bypass -File .\dev\test.ps1'
