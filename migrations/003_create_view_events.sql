-- 003_create_view_events.sql
-- One row per (token, day) view. session_duration_seconds is updated by session-ping.

CREATE TABLE IF NOT EXISTS view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_id UUID NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  session_duration_seconds INT          -- updated when viewer leaves or navigates away
);

CREATE INDEX IF NOT EXISTS idx_view_events_token_id ON view_events (access_token_id);

-- Used to enforce "one view event per token per day".
CREATE INDEX IF NOT EXISTS idx_view_events_token_day
  ON view_events (access_token_id, (viewed_at::date));
