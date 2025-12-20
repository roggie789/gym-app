-- Seed Data for Gym App
-- Initial exercises and gear items

-- ============================================
-- SEED EXERCISES
-- ============================================

INSERT INTO exercises (name, category, muscle_groups, description, unit) VALUES
-- Chest Exercises
('Bench Press', 'Chest', '["chest", "triceps", "shoulders"]', 'Classic chest exercise performed on a flat bench', 'kg'),
('Incline Bench Press', 'Chest', '["chest", "triceps", "shoulders"]', 'Bench press performed on an inclined bench', 'kg'),
('Decline Bench Press', 'Chest', '["chest", "triceps"]', 'Bench press performed on a declined bench', 'kg'),
('Dumbbell Flyes', 'Chest', '["chest"]', 'Isolation exercise for chest muscles', 'kg'),
('Push-ups', 'Chest', '["chest", "triceps", "shoulders"]', 'Bodyweight chest exercise', 'bodyweight'),

-- Back Exercises
('Deadlift', 'Back', '["back", "glutes", "hamstrings"]', 'Full-body compound movement', 'kg'),
('Barbell Row', 'Back', '["back", "biceps"]', 'Horizontal pulling movement for back', 'kg'),
('Pull-ups', 'Back', '["back", "biceps"]', 'Bodyweight vertical pulling exercise', 'bodyweight'),
('Lat Pulldown', 'Back', '["back", "biceps"]', 'Machine-based vertical pulling exercise', 'kg'),
('T-Bar Row', 'Back', '["back", "biceps"]', 'Unilateral back exercise', 'kg'),

-- Legs Exercises
('Squat', 'Legs', '["quadriceps", "glutes", "hamstrings"]', 'King of leg exercises', 'kg'),
('Leg Press', 'Legs', '["quadriceps", "glutes"]', 'Machine-based leg exercise', 'kg'),
('Romanian Deadlift', 'Legs', '["hamstrings", "glutes", "back"]', 'Hip-hinge movement for posterior chain', 'kg'),
('Leg Curl', 'Legs', '["hamstrings"]', 'Isolation exercise for hamstrings', 'kg'),
('Leg Extension', 'Legs', '["quadriceps"]', 'Isolation exercise for quadriceps', 'kg'),
('Calf Raise', 'Legs', '["calves"]', 'Exercise for calf muscles', 'kg'),

-- Shoulders Exercises
('Overhead Press', 'Shoulders', '["shoulders", "triceps"]', 'Vertical pressing movement', 'kg'),
('Lateral Raise', 'Shoulders', '["shoulders"]', 'Isolation exercise for side delts', 'kg'),
('Front Raise', 'Shoulders', '["shoulders"]', 'Isolation exercise for front delts', 'kg'),
('Rear Delt Fly', 'Shoulders', '["shoulders"]', 'Isolation exercise for rear delts', 'kg'),
('Arnold Press', 'Shoulders', '["shoulders", "triceps"]', 'Rotational overhead press', 'kg'),

-- Arms Exercises
('Barbell Curl', 'Arms', '["biceps"]', 'Classic bicep exercise', 'kg'),
('Tricep Dip', 'Arms', '["triceps"]', 'Bodyweight tricep exercise', 'bodyweight'),
('Hammer Curl', 'Arms', '["biceps", "forearms"]', 'Bicep exercise with neutral grip', 'kg'),
('Tricep Extension', 'Arms', '["triceps"]', 'Isolation exercise for triceps', 'kg'),
('Preacher Curl', 'Arms', '["biceps"]', 'Isolated bicep exercise', 'kg'),

-- Core Exercises
('Plank', 'Core', '["core"]', 'Isometric core exercise', 'time'),
('Russian Twist', 'Core', '["core"]', 'Rotational core exercise', 'reps'),
('Leg Raise', 'Core', '["core", "hip flexors"]', 'Lower ab exercise', 'reps'),
('Cable Crunch', 'Core', '["core"]', 'Weighted core exercise', 'kg'),
('Ab Wheel Rollout', 'Core', '["core"]', 'Advanced core exercise', 'reps');

-- ============================================
-- SEED GEAR ITEMS
-- ============================================

-- Common Gear (Level 1-5)
INSERT INTO gear_items (name, type, rarity, unlock_level, description) VALUES
('Basic T-Shirt', 'shirt', 'common', 1, 'A simple gym t-shirt to get you started'),
('Standard Shorts', 'pants', 'common', 1, 'Comfortable workout shorts'),
('Basic Sneakers', 'shoes', 'common', 2, 'Your first pair of gym shoes'),
('Wristbands', 'accessory', 'common', 2, 'Keep your wrists dry and protected'),
('Headband', 'accessory', 'common', 3, 'Keep sweat out of your eyes'),

-- Uncommon Gear (Level 6-10, PRs, Streaks)
('Training Tank', 'shirt', 'uncommon', 6, 'A sleeveless tank for better mobility'),
('Compression Shorts', 'pants', 'uncommon', 7, 'Compression gear for better performance'),
('Lifting Belt', 'accessory', 'uncommon', NULL, 'Unlock by achieving a 225lb deadlift PR'),
('Knee Sleeves', 'accessory', 'uncommon', NULL, 'Unlock by achieving a 315lb squat PR'),
('Gym Bag', 'accessory', 'uncommon', 8, 'Carry all your gear in style'),

-- Rare Gear (Level 11-15, Higher PRs)
('Pro Training Shirt', 'shirt', 'rare', 11, 'High-quality training shirt'),
('Elite Shorts', 'pants', 'rare', 12, 'Premium workout shorts'),
('Lifting Shoes', 'shoes', 'rare', NULL, 'Unlock by achieving a 405lb squat PR'),
('Weightlifting Belt', 'accessory', 'rare', NULL, 'Unlock by achieving a 495lb deadlift PR'),
('Wrist Wraps', 'accessory', 'rare', 13, 'Extra support for heavy lifts'),

-- Epic Gear (Level 16-20, Elite PRs, Long Streaks)
('Champion Tank', 'shirt', 'epic', 16, 'Reserved for dedicated lifters'),
('Elite Training Pants', 'pants', 'epic', 17, 'Top-tier workout pants'),
('Competition Shoes', 'shoes', 'epic', NULL, 'Unlock by achieving a 315lb bench press PR'),
('Powerlifting Belt', 'accessory', 'epic', NULL, 'Unlock by maintaining a 30-day streak'),
('Championship Wrist Straps', 'accessory', 'epic', 18, 'Elite-level wrist support'),

-- Legendary Gear (Level 21+, World-Class PRs, Epic Streaks)
('Legendary Shirt', 'shirt', 'legendary', 21, 'The ultimate training shirt'),
('Mythic Shorts', 'pants', 'legendary', 22, 'Legendary workout gear'),
('Elite Lifting Shoes', 'shoes', 'legendary', NULL, 'Unlock by achieving a 500lb deadlift PR'),
('Champion Belt', 'accessory', 'legendary', NULL, 'Unlock by maintaining a 60-day streak'),
('Crown of Strength', 'helmet', 'legendary', 25, 'The ultimate symbol of dedication');

-- Update gear items with proper JSONB for PR requirements
-- Note: These reference exercises by name. In production, you'd want to reference exercise IDs
UPDATE gear_items 
SET unlock_pr_requirement = '{"exercise_name": "Deadlift", "weight": 225}'::jsonb
WHERE name = 'Lifting Belt';

UPDATE gear_items 
SET unlock_pr_requirement = '{"exercise_name": "Squat", "weight": 315}'::jsonb
WHERE name = 'Knee Sleeves';

UPDATE gear_items 
SET unlock_pr_requirement = '{"exercise_name": "Squat", "weight": 405}'::jsonb
WHERE name = 'Lifting Shoes';

UPDATE gear_items 
SET unlock_pr_requirement = '{"exercise_name": "Deadlift", "weight": 495}'::jsonb
WHERE name = 'Weightlifting Belt';

UPDATE gear_items 
SET unlock_pr_requirement = '{"exercise_name": "Bench Press", "weight": 315}'::jsonb
WHERE name = 'Competition Shoes';

UPDATE gear_items 
SET unlock_pr_requirement = '{"exercise_name": "Deadlift", "weight": 500}'::jsonb
WHERE name = 'Elite Lifting Shoes';

UPDATE gear_items 
SET unlock_streak_requirement = 30
WHERE name = 'Powerlifting Belt';

UPDATE gear_items 
SET unlock_streak_requirement = 60
WHERE name = 'Champion Belt';

