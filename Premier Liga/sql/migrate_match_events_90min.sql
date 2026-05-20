-- Migracija: minuti događaja u regularnom vremenu 1–90 (starije baze su dopuštale >90).
-- Pokreni jednom, zatim uskladi ostale CHECK-e sa postgresql_match_events.sql po potrebi.
--
-- Primjer (psql):
--   \i migrate_match_events_90min.sql

BEGIN;

UPDATE match_events
SET minute = 90
WHERE minute > 90;

UPDATE match_events
SET minute = 1
WHERE minute < 1;

-- Ukloni stari inline CHECK na minute ako postoji (PostgreSQL 15+ često: match_events_minute_check).
ALTER TABLE match_events
    DROP CONSTRAINT IF EXISTS match_events_minute_check;

ALTER TABLE match_events
    ADD CONSTRAINT match_events_minute_regulation
    CHECK (minute >= 1 AND minute <= 90);

COMMIT;
