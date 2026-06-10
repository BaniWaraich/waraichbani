-- 001_create_reports.sql
-- Reports published by Bani. Each report is backed by an HTML file stored in Vercel Blob.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  file_url TEXT NOT NULL,         -- Vercel Blob URL of the uploaded HTML file
  archived BOOLEAN DEFAULT FALSE, -- soft-delete flag
  allow_download BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_slug ON reports (slug);
