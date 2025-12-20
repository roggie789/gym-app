-- Add XP system fields to user_stats
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS bodyweight DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS level_xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month_xp INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_month VARCHAR(7); -- Format: YYYY-MM

-- Create monthly_xp table to track XP per month
CREATE TABLE IF NOT EXISTS monthly_xp (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    total_xp INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month)
);

-- Create session_templates table
CREATE TABLE IF NOT EXISTS session_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    exercises JSONB NOT NULL, -- Array of exercise IDs
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create workout_sessions table to track individual workout sessions
CREATE TABLE IF NOT EXISTS workout_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_date DATE NOT NULL,
    total_xp INTEGER NOT NULL DEFAULT 0,
    exercises_completed JSONB NOT NULL, -- Array of exercise logs
    prs_achieved INTEGER NOT NULL DEFAULT 0,
    streak_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_monthly_xp_user_month ON monthly_xp(user_id, month DESC);
CREATE INDEX IF NOT EXISTS idx_session_templates_user ON session_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, session_date DESC);

-- Function to get XP required for a level
CREATE OR REPLACE FUNCTION get_xp_for_level(level_num INTEGER)
RETURNS INTEGER AS $$
BEGIN
    -- XP formula: 100 * level^1.5 (rounded)
    -- Level 1: 100, Level 2: 283, Level 3: 520, etc.
    RETURN ROUND(100 * POWER(level_num, 1.5))::INTEGER;
END;
$$ LANGUAGE plpgsql;

-- Function to check and update monthly XP reset
CREATE OR REPLACE FUNCTION check_monthly_xp_reset()
RETURNS TRIGGER AS $$
DECLARE
    current_month_str VARCHAR(7);
    last_month_xp INTEGER;
BEGIN
    current_month_str := TO_CHAR(NOW(), 'YYYY-MM');
    
    -- If month changed, save last month's XP and reset
    IF NEW.current_month IS NULL OR NEW.current_month != current_month_str THEN
        -- Save previous month's XP if it exists
        IF NEW.current_month IS NOT NULL AND NEW.current_month_xp > 0 THEN
            INSERT INTO monthly_xp (user_id, month, total_xp)
            VALUES (NEW.user_id, NEW.current_month, NEW.current_month_xp)
            ON CONFLICT (user_id, month) 
            DO UPDATE SET total_xp = NEW.current_month_xp, updated_at = NOW();
        END IF;
        
        -- Reset monthly XP for new month
        NEW.current_month_xp := 0;
        NEW.current_month := current_month_str;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check monthly reset on stats update
CREATE TRIGGER check_monthly_xp_reset_trigger
    BEFORE UPDATE ON user_stats
    FOR EACH ROW
    EXECUTE FUNCTION check_monthly_xp_reset();

