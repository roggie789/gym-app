-- Update units from lbs to kg
-- This migration updates the default unit and all existing exercise units

-- Update default unit in exercises table
ALTER TABLE exercises ALTER COLUMN unit SET DEFAULT 'kg';

-- Update all exercises that use 'lbs' to 'kg' (keep 'bodyweight', 'time', 'reps' as is)
UPDATE exercises 
SET unit = 'kg' 
WHERE unit = 'lbs';

-- Note: If you have existing user data with weights in lbs, you may want to convert them
-- For new users, this won't be an issue
-- For existing users, you could run a conversion script if needed:
-- UPDATE personal_records SET weight = weight * 0.453592 WHERE exercise_id IN (SELECT id FROM exercises WHERE unit = 'kg');
-- UPDATE user_stats SET bodyweight = bodyweight * 0.453592 WHERE bodyweight IS NOT NULL;

