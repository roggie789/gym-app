-- Create lift_off_challenges table
CREATE TABLE IF NOT EXISTS lift_off_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  wager_xp INTEGER NOT NULL CHECK (wager_xp > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  challenger_weight DECIMAL(10, 2),
  challenged_weight DECIMAL(10, 2),
  challenger_completed_at TIMESTAMPTZ,
  challenged_completed_at TIMESTAMPTZ,
  winner_id UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_lift_off_challenges_challenger ON lift_off_challenges(challenger_id);
CREATE INDEX IF NOT EXISTS idx_lift_off_challenges_challenged ON lift_off_challenges(challenged_id);
CREATE INDEX IF NOT EXISTS idx_lift_off_challenges_status ON lift_off_challenges(status);
CREATE INDEX IF NOT EXISTS idx_lift_off_challenges_expires_at ON lift_off_challenges(expires_at);

-- Create updated_at trigger
DROP TRIGGER IF EXISTS update_lift_off_challenges_updated_at ON lift_off_challenges;
CREATE TRIGGER update_lift_off_challenges_updated_at
  BEFORE UPDATE ON lift_off_challenges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

