-- Shared, atomic abuse protection. Apply before deploying the security upgrade.
CREATE TABLE IF NOT EXISTS security_rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL DEFAULT 1,
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS security_rate_limits_expiry_idx ON security_rate_limits (expires_at);
ALTER TABLE security_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON security_rate_limits FROM PUBLIC;
-- Run periodically (for example daily) from a trusted database maintenance job:
-- DELETE FROM security_rate_limits WHERE expires_at < NOW() - INTERVAL '1 day';
