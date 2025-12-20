-- Add group join requests for private groups
-- This allows users to request to join private groups

-- Group join requests table (for private groups)
CREATE TABLE IF NOT EXISTS group_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    UNIQUE(group_id, user_id)
);

-- Indexes for group join requests
CREATE INDEX IF NOT EXISTS idx_group_join_requests_group ON group_join_requests(group_id, status);
CREATE INDEX IF NOT EXISTS idx_group_join_requests_user ON group_join_requests(user_id, status);

-- Update groups table to ensure is_public column exists and is properly set
DO $$
BEGIN
    -- Ensure is_public column exists (should already exist from migration 005)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'groups' AND column_name = 'is_public'
    ) THEN
        ALTER TABLE groups ADD COLUMN is_public BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

