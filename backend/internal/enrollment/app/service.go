package app

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"errors"
	"strings"
	"time"

	"mse-mooc/backend/internal/enrollment/domain"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/events"
)

var (
	ErrNotFound        = errors.New("not found")
	ErrAlreadyEnrolled = errors.New("already enrolled")
	ErrAlreadyInGroup  = errors.New("student already in group")
	ErrInviteExpired   = errors.New("invite expired")
	ErrForbidden       = errors.New("forbidden")
	ErrInvalidInput    = errors.New("invalid input")
)

type Repository interface {
	CreateEnrollment(ctx context.Context, studentID, courseID int64) (domain.Enrollment, error)
	GetEnrollment(ctx context.Context, id int64) (domain.Enrollment, error)
	CancelEnrollment(ctx context.Context, id int64) error
	ListEnrollmentsByStudent(ctx context.Context, studentID int64) ([]domain.Enrollment, error)
	HasActiveEnrollment(ctx context.Context, studentID, courseID int64) (bool, error)
	CreateGroup(ctx context.Context, group domain.Group) (domain.Group, error)
	ListGroupsByTeacher(ctx context.Context, teacherID int64) ([]domain.Group, error)
	GetGroup(ctx context.Context, id int64) (domain.Group, error)
	CreateInvite(ctx context.Context, invite domain.GroupInvite) (domain.GroupInvite, error)
	JoinByInvite(ctx context.Context, token string, studentID int64) (domain.JoinInviteResult, error)
	ListGroupMembers(ctx context.Context, groupID int64) ([]domain.GroupMember, error)
	IsGroupMember(ctx context.Context, groupID, studentID int64) (bool, error)
	AssignGrade(ctx context.Context, grade domain.Grade) (domain.Grade, error)
	ListGradesByStudent(ctx context.Context, studentID int64) ([]domain.Grade, error)
}

type Service struct {
	repo      Repository
	publisher events.Publisher
}

func NewService(repo Repository, publisher events.Publisher) *Service {
	return &Service{repo: repo, publisher: publisher}
}

func (s *Service) Enroll(ctx context.Context, actorID int64, actorRole string, studentID, courseID int64) (domain.Enrollment, error) {
	studentID, err := resolveStudentID(actorID, actorRole, studentID)
	if err != nil {
		return domain.Enrollment{}, err
	}
	if courseID <= 0 {
		return domain.Enrollment{}, ErrInvalidInput
	}
	enrollment, err := s.repo.CreateEnrollment(ctx, studentID, courseID)
	if err != nil {
		return domain.Enrollment{}, err
	}
	if err := s.publisher.Publish(ctx, "enrollment.created", enrollment.Status, map[string]any{"enrollment_id": enrollment.ID, "student_id": enrollment.StudentID, "course_id": enrollment.CourseID, "status": enrollment.Status}); err != nil {
		return domain.Enrollment{}, err
	}
	return enrollment, nil
}

func (s *Service) Unenroll(ctx context.Context, actorID int64, actorRole string, enrollmentID int64) error {
	enrollment, err := s.repo.GetEnrollment(ctx, enrollmentID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return ErrNotFound
		}
		return err
	}
	if actorRole != sharedauth.RoleAdmin && actorID != enrollment.StudentID {
		return ErrForbidden
	}
	if err := s.repo.CancelEnrollment(ctx, enrollmentID); errors.Is(err, sql.ErrNoRows) {
		return ErrNotFound
	}
	return err
}

func (s *Service) ByUser(ctx context.Context, actorID int64, actorRole string, userID int64) ([]domain.Enrollment, error) {
	if actorRole != sharedauth.RoleAdmin && actorID != userID {
		return nil, ErrForbidden
	}
	return s.repo.ListEnrollmentsByStudent(ctx, userID)
}

func (s *Service) CanGetCertificate(ctx context.Context, actorID int64, actorRole string, userID, courseID int64) (bool, error) {
	if actorRole != sharedauth.RoleAdmin && actorID != userID {
		return false, ErrForbidden
	}
	return s.repo.HasActiveEnrollment(ctx, userID, courseID)
}

func (s *Service) CreateGroup(ctx context.Context, actorID int64, actorRole, name string, courseID int64) (domain.Group, error) {
	if actorRole != sharedauth.RoleTeacher && actorRole != sharedauth.RoleAdmin {
		return domain.Group{}, ErrForbidden
	}
	name = strings.TrimSpace(name)
	if name == "" || courseID <= 0 {
		return domain.Group{}, ErrInvalidInput
	}
	group, err := s.repo.CreateGroup(ctx, domain.Group{CourseID: courseID, TeacherID: actorID, Name: name})
	if err != nil {
		return domain.Group{}, err
	}
	if err := s.publisher.Publish(ctx, "group.created", group.Name, map[string]any{"group_id": group.ID, "course_id": group.CourseID, "teacher_id": group.TeacherID, "group_name": group.Name}); err != nil {
		return domain.Group{}, err
	}
	return group, nil
}

func (s *Service) ListOwnGroups(ctx context.Context, actorID int64, actorRole string) ([]domain.Group, error) {
	if actorRole != sharedauth.RoleTeacher && actorRole != sharedauth.RoleAdmin {
		return nil, ErrForbidden
	}
	return s.repo.ListGroupsByTeacher(ctx, actorID)
}

func (s *Service) CreateInvite(ctx context.Context, actorID int64, actorRole string, groupID int64, ttl time.Duration) (domain.GroupInvite, error) {
	group, err := s.repo.GetGroup(ctx, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.GroupInvite{}, ErrNotFound
		}
		return domain.GroupInvite{}, err
	}
	if actorRole != sharedauth.RoleAdmin && group.TeacherID != actorID {
		return domain.GroupInvite{}, ErrForbidden
	}
	token, err := randomToken()
	if err != nil {
		return domain.GroupInvite{}, err
	}
	invite := domain.GroupInvite{GroupID: groupID, Token: token, CreatedBy: actorID}
	if ttl > 0 {
		expiresAt := time.Now().UTC().Add(ttl)
		invite.ExpiresAt = &expiresAt
	}
	return s.repo.CreateInvite(ctx, invite)
}

func (s *Service) ListGroupMembers(ctx context.Context, actorID int64, actorRole string, groupID int64) ([]domain.GroupMember, error) {
	group, err := s.repo.GetGroup(ctx, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if actorRole != sharedauth.RoleAdmin && group.TeacherID != actorID {
		return nil, ErrForbidden
	}
	return s.repo.ListGroupMembers(ctx, groupID)
}

func (s *Service) JoinByInvite(ctx context.Context, actorID int64, actorRole, token string) (domain.JoinInviteResult, error) {
	if actorRole != sharedauth.RoleStudent && actorRole != sharedauth.RoleAdmin {
		return domain.JoinInviteResult{}, ErrForbidden
	}
	if strings.TrimSpace(token) == "" {
		return domain.JoinInviteResult{}, ErrInvalidInput
	}
	result, err := s.repo.JoinByInvite(ctx, token, actorID)
	if err != nil {
		return domain.JoinInviteResult{}, err
	}
	if result.EnrollmentCreated {
		if err := s.publisher.Publish(ctx, "enrollment.created", token, map[string]any{"student_id": actorID, "course_id": result.CourseID, "group_id": result.GroupID}); err != nil {
			return domain.JoinInviteResult{}, err
		}
	}
	return result, nil
}

func (s *Service) AssignGrade(ctx context.Context, actorID int64, actorRole string, groupID, studentID int64, value float64, comment string) (domain.Grade, error) {
	if actorRole != sharedauth.RoleTeacher && actorRole != sharedauth.RoleAdmin {
		return domain.Grade{}, ErrForbidden
	}
	if groupID <= 0 || studentID <= 0 || value < 0 || value > 100 {
		return domain.Grade{}, ErrInvalidInput
	}
	group, err := s.repo.GetGroup(ctx, groupID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.Grade{}, ErrNotFound
		}
		return domain.Grade{}, err
	}
	if actorRole != sharedauth.RoleAdmin && group.TeacherID != actorID {
		return domain.Grade{}, ErrForbidden
	}
	isMember, err := s.repo.IsGroupMember(ctx, groupID, studentID)
	if err != nil {
		return domain.Grade{}, err
	}
	if !isMember {
		return domain.Grade{}, ErrForbidden
	}
	grade, err := s.repo.AssignGrade(ctx, domain.Grade{StudentID: studentID, CourseID: group.CourseID, GroupID: groupID, TeacherID: actorID, Value: value, Comment: strings.TrimSpace(comment)})
	if err != nil {
		return domain.Grade{}, err
	}
	if err := s.publisher.Publish(ctx, "grade.assigned", group.Name, map[string]any{"grade_id": grade.ID, "student_id": grade.StudentID, "course_id": grade.CourseID, "group_id": grade.GroupID, "teacher_id": grade.TeacherID, "value": grade.Value}); err != nil {
		return domain.Grade{}, err
	}
	return grade, nil
}

func (s *Service) ListMyGrades(ctx context.Context, actorID int64) ([]domain.Grade, error) {
	return s.repo.ListGradesByStudent(ctx, actorID)
}

func resolveStudentID(actorID int64, actorRole string, requestedStudentID int64) (int64, error) {
	switch actorRole {
	case sharedauth.RoleStudent:
		if requestedStudentID != 0 && requestedStudentID != actorID {
			return 0, ErrForbidden
		}
		return actorID, nil
	case sharedauth.RoleAdmin:
		if requestedStudentID <= 0 {
			return 0, ErrInvalidInput
		}
		return requestedStudentID, nil
	default:
		return 0, ErrForbidden
	}
}

func randomToken() (string, error) {
	buf := make([]byte, 16)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
