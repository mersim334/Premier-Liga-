# Backend — Premier liga (demo)

FastAPI aplikacija u `app/`.

## Pokretanje (mock, bez baze)

Iz **korijena repozitorija**:

```powershell
powershell -ExecutionPolicy Bypass -File .\dev\backend-mock.ps1
```

Ili iz ovog foldera (venv po želji):

```powershell
$env:DATABASE_URL = ""
$env:BIH_PREMIER_FORCE_MOCK = "1"
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Pri pokretanju u konzoli će pisati `Izvor podataka: mock_data.py` ili `PostgreSQL`.

Swagger: http://127.0.0.1:8000/docs

## Okolina

Kopiraj `.env.example` u `.env`. Prazan ili nepostojeći `DATABASE_URL` ⇒ mock podaci (`app/mock_data.py`). Stvarni URL ⇒ PostgreSQL.

Ako u `.env` imaš bazu, a želiš ipak mock: postavi **`BIH_PREMIER_FORCE_MOCK=1`** u okolini (vidi `dev\backend-mock.ps1`).

## Seed i generisanje mocka

- Postgres: nakon DDL-a iz `Premier Liga/sql/`, `python scripts/apply_seed.py`
- Regeneracija `mock_data.py`: `python scripts/gen_mock_premijer.py` (zatim restart API-ja)

Detalji: **[../POKRETANJE.md](../POKRETANJE.md)**

## Testovi

```powershell
python -m pytest tests -q
```
