-- Backfill published_at for MVPs that were approved before this column was set.
-- Uses approved_at if available, otherwise falls back to created_at.
-- Run this once in Supabase Dashboard → SQL Editor.

UPDATE mvps
SET published_at = COALESCE(approved_at, created_at)
WHERE status = 'approved'
  AND published_at IS NULL;
