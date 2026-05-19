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

- FastAPI (`app/main.py`): `/health`, `/db-health`, CORS za `localhost:5173`
- Rute: `/seasons`, `/teams`, `/matches`, `/players`, `/match-events`
- Bez baze: mock; uz `DATABASE_URL`: čitanje iz PostgreSQL-a
- Testovi u `backend\tests\` — `pytest` iz foldera `backend`

### Frontend (fetch · usklađeno s postojećim backend GET-om)

- `frontend\.env.example` — `VITE_API_BASE_URL=http://127.0.0.1:8000`
- `frontend\src\config.ts` — `API_BASE_URL`
- `frontend\src\api\client.ts` — `apiGet`
- Moduli: `health`, `seasons`, `matches`, `teams`, `players`, `match-events`
- `App.tsx` + **React Router**: `/` pregled, `/timovi`, `/utakmice`, `/igraci`, `/dogadjaji`; zajednički podaci u `LigaDataProvider` (`src/context/LigaDataContext.tsx`), layout `src/layouts/MainLayout.tsx` (sezona + navigacija)

---

## Kad budete spremni za pokretanje

**Prije prvog pokretanja (jednom po mašini):**

1. U `frontend`: `npm install` (ako nisi već).
2. **`backend\.env`** — ako želiš podatke iz PostgreSQLa, postavi `DATABASE_URL` (primjer u `backend\.env.example`). Bez toga backend može raditi s mock podacima.
3. **`frontend\.env`** — kopiraj iz `frontend\.env.example` (obično `VITE_API_BASE_URL=http://127.0.0.1:8000`).

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
| 1 | ~~**React Router** — rastaviti `App.tsx` na stranice~~ → **URAĐENO** (`/`, `/timovi`, `/utakmice`, `/igraci`, `/dogadjaji`) |
| 2 | **Tablica bodova** — prvo odluka: računanje na frontu iz utakmica **ili** kasnije nova ruta na backendu kad ga budeš nadograđivao |
| 3 | **GitHub:** commit samo `frontend/` kad frontend bude kako želiš |

Nove backend rute radimo tek kad kreneš **nadogradnju backenda** (poseban korak, ne miješati s ovim pravilom).

---

## Leksikon (podsjetnik)

- **Fetch** — način u browseru (`fetch` ili helper `apiGet`) da frontend pošalje HTTP zahtjev FastAPI‑ju na drugom portu. Za dinamička data iz baze to je nužnost (barem nekakav HTTP klijent).

---

## Sljedeći savjetni korak

1. Kad hoćeš raditi: koristi sekciju **„Kad budete spremni za pokretanje“** gore.  
2. Dalje u projektu: **tablica bodova** (na frontu ili kasnije s backendom).  
3. Kad frontend zadovolji: **push samo `frontend/`** na GitHub (backend po dogovoru).

