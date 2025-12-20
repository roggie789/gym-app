-- Delete invalid challenges where challenger_id equals challenged_id (self-challenges)
-- This is a one-time cleanup script

DELETE FROM lift_off_challenges
WHERE challenger_id = challenged_id;

-- Also delete any challenges where the status is invalid or the challenge is malformed
-- (Optional: uncomment if you want to be more aggressive)
-- DELETE FROM lift_off_challenges
-- WHERE challenger_id = challenged_id
--    OR status NOT IN ('pending', 'accepted', 'completed', 'declined', 'expired');

