package app

import (
	"context"
	"database/sql"
	"fmt"
	"strings"

	"mse-mooc/backend/internal/course/domain"
)

type PostgresRepository struct {
	db *sql.DB
}

func NewPostgresRepository(db *sql.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) ListCourses(ctx context.Context, filter domain.CourseFilter) ([]domain.Course, error) {
	args := []any{"%" + strings.ToLower(filter.Search) + "%"}
	query := `
		SELECT id, title, description, provider, category, delivery_format,
		       audience, source_type, external_url, subject_tags, material_links,
		       language, price, credits, reviews, seats_left, duration_weeks,
		       certificated, is_certificate_paid, start_date, end_date,
		       created_by_user_id, created_at, updated_at
		FROM courses
		WHERE ($1 = '%%'
		    OR LOWER(title) LIKE $1
		    OR LOWER(description) LIKE $1
		    OR LOWER(provider) LIKE $1
		    OR LOWER(category) LIKE $1
		    OR LOWER(subject_tags) LIKE $1)
	`
	if filter.CreatedByID != nil {
		args = append(args, *filter.CreatedByID)
		query += fmt.Sprintf(" AND created_by_user_id = $%d", len(args))
	}
	query += fmt.Sprintf(" ORDER BY %s %s", sortColumn(filter.SortBy), sortDirection(filter.SortOrder))
	rows, err := r.db.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	courses := make([]domain.Course, 0)
	for rows.Next() {
		course, err := scanCourse(rows)
		if err != nil {
			return nil, err
		}
		courses = append(courses, course)
	}
	return courses, rows.Err()
}

func (r *PostgresRepository) GetCourse(ctx context.Context, id int64) (domain.Course, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, title, description, provider, category, delivery_format,
		       audience, source_type, external_url, subject_tags, material_links,
		       language, price, credits, reviews, seats_left, duration_weeks,
		       certificated, is_certificate_paid, start_date, end_date,
		       created_by_user_id, created_at, updated_at
		FROM courses
		WHERE id = $1
	`, id)
	return scanCourse(row)
}

func (r *PostgresRepository) CreateCourse(ctx context.Context, course domain.Course) (domain.Course, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO courses(
			title, description, provider, category, delivery_format,
			audience, source_type, external_url, subject_tags, material_links,
			language, price, credits, reviews, seats_left, duration_weeks,
			certificated, is_certificate_paid, start_date, end_date, created_by_user_id
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
		RETURNING id, title, description, provider, category, delivery_format,
		          audience, source_type, external_url, subject_tags, material_links,
		          language, price, credits, reviews, seats_left, duration_weeks,
		          certificated, is_certificate_paid, start_date, end_date,
		          created_by_user_id, created_at, updated_at
	`, course.Title, course.Description, course.Provider, course.Category, course.DeliveryFormat,
		course.Audience, course.SourceType, course.ExternalURL, course.SubjectTags, course.MaterialLinks,
		course.Language, course.Price, course.Credits, course.Reviews, course.SeatsLeft, course.DurationWeeks,
		course.Certificated, course.IsCertificatePaid, course.StartDate.UTC(), course.EndDate.UTC(), course.CreatedByUserID)
	return scanCourse(row)
}

func (r *PostgresRepository) UpdateCourse(ctx context.Context, course domain.Course) (domain.Course, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE courses
		SET title = $2,
		    description = $3,
		    provider = $4,
		    category = $5,
		    delivery_format = $6,
		    audience = $7,
		    source_type = $8,
		    external_url = $9,
		    subject_tags = $10,
		    material_links = $11,
		    language = $12,
		    price = $13,
		    credits = $14,
		    reviews = $15,
		    seats_left = $16,
		    duration_weeks = $17,
		    certificated = $18,
		    is_certificate_paid = $19,
		    start_date = $20,
		    end_date = $21,
		    updated_at = NOW()
		WHERE id = $1
		RETURNING id, title, description, provider, category, delivery_format,
		          audience, source_type, external_url, subject_tags, material_links,
		          language, price, credits, reviews, seats_left, duration_weeks,
		          certificated, is_certificate_paid, start_date, end_date,
		          created_by_user_id, created_at, updated_at
	`, course.ID, course.Title, course.Description, course.Provider, course.Category, course.DeliveryFormat,
		course.Audience, course.SourceType, course.ExternalURL, course.SubjectTags, course.MaterialLinks,
		course.Language, course.Price, course.Credits, course.Reviews, course.SeatsLeft, course.DurationWeeks,
		course.Certificated, course.IsCertificatePaid, course.StartDate.UTC(), course.EndDate.UTC())
	return scanCourse(row)
}

func (r *PostgresRepository) DeleteCourse(ctx context.Context, id int64) error {
	result, err := r.db.ExecContext(ctx, `DELETE FROM courses WHERE id = $1`, id)
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

type courseScanner interface{ Scan(dest ...any) error }

func scanCourse(row courseScanner) (domain.Course, error) {
	var course domain.Course
	err := row.Scan(
		&course.ID,
		&course.Title,
		&course.Description,
		&course.Provider,
		&course.Category,
		&course.DeliveryFormat,
		&course.Audience,
		&course.SourceType,
		&course.ExternalURL,
		&course.SubjectTags,
		&course.MaterialLinks,
		&course.Language,
		&course.Price,
		&course.Credits,
		&course.Reviews,
		&course.SeatsLeft,
		&course.DurationWeeks,
		&course.Certificated,
		&course.IsCertificatePaid,
		&course.StartDate,
		&course.EndDate,
		&course.CreatedByUserID,
		&course.CreatedAt,
		&course.UpdatedAt,
	)
	if err != nil {
		return domain.Course{}, err
	}
	return course, nil
}

func sortColumn(sortBy string) string {
	switch strings.ToLower(strings.TrimSpace(sortBy)) {
	case "price":
		return "price"
	case "reviews":
		return "reviews"
	case "start_date", "startdate":
		return "start_date"
	case "created_at":
		return "created_at"
	default:
		return "title"
	}
}

func sortDirection(sortOrder string) string {
	if strings.EqualFold(strings.TrimSpace(sortOrder), "desc") {
		return "DESC"
	}
	return "ASC"
}
