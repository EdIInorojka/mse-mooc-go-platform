package seed

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
	"time"

	"golang.org/x/crypto/bcrypt"
)

type DemoConfig struct {
	Reset bool
}

func SeedDemoData(ctx context.Context, db *sql.DB, cfg DemoConfig) error {
	tx, err := db.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()

	if cfg.Reset {
		if _, execErr := tx.ExecContext(ctx, `
			TRUNCATE TABLE grades, group_members, group_invites, study_groups, enrollments, courses, users
			RESTART IDENTITY CASCADE
		`); execErr != nil {
			err = execErr
			return err
		}
	}

	teacherID, err := ensureUser(ctx, tx, "teacher.demo", "teacher.demo@hse.ru", "teacher123", "teacher")
	if err != nil {
		return err
	}
	assistantID, err := ensureUser(ctx, tx, "assistant.demo", "assistant.demo@hse.ru", "assistant123", "teacher_assistant")
	if err != nil {
		return err
	}
	student1ID, err := ensureUser(ctx, tx, "student.demo1", "student.demo1@edu.hse.ru", "student123", "student")
	if err != nil {
		return err
	}
	student2ID, err := ensureUser(ctx, tx, "student.demo2", "student.demo2@edu.hse.ru", "student123", "student")
	if err != nil {
		return err
	}

	courseID, err := ensureCourse(ctx, tx, teacherID, demoCourseSpec{
		Title:         "Go Service Architecture",
		Description:   "Practical course about Go services, APIs, and high-load readiness.",
		Provider:      "HSE Faculty of Computer Science",
		Category:      "Software Engineering",
		Delivery:      "blended",
		Audience:      "mixed",
		SourceType:    "internal",
		SubjectTags:   "backend,distributed systems,software engineering",
		MaterialLinks: "Lecture 1: Service boundaries|https://www.youtube.com/watch?v=dQw4w9WgXcQ\nWorkshop: API Gateway patterns|https://go.dev/doc/tutorial/web-service-gin",
		DurationWeeks: 8,
		SeatsLeft:     120,
	})
	if err != nil {
		return err
	}
	_, err = ensureCourse(ctx, tx, teacherID, demoCourseSpec{
		Title:         "MOOC Product Analytics",
		Description:   "MOOC analytics, progress metrics, and platform growth insights.",
		Provider:      "Coursera",
		Category:      "Analytics",
		Delivery:      "online",
		Audience:      "student",
		SourceType:    "external",
		ExternalURL:   "https://www.coursera.org/",
		SubjectTags:   "analytics,product management,education data",
		MaterialLinks: "",
		DurationWeeks: 6,
		SeatsLeft:     200,
	})
	if err != nil {
		return err
	}

	teacherGroupID, err := ensureGroup(ctx, tx, courseID, teacherID, "Backend Cohort A")
	if err != nil {
		return err
	}
	assistantGroupID, err := ensureGroup(ctx, tx, courseID, assistantID, "Assistant Practice Group")
	if err != nil {
		return err
	}

	if err = ensureInvite(ctx, tx, teacherGroupID, teacherID, "invite-backend-a", time.Now().UTC().AddDate(0, 3, 0)); err != nil {
		return err
	}
	if err = ensureInvite(ctx, tx, assistantGroupID, assistantID, "invite-assistant-group", time.Now().UTC().AddDate(0, 3, 0)); err != nil {
		return err
	}

	if err = ensureEnrollment(ctx, tx, student1ID, courseID); err != nil {
		return err
	}
	if err = ensureEnrollment(ctx, tx, student2ID, courseID); err != nil {
		return err
	}

	if err = ensureGroupMember(ctx, tx, teacherGroupID, student1ID); err != nil {
		return err
	}
	if err = ensureGroupMember(ctx, tx, teacherGroupID, student2ID); err != nil {
		return err
	}
	if err = ensureGroupMember(ctx, tx, assistantGroupID, student2ID); err != nil {
		return err
	}

	if err = ensureGrade(ctx, tx, teacherGroupID, courseID, student1ID, teacherID, 91, "Excellent structure and middleware usage."); err != nil {
		return err
	}
	if err = ensureGrade(ctx, tx, assistantGroupID, courseID, student2ID, assistantID, 84, "Good progress, improve error handling and retries."); err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}
	return nil
}

func ensureUser(ctx context.Context, tx *sql.Tx, login, email, password, role string) (int64, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return 0, err
	}

	fullName := strings.ReplaceAll(strings.TrimSpace(login), ".", " ")
	var id int64
	err = tx.QueryRowContext(ctx, `
		INSERT INTO users(login, full_name, email, password_hash, role)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (login)
		DO UPDATE SET
			full_name = EXCLUDED.full_name,
			email = EXCLUDED.email,
			password_hash = EXCLUDED.password_hash,
			role = EXCLUDED.role
		RETURNING id
	`, strings.ToLower(strings.TrimSpace(login)), fullName, strings.ToLower(strings.TrimSpace(email)), string(hash), role).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

type demoCourseSpec struct {
	Title         string
	Description   string
	Provider      string
	Category      string
	Delivery      string
	Audience      string
	SourceType    string
	ExternalURL   string
	SubjectTags   string
	MaterialLinks string
	DurationWeeks int
	SeatsLeft     int
}

func ensureCourse(ctx context.Context, tx *sql.Tx, createdBy int64, spec demoCourseSpec) (int64, error) {
	var id int64
	now := time.Now().UTC()
	err := tx.QueryRowContext(ctx, `
		WITH existing AS (
			SELECT id FROM courses WHERE title = $1 AND created_by_user_id = $2 LIMIT 1
		), inserted AS (
			INSERT INTO courses(
				title, description, provider, category, delivery_format, audience,
				source_type, external_url, subject_tags, material_links,
				language, price, credits, reviews, seats_left, duration_weeks,
				certificated, is_certificate_paid, start_date, end_date, created_by_user_id
			)
			SELECT $1, $3, $4, $5, $6, $7,
			       $8, $9, $10, $11,
			       'ru', 0, 6, 4.8, $12, $13,
			       TRUE, FALSE, $14, $15, $2
			WHERE NOT EXISTS (SELECT 1 FROM existing)
			RETURNING id
		)
		SELECT id FROM inserted
		UNION ALL
		SELECT id FROM existing
		LIMIT 1
	`, spec.Title, createdBy, spec.Description, spec.Provider, spec.Category, spec.Delivery, spec.Audience,
		spec.SourceType, spec.ExternalURL, spec.SubjectTags, spec.MaterialLinks,
		spec.SeatsLeft, spec.DurationWeeks, now.AddDate(0, 0, 7), now.AddDate(0, 2, 0)).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func ensureGroup(ctx context.Context, tx *sql.Tx, courseID, teacherID int64, name string) (int64, error) {
	var id int64
	err := tx.QueryRowContext(ctx, `
		WITH existing AS (
			SELECT id FROM study_groups WHERE course_id = $1 AND teacher_id = $2 AND name = $3 LIMIT 1
		), inserted AS (
			INSERT INTO study_groups(course_id, teacher_id, name)
			SELECT $1, $2, $3
			WHERE NOT EXISTS (SELECT 1 FROM existing)
			RETURNING id
		)
		SELECT id FROM inserted
		UNION ALL
		SELECT id FROM existing
		LIMIT 1
	`, courseID, teacherID, name).Scan(&id)
	if err != nil {
		return 0, err
	}
	return id, nil
}

func ensureInvite(ctx context.Context, tx *sql.Tx, groupID, createdBy int64, token string, expiresAt time.Time) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO group_invites(group_id, token, expires_at, created_by)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (token)
		DO UPDATE SET
			group_id = EXCLUDED.group_id,
			expires_at = EXCLUDED.expires_at,
			created_by = EXCLUDED.created_by
	`, groupID, token, expiresAt.UTC(), createdBy)
	return err
}

func ensureEnrollment(ctx context.Context, tx *sql.Tx, studentID, courseID int64) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO enrollments(student_id, course_id, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (student_id, course_id)
		DO UPDATE SET status = 'active'
	`, studentID, courseID)
	return err
}

func ensureGroupMember(ctx context.Context, tx *sql.Tx, groupID, studentID int64) error {
	_, err := tx.ExecContext(ctx, `
		INSERT INTO group_members(group_id, student_id)
		VALUES ($1, $2)
		ON CONFLICT (group_id, student_id) DO NOTHING
	`, groupID, studentID)
	return err
}

func ensureGrade(ctx context.Context, tx *sql.Tx, groupID, courseID, studentID, teacherID int64, value float64, comment string) error {
	hasValueColumn, err := hasColumn(ctx, tx, "grades", "value")
	if err != nil {
		return err
	}
	hasScoreColumn, err := hasColumn(ctx, tx, "grades", "score")
	if err != nil {
		return err
	}
	hasMaxScoreColumn, err := hasColumn(ctx, tx, "grades", "max_score")
	if err != nil {
		return err
	}

	var existingID int64
	err = tx.QueryRowContext(ctx, `
		SELECT id
		FROM grades
		WHERE group_id = $1 AND course_id = $2 AND student_id = $3
		LIMIT 1
	`, groupID, courseID, studentID).Scan(&existingID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		return err
	}
	if errors.Is(err, sql.ErrNoRows) {
		switch {
		case hasValueColumn && hasScoreColumn && hasMaxScoreColumn:
			_, insertErr := tx.ExecContext(ctx, `
				INSERT INTO grades(student_id, course_id, group_id, teacher_id, value, score, max_score, comment)
				VALUES ($1, $2, $3, $4, $5, $6, 100, $7)
			`, studentID, courseID, groupID, teacherID, value, value, comment)
			return insertErr
		case hasValueColumn && hasScoreColumn:
			_, insertErr := tx.ExecContext(ctx, `
				INSERT INTO grades(student_id, course_id, group_id, teacher_id, value, score, comment)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, studentID, courseID, groupID, teacherID, value, value, comment)
			return insertErr
		case hasScoreColumn && hasMaxScoreColumn:
			_, insertErr := tx.ExecContext(ctx, `
				INSERT INTO grades(student_id, course_id, group_id, teacher_id, score, max_score, comment)
				VALUES ($1, $2, $3, $4, $5, 100, $6)
			`, studentID, courseID, groupID, teacherID, value, comment)
			return insertErr
		case hasScoreColumn:
			_, insertErr := tx.ExecContext(ctx, `
				INSERT INTO grades(student_id, course_id, group_id, teacher_id, score, comment)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, studentID, courseID, groupID, teacherID, value, comment)
			return insertErr
		case hasValueColumn:
			_, insertErr := tx.ExecContext(ctx, `
				INSERT INTO grades(student_id, course_id, group_id, teacher_id, value, comment)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, studentID, courseID, groupID, teacherID, value, comment)
			return insertErr
		default:
			return fmt.Errorf("grades table has neither value nor score column")
		}
	}

	switch {
	case hasValueColumn && hasScoreColumn && hasMaxScoreColumn:
		_, err = tx.ExecContext(ctx, `
			UPDATE grades
			SET teacher_id = $2,
				value = $3,
				score = $4,
				max_score = 100,
				comment = $5,
				assigned_at = NOW()
			WHERE id = $1
		`, existingID, teacherID, value, value, comment)
	case hasValueColumn && hasScoreColumn:
		_, err = tx.ExecContext(ctx, `
			UPDATE grades
			SET teacher_id = $2,
				value = $3,
				score = $4,
				comment = $5,
				assigned_at = NOW()
			WHERE id = $1
		`, existingID, teacherID, value, value, comment)
	case hasScoreColumn && hasMaxScoreColumn:
		_, err = tx.ExecContext(ctx, `
			UPDATE grades
			SET teacher_id = $2,
				score = $3,
				max_score = 100,
				comment = $4,
				assigned_at = NOW()
			WHERE id = $1
		`, existingID, teacherID, value, comment)
	case hasScoreColumn:
		_, err = tx.ExecContext(ctx, `
			UPDATE grades
			SET teacher_id = $2,
				score = $3,
				comment = $4,
				assigned_at = NOW()
			WHERE id = $1
		`, existingID, teacherID, value, comment)
	case hasValueColumn:
		_, err = tx.ExecContext(ctx, `
			UPDATE grades
			SET teacher_id = $2,
				value = $3,
				comment = $4,
				assigned_at = NOW()
			WHERE id = $1
		`, existingID, teacherID, value, comment)
	default:
		err = fmt.Errorf("grades table has neither value nor score column")
	}
	if err != nil {
		return fmt.Errorf("update grade %d: %w", existingID, err)
	}
	return nil
}

func hasColumn(ctx context.Context, tx *sql.Tx, table, column string) (bool, error) {
	var exists bool
	err := tx.QueryRowContext(ctx, `
		SELECT EXISTS(
			SELECT 1
			FROM information_schema.columns
			WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
		)
	`, table, column).Scan(&exists)
	if err != nil {
		return false, err
	}
	return exists, nil
}
