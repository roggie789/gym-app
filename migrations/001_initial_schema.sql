-- Gym App Database Schema
-- Initial migration for Supabase PostgreSQL database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- CORE TABLES
-- ============================================

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_id UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User stats table (one-to-one with users)
CREATE TABLE user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    level INTEGER NOT NULL DEFAULT 1,
    total_points INTEGER NOT NULL DEFAULT 0,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    total_workouts INTEGER NOT NULL DEFAULT 0,
    total_prs INTEGER NOT NULL DEFAULT 0,
    last_workout_date DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Attendance table
CREATE TABLE attendance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    workout_date DATE NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, workout_date)
);

-- Exercises master table
CREATE TABLE exercises (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL,
    muscle_groups JSONB,
    description TEXT,
    unit VARCHAR(10) NOT NULL DEFAULT 'kg',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Personal records table
CREATE TABLE personal_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exercise_id UUID NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
    weight DECIMAL(6,2) NOT NULL,
    reps INTEGER NOT NULL,
    sets INTEGER,
    pr_date DATE NOT NULL,
    points_earned INTEGER NOT NULL DEFAULT 0,
    is_current_pr BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Avatars table
CREATE TABLE avatars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    avatar_name VARCHAR(50),
    base_skin_color VARCHAR(20),
    base_hair_color VARCHAR(20),
    customization_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Gear items master table
CREATE TABLE gear_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    type VARCHAR(50) NOT NULL,
    rarity VARCHAR(20) NOT NULL DEFAULT 'common',
    unlock_level INTEGER,
    unlock_pr_requirement JSONB,
    unlock_points_requirement INTEGER,
    unlock_streak_requirement INTEGER,
    image_url VARCHAR(255),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- User gear junction table
CREATE TABLE user_gear (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    is_equipped BOOLEAN NOT NULL DEFAULT false,
    unlocked_via VARCHAR(50),
    UNIQUE(user_id, gear_item_id)
);

-- Groups table
CREATE TABLE groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    is_public BOOLEAN NOT NULL DEFAULT false,
    invite_code VARCHAR(20) UNIQUE,
    max_members INTEGER,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Group members junction table
CREATE TABLE group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(group_id, user_id)
);

-- Group leaderboards table (optional, for performance)
CREATE TABLE group_leaderboards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER NOT NULL,
    total_points INTEGER NOT NULL,
    level INTEGER NOT NULL,
    current_streak INTEGER NOT NULL,
    total_prs INTEGER NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(group_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- User stats indexes
CREATE INDEX idx_user_stats_user_id ON user_stats(user_id);

-- Attendance indexes
CREATE INDEX idx_attendance_user_id ON attendance(user_id);
CREATE INDEX idx_attendance_user_date ON attendance(user_id, workout_date DESC);
CREATE INDEX idx_attendance_workout_date ON attendance(workout_date);

-- Personal records indexes
CREATE INDEX idx_pr_user_id ON personal_records(user_id);
CREATE INDEX idx_pr_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_pr_user_exercise ON personal_records(user_id, exercise_id, pr_date DESC);
CREATE INDEX idx_pr_current_pr ON personal_records(user_id, is_current_pr) WHERE is_current_pr = true;

-- Exercises indexes
CREATE INDEX idx_exercises_category ON exercises(category);
CREATE INDEX idx_exercises_active ON exercises(is_active) WHERE is_active = true;

-- User gear indexes
CREATE INDEX idx_user_gear_user_id ON user_gear(user_id);
CREATE INDEX idx_user_gear_equipped ON user_gear(user_id, is_equipped) WHERE is_equipped = true;
CREATE INDEX idx_user_gear_item_id ON user_gear(gear_item_id);

-- Gear items indexes
CREATE INDEX idx_gear_items_type ON gear_items(type);
CREATE INDEX idx_gear_items_rarity ON gear_items(rarity);
CREATE INDEX idx_gear_items_active ON gear_items(is_active) WHERE is_active = true;

-- Groups indexes
CREATE INDEX idx_groups_creator ON groups(created_by_user_id);
CREATE INDEX idx_groups_invite_code ON groups(invite_code);
CREATE INDEX idx_groups_public ON groups(is_public, created_at DESC);

-- Group members indexes
CREATE INDEX idx_group_members_group_id ON group_members(group_id);
CREATE INDEX idx_group_members_user_id ON group_members(user_id);
CREATE INDEX idx_group_members_role ON group_members(group_id, role);

-- Group leaderboards indexes
CREATE INDEX idx_leaderboards_group_rank ON group_leaderboards(group_id, rank ASC);
CREATE INDEX idx_leaderboards_group_calculated ON group_leaderboards(group_id, calculated_at DESC);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at BEFORE UPDATE ON user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_avatars_updated_at BEFORE UPDATE ON avatars
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to automatically create user_stats and avatar when user is created
CREATE OR REPLACE FUNCTION create_user_defaults()
RETURNS TRIGGER AS $$
BEGIN
    -- Create user_stats entry
    INSERT INTO user_stats (user_id) VALUES (NEW.id);
    
    -- Create avatar entry
    INSERT INTO avatars (user_id) VALUES (NEW.id);
    
    -- Update user's avatar_id reference
    UPDATE users SET avatar_id = (SELECT id FROM avatars WHERE user_id = NEW.id) WHERE id = NEW.id;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to create defaults on user creation
CREATE TRIGGER create_user_defaults_trigger AFTER INSERT ON users
    FOR EACH ROW EXECUTE FUNCTION create_user_defaults();

-- Function to ensure only one current PR per user per exercise
CREATE OR REPLACE FUNCTION ensure_single_current_pr()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is being set as current PR, unset all other current PRs for this user/exercise
    IF NEW.is_current_pr = true THEN
        UPDATE personal_records
        SET is_current_pr = false
        WHERE user_id = NEW.user_id
          AND exercise_id = NEW.exercise_id
          AND id != NEW.id
          AND is_current_pr = true;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to ensure single current PR
CREATE TRIGGER ensure_single_current_pr_trigger BEFORE INSERT OR UPDATE ON personal_records
    FOR EACH ROW EXECUTE FUNCTION ensure_single_current_pr();

