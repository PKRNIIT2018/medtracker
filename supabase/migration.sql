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

DROP POLICY IF EXISTS "user_settings_all" ON user_settings;
CREATE POLICY "user_settings_all"
  ON user_settings
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 2. medications
CREATE TABLE IF NOT EXISTS medications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        CITEXT NOT NULL,
  type        CITEXT NOT NULL CHECK (type IN ('tablet', 'liquid', 'injection')),
  strength    VARCHAR(100) NOT NULL,
  time_of_day      TEXT[] NOT NULL DEFAULT '{}',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  active_substance VARCHAR(300),
  product_links    TEXT,
  ai_summary       TEXT,
  deleted_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medications_user_id      ON medications (user_id);
CREATE INDEX IF NOT EXISTS idx_medications_user_date    ON medications (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_medications_time_of_day  ON medications USING GIN (time_of_day);
CREATE INDEX IF NOT EXISTS idx_medications_active       ON medications (is_active) WHERE deleted_at IS NULL;

ALTER TABLE medications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_medications_all" ON medications;
CREATE POLICY "user_medications_all"
  ON medications
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 3. medication_doses
CREATE TABLE IF NOT EXISTS medication_doses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  dose_time     TIME NOT NULL,
  amount        VARCHAR(100) NOT NULL,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medication_doses_user_id       ON medication_doses (user_id);
CREATE INDEX IF NOT EXISTS idx_medication_doses_medication_id ON medication_doses (medication_id) WHERE deleted_at IS NULL;

ALTER TABLE medication_doses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_medication_doses_all" ON medication_doses;
CREATE POLICY "user_medication_doses_all"
  ON medication_doses
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. medication_intake
CREATE TABLE IF NOT EXISTS medication_intake (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  dose_id       UUID REFERENCES medication_doses(id) ON DELETE SET NULL,
  taken_date    DATE NOT NULL,
  taken_time    TIME,
  status        CITEXT NOT NULL CHECK (status IN ('taken', 'skipped', 'rescheduled')),
  notes         VARCHAR(1000),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_unique
  ON medication_intake (user_id, medication_id, dose_id, taken_date)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intake_user_id ON medication_intake (user_id);
CREATE INDEX IF NOT EXISTS idx_intake_date    ON medication_intake (taken_date) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_intake_status  ON medication_intake (status) WHERE deleted_at IS NULL;

ALTER TABLE medication_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_medication_intake_all" ON medication_intake;
CREATE POLICY "user_medication_intake_all"
  ON medication_intake
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 5. blood_sugar
CREATE TABLE IF NOT EXISTS blood_sugar (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  reading_time TIME,
  meal_slot    CITEXT NOT NULL CHECK (
    meal_slot IN ('before_breakfast', 'before_lunch', 'before_dinner')
  ),
  level_mgdl   NUMERIC(5,1) NOT NULL CHECK (level_mgdl >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_sugar_user_id     ON blood_sugar (user_id);
CREATE INDEX IF NOT EXISTS idx_blood_sugar_user_date   ON blood_sugar (user_id, reading_date);
CREATE INDEX IF NOT EXISTS idx_blood_sugar_meal_slot   ON blood_sugar (meal_slot) WHERE deleted_at IS NULL;

ALTER TABLE blood_sugar ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blood_sugar_all" ON blood_sugar;
CREATE POLICY "user_blood_sugar_all"
  ON blood_sugar
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 6. blood_pressure
CREATE TABLE IF NOT EXISTS blood_pressure (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  reading_time TIME,
  systolic     NUMERIC(4,0) NOT NULL CHECK (systolic >= 0),
  diastolic    NUMERIC(4,0) NOT NULL CHECK (diastolic >= 0),
  heart_rate   NUMERIC(3,0) CHECK (heart_rate >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_id   ON blood_pressure (user_id);
CREATE INDEX IF NOT EXISTS idx_blood_pressure_user_date ON blood_pressure (user_id, reading_date);

ALTER TABLE blood_pressure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_blood_pressure_all" ON blood_pressure;
CREATE POLICY "user_blood_pressure_all"
  ON blood_pressure
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 7. hba1c
CREATE TABLE IF NOT EXISTS hba1c (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  percentage   NUMERIC(4,1) NOT NULL CHECK (percentage >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hba1c_user_id   ON hba1c (user_id);
CREATE INDEX IF NOT EXISTS idx_hba1c_user_date ON hba1c (user_id, reading_date);

ALTER TABLE hba1c ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_hba1c_all" ON hba1c;
CREATE POLICY "user_hba1c_all"
  ON hba1c
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 8. weight_log
CREATE TABLE IF NOT EXISTS weight_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reading_date DATE NOT NULL,
  weight_kg    NUMERIC(5,1) NOT NULL CHECK (weight_kg >= 0),
  notes        VARCHAR(1000),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_weight_log_user_id   ON weight_log (user_id);
CREATE INDEX IF NOT EXISTS idx_weight_log_user_date ON weight_log (user_id, reading_date);

ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_weight_log_all" ON weight_log;
CREATE POLICY "user_weight_log_all"
  ON weight_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 9. water_intake
CREATE TABLE IF NOT EXISTS water_intake (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  amount_ml  NUMERIC(5,0) NOT NULL CHECK (amount_ml >= 0),
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_water_intake_user_id   ON water_intake (user_id);
CREATE INDEX IF NOT EXISTS idx_water_intake_user_date ON water_intake (user_id, entry_date);

ALTER TABLE water_intake ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_water_intake_all" ON water_intake;
CREATE POLICY "user_water_intake_all"
  ON water_intake
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 10. activity_log
CREATE TABLE IF NOT EXISTS activity_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date      DATE NOT NULL,
  steps           INTEGER CHECK (steps >= 0),
  calories_burned INTEGER CHECK (calories_burned >= 0),
  notes           VARCHAR(1000),
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id   ON activity_log (user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_user_date ON activity_log (user_id, entry_date);

ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_activity_log_all" ON activity_log;
CREATE POLICY "user_activity_log_all"
  ON activity_log
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 11. medical_history
CREATE TABLE IF NOT EXISTS medical_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category    CITEXT NOT NULL CHECK (category IN ('condition', 'surgery', 'allergy')),
  title       VARCHAR(300) NOT NULL,
  description VARCHAR(2000),
  event_date  DATE,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medical_history_user_id   ON medical_history (user_id);
CREATE INDEX IF NOT EXISTS idx_medical_history_category  ON medical_history (category) WHERE deleted_at IS NULL;

ALTER TABLE medical_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_medical_history_all" ON medical_history;
CREATE POLICY "user_medical_history_all"
  ON medical_history
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 12. quarterly_results
CREATE TABLE IF NOT EXISTS quarterly_results (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  result_date   DATE NOT NULL,
  quarter_label VARCHAR(20) NOT NULL,
  notes         VARCHAR(1000),
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quarterly_results_user_id   ON quarterly_results (user_id);
CREATE INDEX IF NOT EXISTS idx_quarterly_results_user_date ON quarterly_results (user_id, result_date);

ALTER TABLE quarterly_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_quarterly_results_all" ON quarterly_results;
CREATE POLICY "user_quarterly_results_all"
  ON quarterly_results
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 13. quarterly_result_metrics
CREATE TABLE IF NOT EXISTS quarterly_result_metrics (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quarterly_result_id UUID NOT NULL REFERENCES quarterly_results(id) ON DELETE CASCADE,
  metric_name         VARCHAR(100) NOT NULL,
  value               NUMERIC(10,2) NOT NULL,
  unit                VARCHAR(50),
  normal_range        VARCHAR(100),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qr_metrics_user_id   ON quarterly_result_metrics (user_id);
CREATE INDEX IF NOT EXISTS idx_qr_metrics_result_id ON quarterly_result_metrics (quarterly_result_id);

ALTER TABLE quarterly_result_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_qr_metrics_all" ON quarterly_result_metrics;
CREATE POLICY "user_qr_metrics_all"
  ON quarterly_result_metrics
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Auto-Update Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON user_settings
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_medications_updated_at ON medications;
CREATE TRIGGER trg_medications_updated_at
  BEFORE UPDATE ON medications
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

-- Trigger: auto-create user_settings row on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Migration: time_of_day from single value to array
ALTER TABLE medications DROP CONSTRAINT IF EXISTS medications_time_of_day_check;
ALTER TABLE medications ALTER COLUMN time_of_day TYPE TEXT[] USING ARRAY[time_of_day];
ALTER TABLE medications ALTER COLUMN time_of_day SET DEFAULT '{}';
ALTER TABLE medications ALTER COLUMN time_of_day SET NOT NULL;
DROP INDEX IF EXISTS idx_medications_time_of_day;
CREATE INDEX IF NOT EXISTS idx_medications_time_of_day ON medications USING GIN (time_of_day);

-- Grant table permissions to roles (needed because tables created via SQL Editor)
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO authenticated, service_role;
