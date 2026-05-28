-- Migration: add_envelopes_and_gamification
-- Generated: 2026-05-27

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS "Envelope" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "categoryId" uuid NULL,
  "name" varchar(140) NOT NULL,
  "budgetAmount" numeric(14,2) NOT NULL,
  "currentSpent" numeric(14,2) NOT NULL DEFAULT 0,
  "month" integer NOT NULL,
  "year" integer NOT NULL,
  "color" varchar(20) NOT NULL,
  "icon" varchar(80) NOT NULL,
  "createdAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Envelope_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Envelope_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Envelope_userId_month_year_idx" ON "Envelope" ("userId", "month", "year");
CREATE INDEX IF NOT EXISTS "Envelope_categoryId_idx" ON "Envelope" ("categoryId");

CREATE TABLE IF NOT EXISTS "StreakRecord" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "date" timestamp(3) NOT NULL,
  "withinBudget" boolean NOT NULL,
  "streakCount" integer NOT NULL,
  CONSTRAINT "StreakRecord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "StreakRecord_userId_date_key" ON "StreakRecord" ("userId", "date");
CREATE INDEX IF NOT EXISTS "StreakRecord_userId_date_idx" ON "StreakRecord" ("userId", "date");

CREATE TABLE IF NOT EXISTS "Badge" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId" uuid NOT NULL,
  "type" varchar(80) NOT NULL,
  "earnedAt" timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" jsonb NOT NULL,
  CONSTRAINT "Badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Badge_userId_type_key" ON "Badge" ("userId", "type");
CREATE INDEX IF NOT EXISTS "Badge_userId_earnedAt_idx" ON "Badge" ("userId", "earnedAt");
