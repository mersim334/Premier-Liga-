-- PostgreSQL: match_events — demo / učenje
-- Pokretanje (redoslijed): seasons → teams → matches → players → ovaj fajl

--
-- Konvencije (preporuka):
--   goal / penalty_scored / own_goal → player_id = strijelac (own_goal: igrač koji je dao autogol)
--   yellow_card / red_card          → player_id = igrač koji dobija karton
--   substitution                     → player_id = igrač koji izlazi, related_player_id = igrač koji ulazi
--   penalty_missed                   → player_id = izvođač
--
-- CHECK lista za event_type je stroga; trigger ispod forsira da je team_id domaćin ili gost na tom meču.
-- Regularno vrijeme: minute 1–90 (dva poluvremena × 45 min). Nadoknada: minute_added 0–15
-- (npr. 45+2 → minute=45, minute_added=2).

CREATE TABLE match_events (
    id BIGSERIAL PRIMARY KEY,
    match_id BIGINT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    team_id BIGINT NOT NULL REFERENCES teams (id) ON DELETE RESTRICT,
    minute SMALLINT NOT NULL CHECK (minute >= 1 AND minute <= 90),
    minute_added SMALLINT CHECK (
        minute_added IS NULL
        OR (minute_added >= 0 AND minute_added <= 15)
    ),
    event_type TEXT NOT NULL CHECK (
        event_type IN (
            'goal',
            'own_goal',
            'yellow_card',
            'red_card',
            'substitution',
            'penalty_scored',
            'penalty_missed'
        )
    ),
    player_id BIGINT REFERENCES players (id) ON DELETE RESTRICT,
    related_player_id BIGINT REFERENCES players (id) ON DELETE RESTRICT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_match_events_players_distinct CHECK (
        related_player_id IS NULL
        OR player_id IS NULL
        OR related_player_id <> player_id
    ),
    CONSTRAINT chk_match_events_required_players CHECK (
        (
            event_type <> 'substitution'
            OR (
                player_id IS NOT NULL
                AND related_player_id IS NOT NULL
            )
        )
        AND (
            event_type NOT IN (
                'goal',
                'own_goal',
                'penalty_scored',
                'penalty_missed',
                'yellow_card',
                'red_card'
            )
            OR player_id IS NOT NULL
        )
    )
);

CREATE INDEX idx_match_events_match_id ON match_events (match_id);
CREATE INDEX idx_match_events_team_id ON match_events (team_id);
CREATE INDEX idx_match_events_player_id ON match_events (player_id);

CREATE OR REPLACE FUNCTION validate_match_event_team()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM matches AS m
        WHERE m.id = NEW.match_id
          AND NEW.team_id IN (m.home_team_id, m.away_team_id)
    ) THEN
        RAISE EXCEPTION
            USING MESSAGE = 'match_events.team_id must equal home_team_id or away_team_id for match_id';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_match_events_team_must_be_on_fixture
    BEFORE INSERT OR UPDATE ON match_events
    FOR EACH ROW
    EXECUTE PROCEDURE validate_match_event_team();
