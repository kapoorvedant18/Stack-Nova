-- Add soft-delete support to emails so synced emails that are deleted
-- are never re-imported by the provider sync.
ALTER TABLE public.emails
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Index for fast lookup of deleted externalId+provider combos during sync
CREATE INDEX IF NOT EXISTS idx_emails_deleted_external
  ON public.emails (user_id, external_id, provider)
  WHERE deleted_at IS NOT NULL;