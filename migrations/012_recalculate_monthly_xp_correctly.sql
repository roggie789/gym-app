-- Recalculate monthly XP from scratch for the current month
-- This fixes cases where the sync script was run multiple times
-- It recalculates based on actual workout sessions and challenges completed THIS month only

DO $$
DECLARE
  user_record RECORD;
  current_month_str VARCHAR(7);
  workout_xp INTEGER;
  challenge_xp_gained INTEGER;
  challenge_xp_lost INTEGER;
  calculated_monthly_xp INTEGER;
BEGIN
  -- Get current month
  current_month_str := TO_CHAR(NOW(), 'YYYY-MM');
  
  RAISE NOTICE 'Recalculating monthly XP for month: %', current_month_str;
  
  -- Loop through all users
  FOR user_record IN 
    SELECT user_id, current_month_xp, current_month
    FROM user_stats
  LOOP
    -- Reset counters
    workout_xp := 0;
    challenge_xp_gained := 0;
    challenge_xp_lost := 0;
    
    -- Calculate XP from workout sessions in current month
    SELECT COALESCE(SUM(total_xp), 0) INTO workout_xp
    FROM workout_sessions
    WHERE user_id = user_record.user_id
      AND TO_CHAR(session_date, 'YYYY-MM') = current_month_str;
    
    -- Calculate XP gained from challenges won in current month
    SELECT COALESCE(SUM(wager_xp), 0) INTO challenge_xp_gained
    FROM lift_off_challenges
    WHERE winner_id = user_record.user_id
      AND status = 'completed'
      AND winner_id IS NOT NULL
      AND TO_CHAR(updated_at, 'YYYY-MM') = current_month_str;
    
    -- Calculate XP lost from challenges lost in current month
    SELECT COALESCE(SUM(wager_xp), 0) INTO challenge_xp_lost
    FROM lift_off_challenges
    WHERE status = 'completed'
      AND winner_id IS NOT NULL
      AND winner_id != user_record.user_id
      AND (
        (challenger_id = user_record.user_id AND winner_id = challenged_id) OR
        (challenged_id = user_record.user_id AND winner_id = challenger_id)
      )
      AND TO_CHAR(updated_at, 'YYYY-MM') = current_month_str;
    
    -- Calculate total monthly XP
    calculated_monthly_xp := workout_xp + challenge_xp_gained - challenge_xp_lost;
    
    -- Ensure it doesn't go below 0
    calculated_monthly_xp := GREATEST(0, calculated_monthly_xp);
    
    -- Update user stats
    UPDATE user_stats
    SET 
      current_month_xp = calculated_monthly_xp,
      current_month = current_month_str
    WHERE user_id = user_record.user_id;
    
    RAISE NOTICE 'User %: Workout XP: %, Challenge Gained: %, Challenge Lost: %, Total: % (was %)', 
      user_record.user_id,
      workout_xp,
      challenge_xp_gained,
      challenge_xp_lost,
      calculated_monthly_xp,
      user_record.current_month_xp;
  END LOOP;
  
  RAISE NOTICE 'Monthly XP recalculation completed';
END $$;

