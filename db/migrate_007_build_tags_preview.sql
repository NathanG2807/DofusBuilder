-- migrate_007: add tags and slots_preview to builds
-- tags: list of string tags chosen when publishing a build (e.g. ["eau", "multi", "do_crit"])
-- slots_preview: map of slot → image_url_icon for rendering build cards without extra API calls

ALTER TABLE builds ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]'::jsonb;
ALTER TABLE builds ADD COLUMN IF NOT EXISTS slots_preview JSONB DEFAULT '{}'::jsonb;

-- Index for filtering public builds by tags
CREATE INDEX IF NOT EXISTS idx_builds_tags ON builds USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_builds_public ON builds (is_public, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_builds_class ON builds (class_id);
