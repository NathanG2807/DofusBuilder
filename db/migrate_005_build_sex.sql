-- Ajout du sexe du personnage dans les builds
ALTER TABLE builds ADD COLUMN IF NOT EXISTS sex VARCHAR(10);
