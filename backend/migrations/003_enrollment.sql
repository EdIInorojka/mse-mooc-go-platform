CREATE TABLE IF NOT EXISTS enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'cancelled')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(student_id, course_id)
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'enrollments' AND column_name = 'user_id'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'enrollments' AND column_name = 'student_id'
    ) THEN
        ALTER TABLE enrollments RENAME COLUMN user_id TO student_id;
    END IF;
END $$;

ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS student_id BIGINT;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'teacher_groups'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'study_groups'
    ) THEN
        ALTER TABLE teacher_groups RENAME TO study_groups;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS study_groups (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL,
    teacher_id BIGINT NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_invites (
    id BIGSERIAL PRIMARY KEY,
    group_id BIGINT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ,
    created_by BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE group_invites ADD COLUMN IF NOT EXISTS created_by BIGINT;
ALTER TABLE group_invites ALTER COLUMN expires_at DROP NOT NULL;
ALTER TABLE group_invites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS group_members (
    group_id BIGINT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY(group_id, student_id)
);

CREATE TABLE IF NOT EXISTS grades (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL,
    course_id BIGINT NOT NULL,
    group_id BIGINT NOT NULL REFERENCES study_groups(id) ON DELETE CASCADE,
    teacher_id BIGINT NOT NULL,
    value DOUBLE PRECISION NOT NULL CHECK (value >= 0 AND value <= 100),
    comment TEXT NOT NULL DEFAULT '',
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE grades ADD COLUMN IF NOT EXISTS value DOUBLE PRECISION;
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'grades' AND column_name = 'score'
    ) THEN
        UPDATE grades SET value = score WHERE value IS NULL AND score IS NOT NULL;
    END IF;
END $$;
ALTER TABLE grades ADD COLUMN IF NOT EXISTS comment TEXT NOT NULL DEFAULT '';
ALTER TABLE grades ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_enrollments_student_id ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_study_groups_teacher_id ON study_groups(teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_invites_token ON group_invites(token);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);