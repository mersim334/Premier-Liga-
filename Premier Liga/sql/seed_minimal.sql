-- Minimalni ASCII seed; jedna transakcija -- ili sve ili ništa.
-- Eksplicitni id vrijednosti osiguravaju FK (timovi baš id 1 i 2).

BEGIN;

TRUNCATE match_events, players, matches, teams, seasons RESTART IDENTITY CASCADE;

INSERT INTO seasons (id, name, start_date, end_date, is_current)
VALUES (1, '2025/26', '2025-08-01', NULL, TRUE);

INSERT INTO teams (id, name, city, stadium, coach) VALUES
    (1, 'FK Zeljeznicar', 'Sarajevo', 'Stadion Grbavica', NULL),
    (2, 'FK Sarajevo', 'Sarajevo', 'Stadion Asim Ferhatovic Hase', NULL);

INSERT INTO matches (
    id, season_id, round_no, match_date, kickoff_at,
    home_team_id, away_team_id, home_goals, away_goals, status
) VALUES (
    1, 1, 1, '2025-08-03', NULL,
    1, 2, 2, 1, 'finished'
);

INSERT INTO players (id, season_id, team_id, full_name, shirt_number, position) VALUES
    (1, 1, 1, 'Marko Primjer', 10, 'MF'),
    (2, 1, 2, 'Ivan Primjer', 9, 'FW');

INSERT INTO match_events (
    id, match_id, team_id, minute, minute_added, event_type, player_id, related_player_id
)
VALUES (1, 1, 1, 23, NULL, 'goal', 1, NULL);

SELECT setval(pg_get_serial_sequence('seasons', 'id'), COALESCE((SELECT MAX(id) FROM seasons), 1));
SELECT setval(pg_get_serial_sequence('teams', 'id'), COALESCE((SELECT MAX(id) FROM teams), 1));
SELECT setval(pg_get_serial_sequence('matches', 'id'), COALESCE((SELECT MAX(id) FROM matches), 1));
SELECT setval(pg_get_serial_sequence('players', 'id'), COALESCE((SELECT MAX(id) FROM players), 1));
SELECT setval(pg_get_serial_sequence('match_events', 'id'), COALESCE((SELECT MAX(id) FROM match_events), 1));

COMMIT;
