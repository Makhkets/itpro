CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('student', 'teacher', 'applicant', 'librarian', 'admin')),
    group_name VARCHAR(100) NULL,
    department VARCHAR(255) NULL,
    telegram_chat_id BIGINT NULL,
    telegram_username VARCHAR(255) NULL,
    is_telegram_verified BOOLEAN DEFAULT FALSE,
    personal_data_consent BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
