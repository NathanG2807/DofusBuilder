-- Recettes sur les items (ETL dofusdu).
ALTER TABLE items ADD COLUMN IF NOT EXISTS recipe JSONB;

-- Listes de craft utilisateur (L'Atelier).
CREATE TABLE IF NOT EXISTS craft_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    entries JSONB NOT NULL DEFAULT '[]',
    progress JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_craft_lists_user_id ON craft_lists(user_id);
