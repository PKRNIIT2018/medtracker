-- Add a proper time_slot column to medication_intake
-- Previously the notes field was overloaded to store time-of-day values

ALTER TABLE medication_intake
ADD COLUMN IF NOT EXISTS time_slot CITEXT
CHECK (time_slot IN ('morning', 'afternoon', 'evening'));

-- Backfill existing data where notes contains a known slot value
UPDATE medication_intake
SET time_slot = notes::CITEXT
WHERE notes IN ('morning', 'afternoon', 'evening');

-- Replace the old unique index (which relied on dose_id) with one that uses time_slot
DROP INDEX IF EXISTS idx_intake_unique;
CREATE UNIQUE INDEX IF NOT EXISTS idx_intake_unique_slot
  ON medication_intake (user_id, medication_id, taken_date, time_slot)
  WHERE deleted_at IS NULL AND time_slot IS NOT NULL;
