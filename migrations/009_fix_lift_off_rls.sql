-- Fix RLS policy for lift_off_challenges INSERT
-- The previous policy was too restrictive

-- Drop the existing policy
DROP POLICY IF EXISTS "Users can create challenges" ON lift_off_challenges;

-- Create a simpler policy that just checks the challenger is the authenticated user
CREATE POLICY "Users can create challenges" ON lift_off_challenges
  FOR INSERT
  WITH CHECK (challenger_id = auth.uid());

