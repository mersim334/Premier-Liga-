-- =============================================================================
-- seasons — BiH Premier Liga (učenje, lokalna baza)
-- Cilj: SQLite-friendly; za PostgreSQL vidi komentare na dnu.
-- =============================================================================

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Prikaz korisniku, npr. "2025/26"
    name TEXT NOT NULL,

    -- Naziv takmičenja (isti ligaski kontekst za sve redove ili razdvajanje po ligama)
    competition TEXT NOT NULL DEFAULT 'Premijer liga BiH',

    -- Jedinstven ključ za URL/filter, npr. "2025-26"
    slug TEXT NOT NULL UNIQUE,

    starts_on DATE NOT NULL,
    ends_on DATE,

    -- SQLite: 0 = false, 1 = true (samo jedna sezona može biti "trenutna" — indeks ispod)
    is_current INTEGER NOT NULL DEFAULT 0 CHECK (is_current IN (0, 1)),

    notes TEXT,

    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Jedna aktivna sezona po bazi (SQLite partial unique index)
CREATE UNIQUE INDEX IF NOT EXISTS idx_seasons_single_current
    ON seasons (is_current)
    WHERE is_current = 1;

CREATE INDEX IF NOT EXISTS idx_seasons_competition ON seasons (competition);
CREATE INDEX IF NOT EXISTS idx_seasons_starts_on ON seasons (starts_on DESC);

-- updated_at: pri izmjenama reda postavi eksplicitno npr.
--   UPDATE seasons SET ..., updated_at = datetime('now') WHERE id = ?;
-- ili iz aplikacionog koda.

-- -----------------------------------------------------------------------------
-- Primjer podataka (opciono pokreni poslije CREATE)
-- -----------------------------------------------------------------------------
/*
INSERT INTO seasons (name, competition, slug, starts_on, ends_on, is_current, notes)
VALUES
    ('2024/25', 'Premijer liga BiH', '2024-25', '2024-08-02', '2025-05-31', 0, NULL),
    ('2025/26', 'Premijer liga BiH', '2025-26', '2025-08-01', NULL,           1, NULL);
*/

-- =============================================================================
-- PostgreSQL varijanta (ako kasnije pređeš na Postgres):
-- -----------------------------------------------------------------------------
-- id BIGSERIAL PRIMARY KEY,
-- is_current BOOLEAN NOT NULL DEFAULT FALSE,
-- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
-- UNIQUE partial index:
--   CREATE UNIQUE INDEX idx_seasons_single_current ON seasons ((TRUE))
--   WHERE is_current = TRUE;
-- (Bolje: CREATE UNIQUE INDEX ... ON seasons (is_current) WHERE is_current;)
-- =============================================================================
