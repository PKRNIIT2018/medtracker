ALTER TABLE appointments ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE appointments ADD CONSTRAINT appointments_status_check CHECK (status = ANY (ARRAY['pending', 'confirmed', 'cancelled', 'completed']));
