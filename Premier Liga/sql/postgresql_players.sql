-- PostgreSQL: tablica players — demo / učenje
-- Pokretanje: nakon postgresql_seasons.sql i postgresql_teams.sql (season_id FK).
-- Preporučeni red cijelog paketa: seasons → teams → matches → players → match_events.

CREATE TABLE players (
    id BIGSERIAL PRIMARY KEY,
    season_id BIGINT NOT NULL REFERENCES seasons (id) ON DELETE RESTRICT,
    team_id BIGINT NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    full_name TEXT NOT NULL,
    shirt_number SMALLINT,
    position TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_players_team_id ON players (team_id);
CREATE INDEX idx_players_season_team ON players (season_id, team_id);

CREATE UNIQUE INDEX idx_players_season_team_shirt ON players (season_id, team_id, shirt_number)
    WHERE shirt_number IS NOT NULL;
