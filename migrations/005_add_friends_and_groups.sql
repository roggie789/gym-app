-- Add friends and enhance groups functionality
-- This migration adds friend relationships and improves group management

-- User profiles table (stores username and links to auth.users)
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for username search
CREATE INDEX IF NOT EXISTS idx_user_profiles_username ON user_profiles(username);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Friends table (bidirectional friendship)
CREATE TABLE IF NOT EXISTS friends (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'blocked'
    requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, friend_id),
    CHECK (user_id != friend_id)
);

-- Friend requests index
CREATE INDEX IF NOT EXISTS idx_friends_user_status ON friends(user_id, status);
CREATE INDEX IF NOT EXISTS idx_friends_friend_status ON friends(friend_id, status);

-- Groups table (if not exists from initial schema)
-- Note: If groups table already exists with different column names, you may need to adjust
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- If groups table exists with created_by_user_id, add created_by column or use existing
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'groups' AND column_name = 'created_by_user_id') THEN
        ALTER TABLE groups RENAME COLUMN created_by_user_id TO created_by;
    END IF;
END $$;

-- Group members table (if not exists)
CREATE TABLE IF NOT EXISTS group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member', -- 'owner', 'admin', 'member'
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- Group invitations table
CREATE TABLE IF NOT EXISTS group_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invited_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, invited_user_id)
);

-- Indexes for groups
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_invitations_user ON group_invitations(invited_user_id, status);
CREATE INDEX IF NOT EXISTS idx_group_invitations_group ON group_invitations(group_id, status);

-- Function to get user's total points (level_xp for leaderboard)
CREATE OR REPLACE FUNCTION get_user_total_points(user_uuid UUID)
RETURNS INTEGER AS $$
BEGIN
    RETURN COALESCE(
        (SELECT level_xp FROM user_stats WHERE user_id = user_uuid),
        0
    );
END;
$$ LANGUAGE plpgsql;

-- View for leaderboard rankings (using level_xp as points)
CREATE OR REPLACE VIEW leaderboard_rankings AS
SELECT 
    u.id as user_id,
    COALESCE(up.username, split_part(u.email, '@', 1)) as username,
    us.level_xp as total_points,
    us.level,
    us.current_streak,
    us.total_prs,
    us.total_workouts,
    ROW_NUMBER() OVER (ORDER BY us.level_xp DESC, us.level DESC) as rank
FROM auth.users u
JOIN user_stats us ON u.id = us.user_id
LEFT JOIN user_profiles up ON u.id = up.id
ORDER BY us.level_xp DESC, us.level DESC;

-- Trigger for friends updated_at
DROP TRIGGER IF EXISTS update_friends_updated_at ON friends;
CREATE TRIGGER update_friends_updated_at BEFORE UPDATE ON friends
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for groups updated_at (may already exist from initial schema)
DROP TRIGGER IF EXISTS update_groups_updated_at ON groups;
CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for group_invitations updated_at
DROP TRIGGER IF EXISTS update_group_invitations_updated_at ON group_invitations;
CREATE TRIGGER update_group_invitations_updated_at BEFORE UPDATE ON group_invitations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for user_profiles updated_at
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

