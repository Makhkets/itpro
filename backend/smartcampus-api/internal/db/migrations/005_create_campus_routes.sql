CREATE TABLE IF NOT EXISTS campus_routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    to_building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    title VARCHAR(255),
    description TEXT NOT NULL,
    estimated_minutes INTEGER,
    distance_meters INTEGER NULL,
    route_type VARCHAR(50) CHECK (route_type IN ('walking', 'indoor', 'mixed')),
    accessibility_notes TEXT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
