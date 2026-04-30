-- À exécuter une fois sur une base déjà créée (avant cette colonne).
ALTER TABLE builds ADD COLUMN IF NOT EXISTS total_stats JSONB;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS active_set_bonuses JSONB;
