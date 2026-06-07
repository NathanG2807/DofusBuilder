-- Migration 006 : Ajout de la colonne locked_slots sur la table builds
-- Stocke les emplacements verrouillés (slot_id → ankama_id) au format JSONB.

ALTER TABLE builds
    ADD COLUMN IF NOT EXISTS locked_slots JSONB DEFAULT NULL;
