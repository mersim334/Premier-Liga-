from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.routers import (
    events,
    match_referees,
    matches,
    players,
    referees,
    rules,
    schedule,
    seasons,
    standings,
    teams,
)


@asynccontextmanager
async def _lifespan(_app: FastAPI):
    s = get_settings()
    label = "mock_data.py" if not s.database_configured() else "PostgreSQL"
    print(f"[premier-api] Izvor podataka: {label}")
    yield


app = FastAPI(
    title="Premier liga — demo API",
    version="0.1.0",
    lifespan=_lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(rules.router, prefix="/rules", tags=["rules"])
app.include_router(seasons.router, prefix="/seasons", tags=["seasons"])
app.include_router(teams.router, prefix="/teams", tags=["teams"])
app.include_router(matches.router, prefix="/matches", tags=["matches"])
app.include_router(players.router, prefix="/players", tags=["players"])
app.include_router(events.router, prefix="/match-events", tags=["match-events"])
app.include_router(referees.router, prefix="/referees", tags=["referees"])
app.include_router(
    match_referees.router, prefix="/match-referees", tags=["match-referees"]
)
app.include_router(standings.router, prefix="/standings", tags=["standings"])
app.include_router(schedule.router, prefix="/schedule", tags=["schedule"])


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/db-health")
def db_health():
    """Provjera konekcije na PostgreSQL (potreban DATABASE_URL u .env)."""
    settings = get_settings()
    if not settings.database_configured():
        return {
            "status": "not_configured",
            "detail": "Postavi DATABASE_URL u backend/.env da bi API čitao iz baze.",
        }
    try:
        import psycopg

        from app.repos import read as repos_read

        with psycopg.connect(settings.database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                if cur.fetchone()[0] != 1:
                    raise RuntimeError("Neočekivan odgovor iz SELECT 1")

        tables = repos_read.tables_exist_expected()
        all_ok = all(tables.values())
        return {
            "status": "ok" if all_ok else "incomplete_schema",
            "tables": tables,
            "detail": None
            if all_ok
            else "Nedostaju tablice — pokreni SQL skripte iz Premier Liga/sql redom.",
        }
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"PostgreSQL nedostupan ili pogrešan DATABASE_URL: {exc}",
        ) from exc
