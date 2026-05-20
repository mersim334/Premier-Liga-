-- PostgreSQL: sudije — demo / učenje (fiktivna imena u seed_minimal.sql)
-- Pokretanje: prije match_referees.sql; ne ovisi o drugim tablicama osim samog Postgresa.

CREATE TABLE referees (
    id BIGSERIAL PRIMARY KEY,
    full_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_referees_name ON referees (full_name);
