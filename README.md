# Premier liga — demo

**Pregled za mentora / struktura repozitorija:** [docs/ZA_MENTORA.md](docs/ZA_MENTORA.md)

Fiktivna liga za vježbu: **FastAPI** backend i **React (Vite)** frontend.

## Pokretanje

Detaljno (Windows, mock vs PostgreSQL, rješavanje problema): **[POKRETANJE.md](POKRETANJE.md)**.

Sažetak:

1. Jednom: `powershell -ExecutionPolicy Bypass -File .\dev\setup.ps1` (iz korijena repozitorija).
2. API (mock, bez baze): `powershell -ExecutionPolicy Bypass -File .\dev\backend-mock.ps1`
3. UI: `powershell -ExecutionPolicy Bypass -File .\dev\frontend.ps1`

- API: http://127.0.0.1:8000/docs  
- Aplikacija: http://127.0.0.1:5173  

## Struktura

| Put | Sadržaj |
|-----|---------|
| `backend/` | FastAPI (`app/`), testovi, `scripts/gen_mock_premijer.py`, `scripts/apply_seed.py` |
| `frontend/` | React + TypeScript |
| `Premier Liga/sql/` | PostgreSQL DDL i `seed_minimal.sql` |
| `dev/` | PowerShell skripte za setup i razvoj |

## Testovi

```powershell
cd backend
python -m pytest tests -q
```

Ili: `powershell -ExecutionPolicy Bypass -File .\dev\test.ps1`

## Napomene

- U mock načinu podaci dolaze iz `backend/app/mock_data.py` (npr. dvije sezone). Za regeneraciju: `python scripts/gen_mock_premijer.py` iz `backend/`, zatim restart API-ja.
- Sa `DATABASE_URL` u `backend/.env` API čita PostgreSQL; seed: `python scripts/apply_seed.py` nakon kreiranja šeme.

Više konteksta za nastavak rada: [NASTAVAK.md](NASTAVAK.md).
