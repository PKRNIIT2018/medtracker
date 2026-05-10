ALTER TABLE water_intake ADD COLUMN beverage_type text NOT NULL DEFAULT 'water';
ALTER TABLE water_intake ADD CONSTRAINT water_intake_beverage_type_check CHECK (beverage_type = ANY (ARRAY['water', 'tea', 'coffee', 'beer', 'alcohol']));
