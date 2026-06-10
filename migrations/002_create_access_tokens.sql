-- 002_create_access_tokens.sql
-- One row per invited recipient. The token is the bearer credential delivered via the invite link.

CREATE TABLE IF NOT EXISTS access_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,     -- cryptographically random, url-safe (base64url)
  recipient_name TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  notify_on_view BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_access_tokens_token ON access_tokens (token);
CREATE INDEX IF NOT EXISTS idx_access_tokens_report_id ON access_tokens (report_id);
