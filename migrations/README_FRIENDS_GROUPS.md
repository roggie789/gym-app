# Friends and Groups Migration

## Migration File: `005_add_friends_and_groups.sql`

This migration adds social features to the app:

### New Tables

1. **user_profiles** - Stores usernames linked to auth.users
   - `id` (UUID, references auth.users)
   - `username` (VARCHAR, unique)
   - `email` (VARCHAR)
   - Timestamps

2. **friends** - Friend relationships
   - Bidirectional friendships
   - Status: pending, accepted, blocked
   - Tracks who requested the friendship

3. **group_invitations** - Group invitation system
   - Tracks pending/accepted/declined invitations
   - Links groups to invited users

### Enhanced Tables

- **groups** - Already exists, but migration ensures compatibility
- **group_members** - Already exists, no changes needed

### Features Added

- User search by username
- Friend requests and acceptance
- Group creation and management
- Group invitations
- Leaderboard rankings by group or globally

## Running the Migration

1. Go to Supabase Dashboard → SQL Editor
2. Run `005_add_friends_and_groups.sql`
3. The migration is idempotent (safe to run multiple times)

## Important Notes

- Usernames must be unique across all users
- Friends table uses bidirectional relationships
- Group invitations must be accepted before joining
- Leaderboard uses `level_xp` from `user_stats` as the ranking metric

## Row Level Security (RLS)

You may need to set up RLS policies in Supabase:

```sql
-- Allow users to read their own profile
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

-- Allow users to update own profile
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Allow users to search profiles
CREATE POLICY "Users can search profiles" ON user_profiles
  FOR SELECT USING (true);

-- Friends policies
CREATE POLICY "Users can view own friendships" ON friends
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Groups policies
CREATE POLICY "Users can view own groups" ON groups
  FOR SELECT USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM group_members WHERE group_id = groups.id AND user_id = auth.uid())
  );

-- Add similar policies for group_members and group_invitations
```

