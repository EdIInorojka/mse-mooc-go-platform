CREATE TABLE IF NOT EXISTS courses (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    language TEXT NOT NULL DEFAULT 'ru',
    price INTEGER NOT NULL DEFAULT 0 CHECK (price >= 0),
    credits INTEGER NOT NULL DEFAULT 0 CHECK (credits >= 0),
    reviews REAL NOT NULL DEFAULT 0 CHECK (reviews >= 0 AND reviews <= 5),
    certificated BOOLEAN NOT NULL DEFAULT FALSE,
    is_certificate_paid BOOLEAN NOT NULL DEFAULT FALSE,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    created_by_user_id BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'created_by'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'created_by_user_id'
    ) THEN
        ALTER TABLE courses RENAME COLUMN created_by TO created_by_user_id;
    END IF;
END $$;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_by_user_id BIGINT;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE courses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_courses_created_by_user_id ON courses(created_by_user_id);
CREATE INDEX IF NOT EXISTS idx_courses_start_date ON courses(start_date);