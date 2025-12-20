-- Row Level Security (RLS) Policies for Friends and Groups
-- Run this after running migration 005_add_friends_and_groups.sql

-- Helper function to check if user is a member of a group (avoids recursion)
CREATE OR REPLACE FUNCTION is_group_member(group_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM group_members
    WHERE group_id = group_uuid AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_invitations ENABLE ROW LEVEL SECURITY;

-- User Profiles Policies
-- Allow users to read their own profile
DROP POLICY IF EXISTS "Users can read own profile" ON user_profiles;
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update own profile
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to insert own profile
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow all authenticated users to search profiles (for friend search)
DROP POLICY IF EXISTS "Authenticated users can search profiles" ON user_profiles;
CREATE POLICY "Authenticated users can search profiles" ON user_profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Friends Policies
-- Users can view their own friendships
DROP POLICY IF EXISTS "Users can view own friendships" ON friends;
CREATE POLICY "Users can view own friendships" ON friends
  FOR SELECT USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- Users can create friend requests (as the requester)
DROP POLICY IF EXISTS "Users can create friend requests" ON friends;
CREATE POLICY "Users can create friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update friendships they're part of
DROP POLICY IF EXISTS "Users can update own friendships" ON friends;
CREATE POLICY "Users can update own friendships" ON friends
  FOR UPDATE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- Users can delete friendships they're part of
DROP POLICY IF EXISTS "Users can delete own friendships" ON friends;
CREATE POLICY "Users can delete own friendships" ON friends
  FOR DELETE USING (
    auth.uid() = user_id OR 
    auth.uid() = friend_id
  );

-- Groups Policies
-- Users can view groups they created, public groups, or groups they're members of
-- Uses SECURITY DEFINER function to avoid recursion
DROP POLICY IF EXISTS "Users can view own groups" ON groups;
CREATE POLICY "Users can view own groups" ON groups
  FOR SELECT USING (
    auth.uid() = created_by OR
    is_public = true OR
    is_group_member(id, auth.uid())
  );

-- Users can create groups
DROP POLICY IF EXISTS "Users can create groups" ON groups;
CREATE POLICY "Users can create groups" ON groups
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Group owners can update their groups
DROP POLICY IF EXISTS "Group owners can update groups" ON groups;
CREATE POLICY "Group owners can update groups" ON groups
  FOR UPDATE USING (auth.uid() = created_by);

-- Group Members Policies
-- Users can view members of groups they're in, groups they own, or public groups
-- Avoid recursion by checking groups table instead of group_members
DROP POLICY IF EXISTS "Users can view group members" ON group_members;
CREATE POLICY "Users can view group members" ON group_members
  FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM groups g
      WHERE g.id = group_members.group_id 
      AND (g.created_by = auth.uid() OR g.is_public = true)
    )
  );

-- Users can be added to groups (by group owner/admin, via invitation, or public groups)
DROP POLICY IF EXISTS "Users can join groups" ON group_members;
CREATE POLICY "Users can join groups" ON group_members
  FOR INSERT WITH CHECK (
    auth.uid() = user_id AND (
      -- User can join themselves if group is public
      EXISTS (
        SELECT 1 FROM groups 
        WHERE id = group_members.group_id AND is_public = true
      ) OR
      -- Group creator can add themselves when creating a group
      EXISTS (
        SELECT 1 FROM groups 
        WHERE id = group_members.group_id AND created_by = auth.uid()
      )
    ) OR
    -- Group owner can add other members (check groups table, not group_members to avoid recursion)
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_members.group_id AND created_by = auth.uid()
    )
  );

-- Users can leave groups they're in
DROP POLICY IF EXISTS "Users can leave groups" ON group_members;
CREATE POLICY "Users can leave groups" ON group_members
  FOR DELETE USING (auth.uid() = user_id);

-- Group Invitations Policies
-- Users can view invitations sent to them
DROP POLICY IF EXISTS "Users can view own invitations" ON group_invitations;
CREATE POLICY "Users can view own invitations" ON group_invitations
  FOR SELECT USING (auth.uid() = invited_user_id);

-- Group owners/admins can create invitations
DROP POLICY IF EXISTS "Group owners can create invitations" ON group_invitations;
CREATE POLICY "Group owners can create invitations" ON group_invitations
  FOR INSERT WITH CHECK (
    auth.uid() = invited_by AND
    EXISTS (
      SELECT 1 FROM groups 
      WHERE id = group_invitations.group_id AND created_by = auth.uid()
    )
  );

-- Users can update invitations sent to them
DROP POLICY IF EXISTS "Users can update own invitations" ON group_invitations;
CREATE POLICY "Users can update own invitations" ON group_invitations
  FOR UPDATE USING (auth.uid() = invited_user_id);

-- RLS Policies for group_join_requests
ALTER TABLE group_join_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own join requests
DROP POLICY IF EXISTS "Users can view their own join requests" ON group_join_requests;
CREATE POLICY "Users can view their own join requests" ON group_join_requests
  FOR SELECT USING (auth.uid() = user_id);

-- Group owners/admins can view join requests for their groups
-- Avoid recursion by checking groups table instead of group_members
DROP POLICY IF EXISTS "Group owners can view group join requests" ON group_join_requests;
CREATE POLICY "Group owners can view group join requests" ON group_join_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_join_requests.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- Users can create join requests
DROP POLICY IF EXISTS "Users can create join requests" ON group_join_requests;
CREATE POLICY "Users can create join requests" ON group_join_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Group owners/admins can update join requests for their groups
-- Avoid recursion by checking groups table instead of group_members
DROP POLICY IF EXISTS "Group owners can update join requests" ON group_join_requests;
CREATE POLICY "Group owners can update join requests" ON group_join_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM groups
      WHERE groups.id = group_join_requests.group_id
      AND groups.created_by = auth.uid()
    )
  );

-- ============================================
-- LIFT OFF CHALLENGES RLS POLICIES
-- ============================================

-- Enable RLS on lift_off_challenges
ALTER TABLE lift_off_challenges ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own challenges" ON lift_off_challenges;
DROP POLICY IF EXISTS "Users can create challenges" ON lift_off_challenges;
DROP POLICY IF EXISTS "Users can update challenges they're involved in" ON lift_off_challenges;

-- Users can view challenges where they are the challenger or challenged
CREATE POLICY "Users can view their own challenges" ON lift_off_challenges
  FOR SELECT
  USING (
    challenger_id = auth.uid() OR 
    challenged_id = auth.uid()
  );

-- Users can create challenges (as challenger)
-- Note: WITH CHECK validates the new row being inserted
-- Simplified to just check that the challenger is the authenticated user
CREATE POLICY "Users can create challenges" ON lift_off_challenges
  FOR INSERT
  WITH CHECK (challenger_id = auth.uid());

-- Users can update challenges they're involved in
-- Challenged user can accept/decline
-- Both users can complete their lift
CREATE POLICY "Users can update challenges they're involved in" ON lift_off_challenges
  FOR UPDATE
  USING (
    challenger_id = auth.uid() OR 
    challenged_id = auth.uid()
  )
  WITH CHECK (
    challenger_id = auth.uid() OR 
    challenged_id = auth.uid()
  );

