-- PostgreSQL: tablica matches — demo / učenje (fiktivni podaci u seed_minimal.sql)
-- Pokretanje: nakon postgresql_seasons.sql i postgresql_teams.sql
--
-- Pravilnik: utakmica ima tačno dva tima (domaćin + gost) i regularno traje 90 minuta
-- (dva poluvremena od po 45 min). Rezultat u kolonama home_goals/away_goals = nakon
-- regularnog vremena (ne uključuje eventualni produžetak / penale u ovom modelu).

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
    -- Uvijek tačno dva kluba: domaćin i gost (isti tim nije dozvoljen).
    CONSTRAINT chk_matches_teams_distinct CHECK (home_team_id <> away_team_id),
    CONSTRAINT chk_matches_finished_scores CHECK (
        status <> 'finished'
        OR (
            home_goals IS NOT NULL
            AND away_goals IS NOT NULL
        )
    ),
    CONSTRAINT chk_matches_goals_non_negative CHECK (
        (home_goals IS NULL OR home_goals >= 0)
        AND (away_goals IS NULL OR away_goals >= 0)
    )
);

CREATE INDEX idx_matches_season_round ON matches (season_id, round_no);
CREATE INDEX idx_matches_match_date ON matches (match_date);
CREATE INDEX idx_matches_home_team ON matches (home_team_id);
CREATE INDEX idx_matches_away_team ON matches (away_team_id);
