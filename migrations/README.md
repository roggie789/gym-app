# Database Migrations

This directory contains SQL migration files for setting up and updating the database schema.

## Running Migrations

### Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run each migration file in order:
   - `001_initial_schema.sql` - Creates all base tables
   - `002_seed_data.sql` - Inserts initial exercise and gear data
   - `003_add_xp_system.sql` - Adds XP system, monthly tracking, and session templates

### Migration Order

**IMPORTANT**: Run migrations in this exact order:

1. `001_initial_schema.sql` - Must be run first
2. `002_seed_data.sql` - Run after initial schema
3. `003_add_xp_system.sql` - Run after initial schema (adds new columns and tables)

## Migration Details

### 001_initial_schema.sql
Creates the core database structure:
- `users` - User accounts
- `user_stats` - User statistics and progress
- `attendance` - Workout attendance records
- `exercises` - Exercise catalog
- `personal_records` - PR tracking
- `avatars` - Avatar system
- `gear_items` - Unlockable gear
- `user_gear` - User's unlocked gear
- `groups` - User groups
- `group_members` - Group membership
- `group_leaderboards` - Group leaderboards

### 002_seed_data.sql
Populates initial data:
- 30+ exercises across multiple categories
- 25+ gear items with unlock requirements

### 003_add_xp_system.sql
Adds XP system features:
- `bodyweight` column to `user_stats`
- `level_xp`, `current_month_xp`, `current_month` columns
- `monthly_xp` table for historical monthly XP
- `session_templates` table for workout templates
- `workout_sessions` table for detailed session logs
- Functions for XP calculation and monthly reset
- Triggers for automatic monthly XP reset

## Notes

- All migrations are idempotent (safe to run multiple times)
- Uses `IF NOT EXISTS` and `IF EXISTS` checks where appropriate
- The monthly XP reset trigger automatically saves previous month's XP and resets current month XP at the start of each new month
