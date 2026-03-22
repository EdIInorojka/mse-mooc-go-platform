package app

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"mse-mooc/backend/internal/enrollment/domain"
)

type PostgresRepository struct{ db *sql.DB }

func NewPostgresRepository(db *sql.DB) *PostgresRepository { return &PostgresRepository{db: db} }

func (r *PostgresRepository) CreateEnrollment(ctx context.Context, studentID, courseID int64) (domain.Enrollment, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO enrollments(student_id, course_id, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (student_id, course_id)
		DO UPDATE SET status = EXCLUDED.status
		WHERE enrollments.status <> 'active'
		RETURNING id, student_id, course_id, status, created_at
	`, studentID, courseID)
	enrollment, err := scanEnrollment(row)
	if err == nil {
		return enrollment, nil
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return domain.Enrollment{}, err
	}
	existing, getErr := r.findEnrollmentByStudentAndCourse(ctx, studentID, courseID)
	if getErr != nil {
		return domain.Enrollment{}, getErr
	}
	if existing.Status == "active" {
		return domain.Enrollment{}, ErrAlreadyEnrolled
	}
	return existing, nil
}

func (r *PostgresRepository) GetEnrollment(ctx context.Context, id int64) (domain.Enrollment, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, student_id, course_id, status, created_at FROM enrollments WHERE id = $1`, id)
	return scanEnrollment(row)
}

func (r *PostgresRepository) CancelEnrollment(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `UPDATE enrollments SET status = 'cancelled' WHERE id = $1`, id)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return sql.ErrNoRows
	}
	return nil
}

func (r *PostgresRepository) ListEnrollmentsByStudent(ctx context.Context, studentID int64) ([]domain.Enrollment, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, student_id, course_id, status, created_at FROM enrollments WHERE student_id = $1 ORDER BY created_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := make([]domain.Enrollment, 0)
	for rows.Next() {
		enrollment, err := scanEnrollment(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, enrollment)
	}
	return out, rows.Err()
}

func (r *PostgresRepository) HasActiveEnrollment(ctx context.Context, studentID, courseID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM enrollments WHERE student_id = $1 AND course_id = $2 AND status = 'active')`, studentID, courseID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) CreateGroup(ctx context.Context, group domain.Group) (domain.Group, error) {
	row := r.db.QueryRowContext(ctx, `INSERT INTO study_groups(course_id, teacher_id, name) VALUES ($1, $2, $3) RETURNING id, course_id, teacher_id, name, created_at`, group.CourseID, group.TeacherID, group.Name)
	return scanGroup(row)
}

func (r *PostgresRepository) ListGroupsByTeacher(ctx context.Context, teacherID int64) ([]domain.Group, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, course_id, teacher_id, name, created_at FROM study_groups WHERE teacher_id = $1 ORDER BY created_at DESC`, teacherID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	groups := make([]domain.Group, 0)
	for rows.Next() {
		group, err := scanGroup(rows)
		if err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}
	return groups, rows.Err()
}

func (r *PostgresRepository) GetGroup(ctx context.Context, id int64) (domain.Group, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, course_id, teacher_id, name, created_at FROM study_groups WHERE id = $1`, id)
	return scanGroup(row)
}

func (r *PostgresRepository) CreateInvite(ctx context.Context, invite domain.GroupInvite) (domain.GroupInvite, error) {
	var expiresAt any
	if invite.ExpiresAt != nil {
		expiresAt = invite.ExpiresAt.UTC()
	}
	row := r.db.QueryRowContext(ctx, `INSERT INTO group_invites(group_id, token, expires_at, created_by) VALUES ($1, $2, $3, $4) RETURNING id, group_id, token, expires_at, created_by, created_at`, invite.GroupID, invite.Token, expiresAt, invite.CreatedBy)
	return scanInvite(row)
}

func (r *PostgresRepository) JoinByInvite(ctx context.Context, token string, studentID int64) (domain.JoinInviteResult, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return domain.JoinInviteResult{}, err
	}
	defer func() {
		if err != nil {
			_ = tx.Rollback()
		}
	}()
	var groupID int64
	var courseID int64
	var expiresAt sql.NullTime
	inviteRow := tx.QueryRowContext(ctx, `SELECT gi.group_id, sg.course_id, gi.expires_at FROM group_invites gi JOIN study_groups sg ON sg.id = gi.group_id WHERE gi.token = $1`, token)
	if scanErr := inviteRow.Scan(&groupID, &courseID, &expiresAt); scanErr != nil {
		err = scanErr
		if errors.Is(err, sql.ErrNoRows) {
			return domain.JoinInviteResult{}, ErrNotFound
		}
		return domain.JoinInviteResult{}, err
	}
	if expiresAt.Valid && time.Now().UTC().After(expiresAt.Time.UTC()) {
		err = ErrInviteExpired
		return domain.JoinInviteResult{}, err
	}
	memberResult, execErr := tx.ExecContext(ctx, `INSERT INTO group_members(group_id, student_id) VALUES ($1, $2) ON CONFLICT (group_id, student_id) DO NOTHING`, groupID, studentID)
	if execErr != nil {
		err = execErr
		return domain.JoinInviteResult{}, err
	}
	memberRows, execErr := memberResult.RowsAffected()
	if execErr != nil {
		err = execErr
		return domain.JoinInviteResult{}, err
	}
	if memberRows == 0 {
		err = ErrAlreadyInGroup
		return domain.JoinInviteResult{}, err
	}
	enrollmentCreated := false
	enrollmentRow := tx.QueryRowContext(ctx, `
		INSERT INTO enrollments(student_id, course_id, status)
		VALUES ($1, $2, 'active')
		ON CONFLICT (student_id, course_id)
		DO UPDATE SET status = EXCLUDED.status
		WHERE enrollments.status <> 'active'
		RETURNING id
	`, studentID, courseID)
	var enrollmentID int64
	scanErr := enrollmentRow.Scan(&enrollmentID)
	if scanErr == nil {
		enrollmentCreated = true
	} else if !errors.Is(scanErr, sql.ErrNoRows) {
		err = scanErr
		return domain.JoinInviteResult{}, err
	}
	result := domain.JoinInviteResult{GroupID: groupID, CourseID: courseID, StudentID: studentID, JoinedAt: time.Now().UTC(), EnrollmentCreated: enrollmentCreated}
	if err = tx.Commit(); err != nil {
		return domain.JoinInviteResult{}, err
	}
	return result, nil
}

func (r *PostgresRepository) ListGroupMembers(ctx context.Context, groupID int64) ([]domain.GroupMember, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT gm.group_id, gm.student_id, u.login, u.email, gm.joined_at FROM group_members gm JOIN users u ON u.id = gm.student_id WHERE gm.group_id = $1 ORDER BY gm.joined_at ASC`, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	members := make([]domain.GroupMember, 0)
	for rows.Next() {
		member, err := scanGroupMember(rows)
		if err != nil {
			return nil, err
		}
		members = append(members, member)
	}
	return members, rows.Err()
}

func (r *PostgresRepository) IsGroupMember(ctx context.Context, groupID, studentID int64) (bool, error) {
	var exists bool
	err := r.db.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM group_members WHERE group_id = $1 AND student_id = $2)`, groupID, studentID).Scan(&exists)
	return exists, err
}

func (r *PostgresRepository) AssignGrade(ctx context.Context, grade domain.Grade) (domain.Grade, error) {
	row := r.db.QueryRowContext(ctx, `INSERT INTO grades(student_id, course_id, group_id, teacher_id, value, comment) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, student_id, course_id, group_id, teacher_id, value, comment, assigned_at`, grade.StudentID, grade.CourseID, grade.GroupID, grade.TeacherID, grade.Value, grade.Comment)
	return scanGrade(row)
}

func (r *PostgresRepository) ListGradesByStudent(ctx context.Context, studentID int64) ([]domain.Grade, error) {
	rows, err := r.db.QueryContext(ctx, `SELECT id, student_id, course_id, group_id, teacher_id, value, comment, assigned_at FROM grades WHERE student_id = $1 ORDER BY assigned_at DESC`, studentID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	grades := make([]domain.Grade, 0)
	for rows.Next() {
		grade, err := scanGrade(rows)
		if err != nil {
			return nil, err
		}
		grades = append(grades, grade)
	}
	return grades, rows.Err()
}

func (r *PostgresRepository) findEnrollmentByStudentAndCourse(ctx context.Context, studentID, courseID int64) (domain.Enrollment, error) {
	row := r.db.QueryRowContext(ctx, `SELECT id, student_id, course_id, status, created_at FROM enrollments WHERE student_id = $1 AND course_id = $2`, studentID, courseID)
	return scanEnrollment(row)
}

type enrollmentScanner interface{ Scan(dest ...any) error }

func scanEnrollment(row enrollmentScanner) (domain.Enrollment, error) {
	var enrollment domain.Enrollment
	err := row.Scan(&enrollment.ID, &enrollment.StudentID, &enrollment.CourseID, &enrollment.Status, &enrollment.CreatedAt)
	if err != nil {
		return domain.Enrollment{}, err
	}
	return enrollment, nil
}

func scanGroup(row enrollmentScanner) (domain.Group, error) {
	var group domain.Group
	err := row.Scan(&group.ID, &group.CourseID, &group.TeacherID, &group.Name, &group.CreatedAt)
	if err != nil {
		return domain.Group{}, err
	}
	return group, nil
}

func scanInvite(row enrollmentScanner) (domain.GroupInvite, error) {
	var invite domain.GroupInvite
	var expiresAt sql.NullTime
	err := row.Scan(&invite.ID, &invite.GroupID, &invite.Token, &expiresAt, &invite.CreatedBy, &invite.CreatedAt)
	if err != nil {
		return domain.GroupInvite{}, err
	}
	if expiresAt.Valid {
		value := expiresAt.Time.UTC()
		invite.ExpiresAt = &value
	}
	return invite, nil
}

func scanGroupMember(row enrollmentScanner) (domain.GroupMember, error) {
	var member domain.GroupMember
	err := row.Scan(&member.GroupID, &member.StudentID, &member.StudentLogin, &member.StudentEmail, &member.JoinedAt)
	if err != nil {
		return domain.GroupMember{}, err
	}
	return member, nil
}

func scanGrade(row enrollmentScanner) (domain.Grade, error) {
	var grade domain.Grade
	err := row.Scan(&grade.ID, &grade.StudentID, &grade.CourseID, &grade.GroupID, &grade.TeacherID, &grade.Value, &grade.Comment, &grade.AssignedAt)
	if err != nil {
		return domain.Grade{}, err
	}
	return grade, nil
}
