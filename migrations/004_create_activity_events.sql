-- 004_create_activity_events.sql
-- Generic activity feed for a report: published, invite_sent, token_revoked, html_replaced, archived.
-- View events live in their own table but are merged into the feed at read time.

CREATE TABLE IF NOT EXISTS activity_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,            -- 'published' | 'invite_sent' | 'token_revoked' | 'html_replaced' | 'archived'
  detail TEXT,                   -- human-readable context (e.g. recipient email)
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_events_report_id ON activity_events (report_id, created_at DESC);
