-- PostgreSQL: tablica matches (Premijer liga BiH — učenje)
-- Pokretanje: nakon postgresql_seasons.sql i postgresql_teams.sql

CREATE TABLE matches (
    id BIGSERIAL PRIMARY KEY,
    season_id BIGINT NOT NULL REFERENCES seasons (id) ON DELETE RESTRICT,
    round_no SMALLINT NOT NULL,
    match_date DATE NOT NULL,
    kickoff_at TIMESTAMPTZ,
    home_team_id BIGINT NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    away_team_id BIGINT NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    home_goals SMALLINT,
    away_goals SMALLINT,
    status TEXT NOT NULL DEFAULT 'scheduled'
        CHECK (
            status IN (
                'scheduled',
                'live',
                'finished',
                'postponed',
                'cancelled'
            )
        ),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_matches_teams_distinct CHECK (home_team_id <> away_team_id),
    CONSTRAINT chk_matches_finished_scores CHECK (
        status <> 'finished'
        OR (
            home_goals IS NOT NULL
            AND away_goals IS NOT NULL
        )
    )
);

CREATE INDEX idx_matches_season_round ON matches (season_id, round_no);
CREATE INDEX idx_matches_match_date ON matches (match_date);
CREATE INDEX idx_matches_home_team ON matches (home_team_id);
CREATE INDEX idx_matches_away_team ON matches (away_team_id);
