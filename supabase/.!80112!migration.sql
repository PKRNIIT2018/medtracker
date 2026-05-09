-- MedTracker Database Schema
-- Run this in Supabase SQL Editor

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- 1. user_settings
CREATE TABLE IF NOT EXISTS user_settings (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sugar_unit CITEXT NOT NULL DEFAULT 'mg/dL' CHECK (sugar_unit IN ('mg/dL', 'mmol/L')),
  daily_water_goal_ml NUMERIC(5,0) NOT NULL DEFAULT 2000 CHECK (daily_water_goal_ml >= 0),
  theme      CITEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
  notifications_enabled       BOOLEAN NOT NULL DEFAULT true,
  medication_reminder_enabled BOOLEAN NOT NULL DEFAULT true,
  sugar_reminder_enabled      BOOLEAN NOT NULL DEFAULT true,
  water_reminder_enabled      BOOLEAN NOT NULL DEFAULT false,
  reminder_window_start TIME NOT NULL DEFAULT '08:00',
  reminder_window_end   TIME NOT NULL DEFAULT '22:00',
  app_pin_hash          TEXT,
  app_pin_enabled       BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings (user_id);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

