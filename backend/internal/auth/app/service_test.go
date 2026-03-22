package app

import (
	"context"
	"testing"
	"time"

	"mse-mooc/backend/internal/auth/domain"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/events"
)

type fakeUserRepo struct {
	users  map[int64]domain.User
	nextID int64
}

func newFakeUserRepo() *fakeUserRepo {
	return &fakeUserRepo{users: map[int64]domain.User{}, nextID: 1}
}

func (r *fakeUserRepo) Create(_ context.Context, user domain.User) (domain.User, error) {
	for _, existing := range r.users {
		if existing.Login == user.Login || existing.Email == user.Email {
			return domain.User{}, ErrUserExists
		}
	}
	user.ID = r.nextID
	r.nextID++
	user.CreatedAt = time.Now().UTC()
	r.users[user.ID] = user
	return user, nil
}

func (r *fakeUserRepo) FindByLoginOrEmail(_ context.Context, lookup string) (domain.User, error) {
	for _, user := range r.users {
		if user.Login == lookup || user.Email == lookup {
			return user, nil
		}
	}
	return domain.User{}, ErrUserNotFound
}

func (r *fakeUserRepo) FindByID(_ context.Context, id int64) (domain.User, error) {
	user, ok := r.users[id]
	if !ok {
		return domain.User{}, ErrUserNotFound
	}
	return user, nil
}

func (r *fakeUserRepo) EnsureAdmin(_ context.Context, login, email, passwordHash string) error {
	_, err := r.Create(context.Background(), domain.User{Login: login, Email: email, PasswordHash: passwordHash, Role: sharedauth.RoleAdmin})
	if err == ErrUserExists {
		return nil
	}
	return err
}

func TestRegisterAndLogin(t *testing.T) {
	tm := sharedauth.NewTokenManager("secret", 15*time.Minute, time.Hour, "auth")
	svc := NewService(newFakeUserRepo(), tm, events.NoopPublisher{})

	user, _, err := svc.Register(context.Background(), RegisterInput{
		Login:    "student",
		Password: "pass123",
		Email:    "student@example.com",
		Role:     sharedauth.RoleStudent,
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if user.Role != sharedauth.RoleStudent {
		t.Fatalf("unexpected role: %s", user.Role)
	}

	_, _, err = svc.Login(context.Background(), LoginInput{LoginOrEmail: "student", Password: "pass123"})
	if err != nil {
		t.Fatalf("login failed: %v", err)
	}
}

func TestDefaultRoleIsStudent(t *testing.T) {
	tm := sharedauth.NewTokenManager("secret", 15*time.Minute, time.Hour, "auth")
	svc := NewService(newFakeUserRepo(), tm, events.NoopPublisher{})

	user, _, err := svc.Register(context.Background(), RegisterInput{
		Login:    "learner",
		Password: "pass123",
		Email:    "learner@example.com",
	})
	if err != nil {
		t.Fatalf("register failed: %v", err)
	}
	if user.Role != sharedauth.RoleStudent {
		t.Fatalf("expected student role, got %s", user.Role)
	}
}
