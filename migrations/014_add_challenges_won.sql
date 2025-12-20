-- Add challenges_won column to user_stats
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS challenges_won INTEGER NOT NULL DEFAULT 0;

-- Backfill challenges_won from completed lift_off_challenges
UPDATE user_stats
SET challenges_won = (
  SELECT COUNT(*)
  FROM lift_off_challenges
  WHERE lift_off_challenges.winner_id = user_stats.user_id
    AND lift_off_challenges.status = 'completed'
    AND lift_off_challenges.winner_id IS NOT NULL
);

