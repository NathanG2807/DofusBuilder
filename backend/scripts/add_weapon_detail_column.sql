-- À exécuter une fois sur la base Postgres (après déploiement du modèle).
ALTER TABLE items ADD COLUMN IF NOT EXISTS weapon_detail JSONB;
