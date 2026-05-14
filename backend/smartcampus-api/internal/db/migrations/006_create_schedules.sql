CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    teacher_id UUID REFERENCES users(id) NULL,
    teacher_name VARCHAR(255) NULL,
    group_name VARCHAR(100) NULL,
    starts_at TIMESTAMPTZ NOT NULL,
    ends_at TIMESTAMPTZ NOT NULL,
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'imported')),
    created_by UUID REFERENCES users(id) NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK (ends_at > starts_at)
);
