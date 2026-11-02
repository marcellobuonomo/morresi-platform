-- Baseline: estensioni richieste dal modello dati (vedi DATA_MODEL.md §4.1)
CREATE EXTENSION IF NOT EXISTS btree_gist;  -- exclusion constraint su uuid + range
CREATE EXTENSION IF NOT EXISTS citext;      -- email case-insensitive
CREATE EXTENSION IF NOT EXISTS pg_trgm;     -- ricerca clienti per nome/telefono
