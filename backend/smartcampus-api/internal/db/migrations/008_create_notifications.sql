CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL,
    channel VARCHAR(50) DEFAULT 'in_app' CHECK (channel IN ('in_app', 'telegram')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    sent_at TIMESTAMPTZ NULL,
    entity_type VARCHAR(100) NULL,
    entity_id UUID NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
