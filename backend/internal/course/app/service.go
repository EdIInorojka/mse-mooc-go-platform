package app

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"mse-mooc/backend/internal/course/domain"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/events"
)

var (
	ErrNotFound     = errors.New("course not found")
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
)

type Repository interface {
	ListCourses(ctx context.Context, filter domain.CourseFilter) ([]domain.Course, error)
	GetCourse(ctx context.Context, id int64) (domain.Course, error)
	CreateCourse(ctx context.Context, course domain.Course) (domain.Course, error)
	UpdateCourse(ctx context.Context, course domain.Course) (domain.Course, error)
	DeleteCourse(ctx context.Context, id int64) error
}

type Service struct {
	repo      Repository
	publisher events.Publisher
}

func NewService(repo Repository, publisher events.Publisher) *Service {
	return &Service{repo: repo, publisher: publisher}
}

func (s *Service) ListCourses(ctx context.Context, search, sortBy, sortOrder string) ([]domain.Course, error) {
	return s.repo.ListCourses(ctx, domain.CourseFilter{
		Search:    strings.TrimSpace(search),
		SortBy:    strings.TrimSpace(sortBy),
		SortOrder: strings.TrimSpace(sortOrder),
	})
}

func (s *Service) ListCoursesByCreator(ctx context.Context, creatorID int64) ([]domain.Course, error) {
	return s.repo.ListCourses(ctx, domain.CourseFilter{CreatedByID: &creatorID, SortBy: "created_at", SortOrder: "desc"})
}

func (s *Service) GetCourse(ctx context.Context, id int64) (domain.Course, error) {
	course, err := s.repo.GetCourse(ctx, id)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Course{}, ErrNotFound
	}
	return course, err
}

func (s *Service) CreateCourse(ctx context.Context, actorID int64, actorRole string, course domain.Course) (domain.Course, error) {
	if actorRole != sharedauth.RoleTeacher && actorRole != sharedauth.RoleAdmin {
		return domain.Course{}, ErrForbidden
	}
	if err := validateCourse(course); err != nil {
		return domain.Course{}, err
	}
	course.CreatedByUserID = actorID
	created, err := s.repo.CreateCourse(ctx, course)
	if err != nil {
		return domain.Course{}, err
	}
	if err := s.publisher.Publish(ctx, "course.created", created.Title, map[string]any{
		"course_id":           created.ID,
		"created_by_user_id":  created.CreatedByUserID,
		"title":               created.Title,
		"certificated":        created.Certificated,
		"is_certificate_paid": created.IsCertificatePaid,
	}); err != nil {
		return domain.Course{}, err
	}
	return created, nil
}

func (s *Service) UpdateCourse(ctx context.Context, actorID int64, actorRole string, id int64, course domain.Course) (domain.Course, error) {
	if actorRole != sharedauth.RoleTeacher && actorRole != sharedauth.RoleAdmin {
		return domain.Course{}, ErrForbidden
	}
	existing, err := s.GetCourse(ctx, id)
	if err != nil {
		return domain.Course{}, err
	}
	if actorRole != sharedauth.RoleAdmin && existing.CreatedByUserID != actorID {
		return domain.Course{}, ErrForbidden
	}
	if err := validateCourse(course); err != nil {
		return domain.Course{}, err
	}
	course.ID = existing.ID
	course.CreatedByUserID = existing.CreatedByUserID
	course.CreatedAt = existing.CreatedAt
	updated, err := s.repo.UpdateCourse(ctx, course)
	if errors.Is(err, sql.ErrNoRows) {
		return domain.Course{}, ErrNotFound
	}
	return updated, err
}

func (s *Service) DeleteCourse(ctx context.Context, actorID int64, actorRole string, id int64) error {
	if actorRole != sharedauth.RoleTeacher && actorRole != sharedauth.RoleAdmin {
		return ErrForbidden
	}
	course, err := s.GetCourse(ctx, id)
	if err != nil {
		return err
	}
	if actorRole != sharedauth.RoleAdmin && course.CreatedByUserID != actorID {
		return ErrForbidden
	}
	if err := s.repo.DeleteCourse(ctx, id); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	} else {
		return err
	}
}

func validateCourse(course domain.Course) error {
	if strings.TrimSpace(course.Title) == "" || strings.TrimSpace(course.Description) == "" || strings.TrimSpace(course.Language) == "" {
		return ErrInvalidInput
	}
	if course.Price < 0 || course.Credits < 0 || course.Reviews < 0 || course.Reviews > 5 || course.SeatsLeft < 0 || course.DurationWeeks <= 0 {
		return ErrInvalidInput
	}
	sourceType := strings.ToLower(strings.TrimSpace(course.SourceType))
	if sourceType == "" {
		sourceType = "internal"
	}
	if sourceType != "internal" && sourceType != "external" {
		return ErrInvalidInput
	}
	if sourceType == "external" {
		externalURL := strings.TrimSpace(course.ExternalURL)
		if externalURL == "" || (!strings.HasPrefix(externalURL, "http://") && !strings.HasPrefix(externalURL, "https://")) {
			return ErrInvalidInput
		}
	}
	if course.StartDate.IsZero() || course.EndDate.IsZero() || !course.EndDate.After(course.StartDate) {
		return ErrInvalidInput
	}
	return nil
}
