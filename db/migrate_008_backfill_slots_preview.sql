-- migrate_008: Backfill slots_preview for existing builds
-- For each build with non-empty slots but no slots_preview,
-- populate slots_preview with { slot: image_url_icon } from the items table.
-- Safe to run multiple times (IF NOT EXISTS / WHERE conditions).

UPDATE builds b
SET slots_preview = sub.preview
FROM (
  SELECT
    b2.id,
    jsonb_object_agg(
      slot_entry.slot_key,
      COALESCE(i.image_url_icon, NULL)
    ) AS preview
  FROM builds b2,
       jsonb_each(b2.slots) AS slot_entry(slot_key, slot_value)
  LEFT JOIN items i
    ON i.ankama_id = (
      CASE
        WHEN slot_entry.slot_value::text = 'null' THEN NULL
        ELSE slot_entry.slot_value::text::integer
      END
    )
  WHERE b2.slots IS NOT NULL
    AND b2.slots != '{}'::jsonb
    AND (b2.slots_preview IS NULL OR b2.slots_preview = '{}'::jsonb)
    AND slot_entry.slot_value::text != 'null'
  GROUP BY b2.id
) sub
WHERE b.id = sub.id;
