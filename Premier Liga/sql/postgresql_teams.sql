-- PostgreSQL: tablica teams — demo / učenje

CREATE TABLE teams (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT,
    stadium TEXT,
    coach TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_teams_name ON teams (name);
