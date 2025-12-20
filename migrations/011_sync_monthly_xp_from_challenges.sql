-- Sync monthly XP for completed lift-off challenges
-- This fixes cases where challenges were completed before monthly XP tracking was added

-- For each completed challenge, update the monthly XP of winner and loser
DO $$
DECLARE
  challenge_record RECORD;
  winner_id_val UUID;
  loser_id_val UUID;
  wager_xp_val INTEGER;
BEGIN
  -- Loop through all completed challenges
  FOR challenge_record IN 
    SELECT 
      id,
      challenger_id,
      challenged_id,
      winner_id,
      wager_xp
    FROM lift_off_challenges
    WHERE status = 'completed' 
      AND winner_id IS NOT NULL
    ORDER BY updated_at ASC  -- Process oldest first
  LOOP
    winner_id_val := challenge_record.winner_id;
    wager_xp_val := challenge_record.wager_xp;
    
    -- Determine loser (the one who didn't win)
    IF winner_id_val = challenge_record.challenger_id THEN
      loser_id_val := challenge_record.challenged_id;
    ELSE
      loser_id_val := challenge_record.challenger_id;
    END IF;
    
    -- Update winner's monthly XP (add wager XP)
    UPDATE user_stats
    SET current_month_xp = COALESCE(current_month_xp, 0) + wager_xp_val
    WHERE user_id = winner_id_val;
    
    -- Update loser's monthly XP (subtract wager XP, but not below 0)
    UPDATE user_stats
    SET current_month_xp = GREATEST(0, COALESCE(current_month_xp, 0) - wager_xp_val)
    WHERE user_id = loser_id_val;
    
    RAISE NOTICE 'Synced challenge %: Winner % gained %, Loser % lost % XP', 
      challenge_record.id, 
      winner_id_val, 
      wager_xp_val,
      loser_id_val,
      wager_xp_val;
  END LOOP;
  
  RAISE NOTICE 'Monthly XP sync completed for all challenges';
END $$;

