-- 003_create_view_events.sql
-- One row per (token, day) view. session_duration_seconds is updated by session-ping.

CREATE TABLE IF NOT EXISTS view_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  access_token_id UUID NOT NULL REFERENCES access_tokens(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ DEFAULT NOW(),
  session_duration_seconds INT          -- updated when viewer leaves or navigates away
);

CREATE INDEX IF NOT EXISTS idx_view_events_token_id ON view_events (access_token_id);

-- Supports "one view event per token per day" lookups.
-- viewed_at::date is not IMMUTABLE (depends on session TimeZone), so it cannot be
-- used in an index expression. Pin the day to UTC, which is immutable.
CREATE INDEX IF NOT EXISTS idx_view_events_token_day
  ON view_events (access_token_id, ((viewed_at AT TIME ZONE 'UTC')::date));
