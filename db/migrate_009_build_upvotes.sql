-- migrate_009: upvotes on public builds
-- upvote_count: denormalized counter for fast sorting in the stuffs catalog
-- build_upvotes: one vote per user per build

ALTER TABLE builds ADD COLUMN IF NOT EXISTS upvote_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS build_upvotes (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    build_id UUID NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, build_id)
);

CREATE INDEX IF NOT EXISTS idx_build_upvotes_build_id ON build_upvotes (build_id);
CREATE INDEX IF NOT EXISTS idx_builds_public_upvotes ON builds (is_public, upvote_count DESC, updated_at DESC);
