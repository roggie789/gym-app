-- E1RM (Estimated One-Rep Max) tracking table
-- Stores the best E1RM per exercise per user, with a 30-day expiry window.
-- E1RM is only calculated from sets of 12 reps or fewer.
CREATE TABLE IF NOT EXISTS exercise_e1rm (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  e1rm_value DECIMAL(8,2) NOT NULL,
  source_weight DECIMAL(8,2) NOT NULL,
  source_reps INTEGER NOT NULL,
  set_date DATE NOT NULL,
  expires_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, exercise_id)
);

CREATE INDEX IF NOT EXISTS idx_e1rm_user_exercise ON exercise_e1rm(user_id, exercise_id);
CREATE INDEX IF NOT EXISTS idx_e1rm_expires ON exercise_e1rm(expires_at);

ALTER TABLE exercise_e1rm ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own e1rm" ON exercise_e1rm
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own e1rm" ON exercise_e1rm
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own e1rm" ON exercise_e1rm
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own e1rm" ON exercise_e1rm
  FOR DELETE USING (auth.uid() = user_id);
