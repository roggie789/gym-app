-- Backfill user_profiles for existing users who don't have profiles yet
-- This ensures all users can be found in search

INSERT INTO user_profiles (id, username, email)
SELECT 
    u.id,
    COALESCE(
        (SELECT username FROM users WHERE id = u.id),
        split_part(u.email, '@', 1)
    ) as username,
    u.email
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM user_profiles WHERE id = u.id
)
ON CONFLICT (id) DO NOTHING;

