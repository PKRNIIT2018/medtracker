-- Rename column to reflect mmol/L storage
ALTER TABLE blood_sugar RENAME COLUMN level_mgdl TO level;
ALTER TABLE blood_sugar DROP CONSTRAINT IF EXISTS blood_sugar_level_mgdl_check;
ALTER TABLE blood_sugar ADD CONSTRAINT blood_sugar_level_check CHECK (level >= 0.5 AND level <= 60);
