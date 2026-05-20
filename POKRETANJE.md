# Pokretanje projekta (Windows)

## 1. Jednokratno — setup

U PowerShellu, iz **root foldera** repozitorija (`Bih Premier Liga`):

```powershell
cd "c:\Users\WIN_10\Desktop\Bih Premier Liga"
powershell -ExecutionPolicy Bypass -File .\dev\setup.ps1
```

Šta radi: pravi `backend\.venv`, instalira Python pakete i `npm install` u `frontend`, te kreira `backend\.env` i `frontend\.env` ako ne postoje.

Ako vidiš grešku za skripte, jednom pokreni (kao korisnik):

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

## 2. Dva terminala — API + UI

**Terminal 1 — backend (mock, bez baze):**

```powershell
cd "c:\Users\WIN_10\Desktop\Bih Premier Liga"
powershell -ExecutionPolicy Bypass -File .\dev\backend-mock.ps1
```

**Terminal 2 — frontend:**

```powershell
cd "c:\Users\WIN_10\Desktop\Bih Premier Liga"
powershell -ExecutionPolicy Bypass -File .\dev\frontend.ps1
```

- API: http://127.0.0.1:8000 i http://127.0.0.1:8000/docs  
- Aplikacija: http://127.0.0.1:5173  

## 3. Testovi

```powershell
cd "c:\Users\WIN_10\Desktop\Bih Premier Liga"
powershell -ExecutionPolicy Bypass -File .\dev\test.ps1
```

## 4. PostgreSQL (opciono)

U `backend\.env` postavi stvarni `DATABASE_URL`. Zatim pokreni API **bez** forsiranog praznog URL-a (npr. direktno iz `backend` aktiviraj venv i `uvicorn` — ili uredi `dev\backend-mock.ps1` i ukloni liniju `$env:DATABASE_URL = ""`).

SQL i seed: vidi `backend\.env.example` i `Premier Liga\sql\`.

## 5. Ponovno generisanje demo podataka

```powershell
cd "c:\Users\WIN_10\Desktop\Bih Premier Liga\backend"
.\.venv\Scripts\python.exe scripts\gen_mock_premijer.py
```

Zatim **restartuj** `uvicorn` i u pregledniku uradi tvrdi osvježaj (Ctrl+F5).

## 6. Ne vidim drugu sezonu (npr. 2026/27)

1. Otvori http://127.0.0.1:8000/seasons — treba biti **dvije** stavke (`2025/26` i `2026/27`). Ako je samo jedna, API ne vraća novu sezonu.
2. **Mock način** (bez PostgreSQL-a): pokreni backend preko `dev\backend-mock.ps1` — postavlja prazan `DATABASE_URL` i **`BIH_PREMIER_FORCE_MOCK=1`** (time se ignoriše `DATABASE_URL` iz `backend\.env`, pa uvijek ide mock s **dvije** sezone). Ručno u istom PowerShell prozoru prije `uvicorn`:
   ```powershell
   $env:DATABASE_URL = ""
   $env:BIH_PREMIER_FORCE_MOCK = "1"
   ```
   Ako to izostaviš, a u `backend\.env` stoji stvarni `DATABASE_URL`, API čita **bazu** (često jedna sezona), ne `mock_data.py`.
3. **PostgreSQL**: u bazi mora postojati drugi red u `seasons`. Ažurirani seed je u `Premier Liga\sql\seed_minimal.sql` (dva `INSERT` u `seasons`). Ponovo ga učitaj ako je baza starija od tog fajla.
4. Nakon izmjene `app\mock_data.py` generatorom, bez restarta API-ja stari Python proces i dalje drži staru verziju u memoriji — uvijek restart nakon regeneracije.
