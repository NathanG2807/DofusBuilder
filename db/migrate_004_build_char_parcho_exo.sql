-- Ajout des colonnes pour la répartition des stats et les exos forgemagie
ALTER TABLE builds ADD COLUMN IF NOT EXISTS char_stats JSONB;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS parcho_stats JSONB;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS exo_fm JSONB;
