-- Add gold currency to user_stats
ALTER TABLE user_stats
ADD COLUMN IF NOT EXISTS gold INTEGER NOT NULL DEFAULT 0;

-- Create workout_plans table for calendar functionality
CREATE TABLE IF NOT EXISTS workout_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL,
    exercises JSONB NOT NULL, -- Array of exercise IDs and details
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, plan_date)
);

-- Index for workout plans
CREATE INDEX IF NOT EXISTS idx_workout_plans_user_date ON workout_plans(user_id, plan_date DESC);

