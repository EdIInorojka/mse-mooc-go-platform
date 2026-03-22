ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT NOT NULL DEFAULT '';
UPDATE users SET full_name = login WHERE full_name = '' OR full_name IS NULL;

ALTER TABLE courses ADD COLUMN IF NOT EXISTS provider TEXT NOT NULL DEFAULT 'MSE-MOOC';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'General';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS delivery_format TEXT NOT NULL DEFAULT 'online';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'mixed';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'internal';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS external_url TEXT NOT NULL DEFAULT '';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS subject_tags TEXT NOT NULL DEFAULT '';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS material_links TEXT NOT NULL DEFAULT '';
ALTER TABLE courses ADD COLUMN IF NOT EXISTS seats_left INTEGER NOT NULL DEFAULT 100;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration_weeks INTEGER NOT NULL DEFAULT 8;

UPDATE courses SET provider = 'MSE-MOOC' WHERE provider IS NULL OR provider = '';
UPDATE courses SET category = 'General' WHERE category IS NULL OR category = '';
UPDATE courses SET delivery_format = 'online' WHERE delivery_format IS NULL OR delivery_format = '';
UPDATE courses SET audience = 'mixed' WHERE audience IS NULL OR audience = '';
UPDATE courses SET source_type = 'internal' WHERE source_type IS NULL OR source_type = '';
UPDATE courses SET seats_left = 100 WHERE seats_left IS NULL OR seats_left < 0;
UPDATE courses SET duration_weeks = 8 WHERE duration_weeks IS NULL OR duration_weeks <= 0;

CREATE INDEX IF NOT EXISTS idx_courses_provider ON courses(provider);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_source_type ON courses(source_type);
