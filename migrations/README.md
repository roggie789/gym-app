# Database Migrations

This directory contains SQL migration files for setting up the Gym App database on Supabase.

## Migration Files

1. **001_initial_schema.sql** - Creates all tables, indexes, triggers, and functions
2. **002_seed_data.sql** - Seeds initial data (exercises and gear items)

## How to Run Migrations on Supabase

### Option 1: Using Supabase Dashboard (Recommended)

1. Log into your Supabase dashboard
2. Navigate to **SQL Editor**
3. Open `001_initial_schema.sql` and copy its contents
4. Paste into the SQL Editor and click **Run**
5. Repeat for `002_seed_data.sql`

### Option 2: Using Supabase CLI

If you have Supabase CLI installed:

```bash
# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Using psql

If you have PostgreSQL client installed:

```bash
psql "postgresql://[YOUR_CONNECTION_STRING]" -f migrations/001_initial_schema.sql
psql "postgresql://[YOUR_CONNECTION_STRING]" -f migrations/002_seed_data.sql
```

## What Gets Created

### Tables
- `users` - User accounts
- `user_stats` - User statistics and levels
- `attendance` - Gym visit tracking
- `exercises` - Master list of exercises
- `personal_records` - PR tracking
- `avatars` - Avatar customization
- `gear_items` - Unlockable gear catalog
- `user_gear` - User's unlocked/equipped gear
- `groups` - User-created groups
- `group_members` - Group membership
- `group_leaderboards` - Cached leaderboard data

### Features
- Automatic `updated_at` timestamps
- Auto-creation of stats and avatar when user is created
- Single current PR enforcement per user/exercise
- Comprehensive indexes for performance
- Foreign key constraints with cascade deletes

## Verification

After running migrations, verify the setup:

```sql
-- Check tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check exercises were seeded
SELECT COUNT(*) FROM exercises;

-- Check gear items were seeded
SELECT COUNT(*) FROM gear_items;
```

