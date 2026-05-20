-- PostgreSQL: dodjela sudija na utakmicu (glavni + dva asistenta + IV sudija)
-- Pokretanje: nakon postgresql_matches.sql i postgresql_referees.sql
--
-- Uloge: main, assistant_1, assistant_2, fourth_official — tačno jedan zapis po paru (match_id, role).

CREATE TABLE match_referees (
    match_id BIGINT NOT NULL REFERENCES matches (id) ON DELETE CASCADE,
    referee_id BIGINT NOT NULL REFERENCES referees (id) ON DELETE RESTRICT,
    role TEXT NOT NULL CHECK (
        role IN (
            'main',
            'assistant_1',
            'assistant_2',
            'fourth_official'
        )
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (match_id, role)
);

CREATE INDEX idx_match_referees_referee ON match_referees (referee_id);
