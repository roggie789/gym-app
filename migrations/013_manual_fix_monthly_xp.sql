-- Manually fix monthly XP for specific users
-- Couchy: Set to 96
-- Roggie789: Set to level 1 XP (100) + level 2 XP (283) + 512 = 895

-- XP formula: 100 * level^1.5 (rounded)
-- Level 1: 100 * 1^1.5 = 100
-- Level 2: 100 * 2^1.5 = 100 * 2.828 = 283 (rounded)
-- Total for roggie789: 100 + 283 + 512 = 895

DO $$
DECLARE
  couchy_user_id UUID;
  roggie_user_id UUID;
  current_month_str VARCHAR(7);
BEGIN
  -- Get current month
  current_month_str := TO_CHAR(NOW(), 'YYYY-MM');
  
  -- Find Couchy's user ID (by username or email)
  SELECT id INTO couchy_user_id
  FROM auth.users
  WHERE email LIKE '%couchy%' OR email LIKE '%couch%'
  LIMIT 1;
  
  -- If not found by email, try user_profiles
  IF couchy_user_id IS NULL THEN
    SELECT id INTO couchy_user_id
    FROM user_profiles
    WHERE username ILIKE '%couchy%' OR username ILIKE '%couch%'
    LIMIT 1;
  END IF;
  
  -- Find Roggie789's user ID
  SELECT id INTO roggie_user_id
  FROM auth.users
  WHERE email LIKE '%roggie789%' OR email LIKE '%roggie789%'
  LIMIT 1;
  
  -- If not found by email, try user_profiles
  IF roggie_user_id IS NULL THEN
    SELECT id INTO roggie_user_id
    FROM user_profiles
    WHERE username ILIKE '%roggie789%' OR username ILIKE '%roggie789%'
    LIMIT 1;
  END IF;
  
  -- Update Couchy's monthly XP to 96
  IF couchy_user_id IS NOT NULL THEN
    UPDATE user_stats
    SET 
      current_month_xp = 96,
      current_month = current_month_str
    WHERE user_id = couchy_user_id;
    
    RAISE NOTICE 'Updated Couchy (user_id: %) monthly XP to 96', couchy_user_id;
  ELSE
    RAISE NOTICE 'WARNING: Could not find Couchy user';
  END IF;
  
  -- Update Roggie789's monthly XP to 895 (level 1: 100 + level 2: 283 + 512)
  IF roggie_user_id IS NOT NULL THEN
    UPDATE user_stats
    SET 
      current_month_xp = 895,
      current_month = current_month_str
    WHERE user_id = roggie_user_id;
    
    RAISE NOTICE 'Updated Roggie789 (user_id: %) monthly XP to 895', roggie_user_id;
  ELSE
    RAISE NOTICE 'WARNING: Could not find Roggie789 user';
  END IF;
  
  RAISE NOTICE 'Manual monthly XP fix completed';
END $$;

