ALTER TABLE blood_sugar DROP CONSTRAINT IF EXISTS blood_sugar_meal_slot_check;
ALTER TABLE blood_sugar ADD CONSTRAINT blood_sugar_meal_slot_check CHECK (meal_slot = ANY (ARRAY[
  'before_breakfast'::citext,
  'after_breakfast'::citext,
  'before_lunch'::citext,
  'after_lunch'::citext,
  'before_dinner'::citext,
  'after_dinner'::citext,
  'fasting'::citext,
  'bedtime'::citext
]));
