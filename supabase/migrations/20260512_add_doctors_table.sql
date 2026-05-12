-- Add doctors table for multi-doctor support

CREATE TABLE IF NOT EXISTS doctors (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        VARCHAR(200) NOT NULL,
  specialty   VARCHAR(200),
  phone       VARCHAR(50),
  email       VARCHAR(200),
  is_primary  BOOLEAN NOT NULL DEFAULT false,
  notes       TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doctors_user_id ON doctors (user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_doctors_primary ON doctors (user_id, is_primary) WHERE is_primary = true AND deleted_at IS NULL;

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_doctors_all" ON doctors;
CREATE POLICY "user_doctors_all"
  ON doctors
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_doctors_updated_at ON doctors;
CREATE TRIGGER trg_doctors_updated_at
  BEFORE UPDATE ON doctors
  FOR EACH ROW
  WHEN (OLD.* IS DISTINCT FROM NEW.*)
  EXECUTE FUNCTION update_updated_at();

-- Migrate existing doctor_name from user_settings into doctors table
INSERT INTO doctors (user_id, name, is_primary)
  SELECT user_id, doctor_name, true
  FROM user_settings
  WHERE doctor_name IS NOT NULL
  AND doctor_name != ''
  AND NOT EXISTS (
    SELECT 1 FROM doctors d WHERE d.user_id = user_settings.user_id AND d.name = user_settings.doctor_name
  );

-- Grant permissions
GRANT ALL ON doctors TO authenticated, service_role;
