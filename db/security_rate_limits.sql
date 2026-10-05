-- Shared, atomic abuse protection. Apply before deploying the security upgrade.
CREATE TABLE IF NOT EXISTS security_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS security_rate_limits_expiry_idx ON security_rate_limits (expires_at);
ALTER TABLE security_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON security_rate_limits FROM PUBLIC;
-- Supabase default privileges grant anon/authenticated directly, not via PUBLIC.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON security_rate_limits FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON security_rate_limits FROM authenticated;
  END IF;
END $$;
-- Run periodically (for example daily) from a trusted database maintenance job:
-- DELETE FROM security_rate_limits WHERE expires_at < NOW() - INTERVAL '1 day';
