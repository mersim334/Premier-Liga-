# Pregled projekta — za mentora

Kratak, strukturiran uvod u repozitorij **Premier liga (demo)**. Namjena: brz orijentacijski pregled bez čitanja cijelog koda.

---

## 1. Svrha

Demo aplikacija fiktivne lige: **čitanje** (i djelimično **uređivanje rasporeda**) kroz web UI. Podaci su izmišljeni (mock ili PostgreSQL seed). Nije produkcijski sistem.

---

## 2. Tehnologije

| Sloj | Tehnologija |
|------|-------------|
| API | Python 3.10+, **FastAPI**, Pydantic |
| UI | **React 19**, **TypeScript**, **Vite** |
| Baza (opciono) | **PostgreSQL**, SQL skripte u repou |
| Razvoj (Windows) | **PowerShell** skripte u `dev/` |

---

## 3. Mapa repozitorija (logički slojevi)

```
Bih Premier Liga/
├── README.md                 # Ulazna tačka + linkovi
├── POKRETANJE.md             # Uputstvo za pokretanje (Windows, mock/DB)
├── NASTAVAK.md               # Bilješke za nastavak rada
├── docs/
│   └── ZA_MENTORA.md         # Ovaj dokument
├── dev/                      # setup.ps1, backend-mock.ps1, frontend.ps1, test.ps1
├── backend/
│   ├── app/
│   │   ├── main.py           # FastAPI app, CORS, lifespan, rute
│   │   ├── config.py         # Settings, DATABASE_URL, BIH_PREMIER_FORCE_MOCK
│   │   ├── mock_data.py      # Ugrađeni demo podaci (dvije sezone)
│   │   ├── schemas.py        # Pydantic modeli odgovora
│   │   ├── db.py             # Konekcija (kad je baza konfigurisana)
│   │   ├── domain/           # Domena (npr. pravila formata lige)
│   │   ├── repos/            # Čitanje/pisanje SQL-a
│   │   ├── routers/          # HTTP endpointi po domeni
│   │   └── services/         # Poslovna logika (npr. raspored, tablica)
│   ├── scripts/
│   │   ├── gen_mock_premijer.py   # Generiše mock_data.py
│   │   └── apply_seed.py          # Punjenje Postgresa iz seeda
│   ├── tests/                # pytest (mock + opciono integracija)
│   ├── requirements.txt
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── App.tsx           # Router
│   │   ├── api/              # Tanke obaviješnice oko fetch-a
│   │   ├── context/          # LigaDataProvider (sezona, podaci)
│   │   ├── layouts/, pages/, components/
│   │   └── utils/
│   ├── package.json
│   └── README.md
└── Premier Liga/sql/         # DDL, seed_minimal.sql, migracije
```

---

## 4. Ulazne tačke u kod (šta prvo otvoriti)

| Cilj | Lokacija |
|------|----------|
| Registracija ruta API-ja | `backend/app/main.py` |
| Lista endpointa u razvoju | http://127.0.0.1:8000/docs (Swagger) |
| Mock vs PostgreSQL | `backend/app/config.py` (`database_configured`, `BIH_PREMIER_FORCE_MOCK`) |
| Demo podaci | `backend/app/mock_data.py` (velik fajl — samo po potrebi) |
| Raspored / validacija kola | `backend/app/routers/schedule.py`, `backend/app/services/schedule_edit.py` |
| Frontend rute | `frontend/src/App.tsx` |
| Globalni state sezone | `frontend/src/context/LigaDataContext.tsx` |

---

## 5. Izvor podataka

| Način | Kada |
|--------|------|
| **Mock** | Nema valjanog `DATABASE_URL` *ili* postavljen `BIH_PREMIER_FORCE_MOCK=1` (vidi `dev/backend-mock.ps1`) |
| **PostgreSQL** | `DATABASE_URL` u `backend/.env` + šema + seed (`apply_seed.py`) |

Fajlovi `.env` **nisu** u Gitu (vidi korijenski `.gitignore`).

---

## 6. API (grupisano)

- **Javno / čitanje:** `GET /health`, `/seasons`, `/teams`, `/matches`, `/players`, `/match-events`, `/standings`, `/referees`, `/match-referees`, `/rules`
- **Raspored (uređivanje):** `GET/POST` pod `/schedule/...` (detalji u Swaggeru)
- **Baza:** `GET /db-health` (kad je DB konfigurisan)

---

## 7. Frontend — stranice (rute)

| Ruta | Svrha (kratko) |
|------|----------------|
| `/` | Pregled |
| `/pravila` | Pravila lige |
| `/tablica` | Tablica |
| `/raspored` | Raspored / uređivanje kola (mock/DB ovisno o backendu) |
| `/utakmice`, `/uporedi`, `/timovi`, `/timovi/:id`, `/igraci`, `/igraci/:id`, `/dogadjaji` | Ostatak UI-a |

---

## 8. Testovi i kvaliteta

```text
cd backend && python -m pytest tests -q
```

- Većina testova: **mock API** (bez baze).
- `tests/test_database_integration.py`: samo ako je postavljen **stvarni** `DATABASE_URL`.

Frontend: `npm run build` (TypeScript + Vite production build).

---

## 9. SQL

- DDL i početni podaci: `Premier Liga/sql/`
- Seed za demo: `seed_minimal.sql` (uključuje više sezona u skladu s projektom)
- Redoslijed primjene: vidi komentare u `apply_seed.py` i `POKRETANJE.md`

---

## 10. Napomene za review

1. **`mock_data.py`** je namjerno velik (generisan skriptom) — review po **generatoru** (`gen_mock_premijer.py`) često je praktičniji.
2. **PowerShell skripte** namjerno koriste ASCII u stringovima radi kompatibilnosti s Windows PowerShell 5.1.
3. **Git:** aktivna razvojna grana u praksi često `feature/frontend`; merge strategija je timski dogovor (npr. prema `development` ili `main`).

---

## 11. Brza checklista mentora

- [ ] `README.md` + `POKRETANJE.md` — pokretanje u ≤10 min na čistoj mašini
- [ ] `GET /seasons` u mock načinu vraća očekivan broj sezona
- [ ] `pytest` prolazi lokalno
- [ ] Nema commitanih `.env` ili stvarnih lozinki u repou

---

*Ažuriraj ovaj dokument kad se arhitektura značajno promijeni (nove domene, novi izvori podataka).*
