-- Migration: add_advisor_cache
-- Generated: 2026-05-27

-- Ensure uuid generation function is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create AdvisorCache table
CREATE TABLE IF NOT EXISTS "AdvisorCache" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "insights" jsonb NOT NULL,
  "financialContext" jsonb NOT NULL,
  "generatedAt" timestamptz NOT NULL DEFAULT now(),
  "expiresAt" timestamptz NOT NULL
);

-- Index to query recent caches per user
CREATE INDEX IF NOT EXISTS "AdvisorCache_userId_generatedAt_idx" ON "AdvisorCache" ("userId", "generatedAt");
