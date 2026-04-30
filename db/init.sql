-- DIA schema (see DIA_SPEC.md). Runs once on first container init.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE items (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    level INTEGER NOT NULL,
    type_name_id VARCHAR(100),
    is_weapon BOOLEAN DEFAULT FALSE,
    image_url_icon TEXT,
    effects JSONB,
    conditions JSONB,
    parent_set_id INTEGER,
    pods INTEGER,
    base_stats JSONB,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE item_sets (
    ankama_id INTEGER PRIMARY KEY,
    name VARCHAR(255),
    equipment_ids INTEGER[],
    bonus_effects JSONB
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE builds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    class_id INTEGER,
    level INTEGER,
    slots JSONB,
    total_stats JSONB,
    active_set_bonuses JSONB,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
