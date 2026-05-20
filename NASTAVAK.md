# BiH Premier Liga — zapisnik za nastavak

---

## Pravilo rada (dogovor)

- **Backend na GitHubu se sada ne mijenja** dok ne odlučimo zajednički.
- **Frontend** gradimo tako da odgovara **trenutnom API-ju** (sve što već postoji u FastAPI-ju na grani koju si pushao).
- Kad budeš spreman, **samo `frontend/`** (i eventualno korijenski README) možeš poslati na GitHub — bez obaveze da u istom commitu diraš backend.

---

## Gdje je šta na disku

- **Projekt (Desktop):** `C:\Users\WIN_10\Desktop\BiH Premier Liga`
- **Backend:** `backend\` — FastAPI, `.env` s `DATABASE_URL` (local, ne git)
- **Frontend:** `frontend\` — Vite + React + TypeScript
- **SQL šeme:** mapa koja sadrži `Premier Liga\sql\` (skripte + seed ako koristiš)

---

## Šta je već urađeno (kratko)

### Backend

- FastAPI (`app/main.py`): `/health`, `/db-health`, CORS za `localhost:5173` i `127.0.0.1:5173`
- Rute (između ostalog): `/seasons`, `/teams`, `/matches`, `/players`, `/match-events`, `/standings`, **`/rules`**, **`/schedule`** (uređivanje kola u mock/DB načinu), `/referees`, `/match-referees`
- Bez baze: mock (`app/mock_data.py`, uključujući **dvije sezone**); uz `DATABASE_URL`: čitanje/pisanje gdje je implementirano
- `backend\scripts\apply_seed.py` — punjenje Postgresa iz `Premier Liga\sql\seed_minimal.sql`
- `backend\scripts\gen_mock_premijer.py` — regeneracija `mock_data.py`
- Testovi: `backend\tests\` (`pytest`)

### Frontend

- `frontend\.env.example` — `VITE_API_BASE_URL=http://127.0.0.1:8000`
- API moduli i stranice: pregled, **pravila**, **tablica**, **raspored**, utakmice, **uporedi**, klubovi (+ detalj), igrači (+ detalj), događaji; `LigaDataProvider` (izbor sezone, osvježavanje)
- Brzo pokretanje: korijenski **`POKRETANJE.md`** i folder **`dev\`**

---

## Kad budete spremni za pokretanje

**Brzi put (Windows, preporučeno):** iz korijena repozitorija jednokratno `powershell -ExecutionPolicy Bypass -File .\dev\setup.ps1`, zatim u dva terminala `.\dev\backend-mock.ps1` (mock API, bez baze) i `.\dev\frontend.ps1`. Detalji, testovi i „ne vidim drugu sezonu“: **`POKRETANJE.md`**.

**Prije prvog pokretanja (jednom po mašini):**

1. U `frontend`: `npm install` (ako nisi već).
2. **`backend\.env`** — ako želiš podatke iz PostgreSQLa, postavi `DATABASE_URL` (primjer u `backend\.env.example`). Bez toga backend može raditi s mock podacima.
3. U bazi koji koristi **`DATABASE_URL`**, pokreni **šeme** iz `Premier Liga\sql\` (DDL fajlove), zatim **demo podatke**:
   ```powershell
   cd "C:\Users\WIN_10\Desktop\BiH Premier Liga\backend"
   python scripts\apply_seed.py
   ```
   (`apply_seed.py` čita isti `.env`, puni bazu iz `Premier Liga\sql\seed_minimal.sql` — **10 klubova**, mečevi, igrači, događaji. Ponovo pokreni kad zamijeniš seed u repozitoriju.)
4. **`frontend\.env`** — kopiraj iz `frontend\.env.example` (obično `VITE_API_BASE_URL=http://127.0.0.1:8000`).

**Redoslijed svaki put kad radiš:**

1. Pokreni **PostgreSQL** (ako ga koristiš) — na Windowsu često kao servis u pozadini.
2. **Terminal 1 — backend** (ostavi ga uključen):

   ```powershell
   cd "C:\Users\WIN_10\Desktop\BiH Premier Liga\backend"
   # opcionalno: .\.venv\Scripts\Activate.ps1
   python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
   ```

   Provjera: otvori http://127.0.0.1:8000/docs — treba biti Swagger.

3. **Terminal 2 — frontend:**

   ```powershell
   cd "C:\Users\WIN_10\Desktop\BiH Premier Liga\frontend"
   npm run dev
   ```

4. U browseru otvori adresu koju Vite ispiše (npr. **http://localhost:5173**).

**Ako nešto ne radi:** frontend na stranici prikaže grešku; provjeri da je u Terminalu 1 API još podignut i da nema crvene traceback poruke.

---

## Kako sve pokreneš (kratko — isto kao gore)

**Terminal 1 — backend:**

```powershell
cd "C:\Users\WIN_10\Desktop\BiH Premier Liga\backend"
# ako imaš venv:
# .\.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API: http://127.0.0.1:8000/docs

**Terminal 2 — frontend:**

```powershell
cd "C:\Users\WIN_10\Desktop\BiH Premier Liga\frontend"
npm run dev
```

Otvori link koji Vite ispiše (npr. http://localhost:5173).

**Napomena:** PostgreSQL treba raditi ako backend čita pravau bazu; `DATABASE_URL` u `backend\.env`.

---

## Šta dalje (kad bude vrijeme)

| Prioritet | Šta |
|-----------|-----|
| 1 | **GitHub:** commit/push po dogovoru (npr. samo `frontend/` ili cijeli monorepo) |
| 2 | Dalja proširenja API-ja ili UI-a — posebni zadaci |

Nove backend rute radimo tek kad kreneš **nadogradnju backenda** (poseban korak, ne miješati s pravilom iz uvoda ako i dalje vrijedi).

---

## Leksikon (podsjetnik)

- **Fetch** — način u browseru (`fetch` ili helper `apiGet`) da frontend pošalje HTTP zahtjev FastAPI‑ju na drugom portu. Za dinamička data iz baze to je nužnost (barem nekakav HTTP klijent).

---

## Sljedeći savjetni korak

1. Za svakodnevni rad: **`POKRETANJE.md`** i sekcija **„Kad budete spremni za pokretanje“** gore.  
2. Kad frontend ili backend zadovolji: **commit/push** po tvom workflowu.

