package app

import (
	"context"
	"errors"
	"strings"

	"mse-mooc/backend/internal/auth/domain"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/events"

	"golang.org/x/crypto/bcrypt"
)

var (
	ErrUserExists              = errors.New("user already exists")
	ErrInvalidCredentials      = errors.New("invalid credentials")
	ErrInvalidInput            = errors.New("invalid input")
	ErrUserNotFound            = errors.New("user not found")
	ErrPublicAdminRegistration = errors.New("public admin registration is forbidden")
)

type UserRepository interface {
	Create(ctx context.Context, user domain.User) (domain.User, error)
	FindByLoginOrEmail(ctx context.Context, loginOrEmail string) (domain.User, error)
	FindByID(ctx context.Context, id int64) (domain.User, error)
	UpdateProfile(ctx context.Context, id int64, fullName, email, passwordHash string) (domain.User, error)
	EnsureAdmin(ctx context.Context, login, email, passwordHash string) error
}

type Service struct {
	repo      UserRepository
	tokens    *sharedauth.TokenManager
	publisher events.Publisher
}

type RegisterInput struct {
	Login    string `json:"login"`
	FullName string `json:"full_name"`
	Password string `json:"password"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type UpdateProfileInput struct {
	FullName string `json:"full_name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type LoginInput struct {
	LoginOrEmail string `json:"login_or_email"`
	Password     string `json:"password"`
}

type TokenPair struct {
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	TokenType    string `json:"token_type"`
	ExpiresIn    int64  `json:"expires_in"`
}

func NewService(repo UserRepository, tm *sharedauth.TokenManager, publisher events.Publisher) *Service {
	return &Service{repo: repo, tokens: tm, publisher: publisher}
}

func (s *Service) Register(ctx context.Context, input RegisterInput) (domain.User, TokenPair, error) {
	user, err := normalizeRegistration(input)
	if err != nil {
		return domain.User{}, TokenPair{}, err
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return domain.User{}, TokenPair{}, err
	}
	user.PasswordHash = string(hash)

	createdUser, err := s.repo.Create(ctx, user)
	if err != nil {
		return domain.User{}, TokenPair{}, err
	}
	tokens, err := s.issueTokenPair(createdUser.ID, createdUser.Role)
	if err != nil {
		return domain.User{}, TokenPair{}, err
	}
	if err := s.publisher.Publish(ctx, "user.registered", createdUser.Login, map[string]any{
		"user_id": createdUser.ID,
		"login":   createdUser.Login,
		"email":   createdUser.Email,
		"role":    createdUser.Role,
	}); err != nil {
		return domain.User{}, TokenPair{}, err
	}
	return createdUser, tokens, nil
}

func (s *Service) Login(ctx context.Context, input LoginInput) (domain.User, TokenPair, error) {
	lookup := strings.TrimSpace(strings.ToLower(input.LoginOrEmail))
	password := strings.TrimSpace(input.Password)
	if lookup == "" || password == "" {
		return domain.User{}, TokenPair{}, ErrInvalidInput
	}
	user, err := s.repo.FindByLoginOrEmail(ctx, lookup)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return domain.User{}, TokenPair{}, ErrInvalidCredentials
		}
		return domain.User{}, TokenPair{}, err
	}
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return domain.User{}, TokenPair{}, ErrInvalidCredentials
	}
	tokens, err := s.issueTokenPair(user.ID, user.Role)
	if err != nil {
		return domain.User{}, TokenPair{}, err
	}
	return user, tokens, nil
}

func (s *Service) Refresh(ctx context.Context, refreshToken string) (TokenPair, error) {
	claims, err := s.tokens.Parse(refreshToken)
	if err != nil || claims.TokenUse != sharedauth.TokenUseRefresh {
		return TokenPair{}, ErrInvalidCredentials
	}
	userID, err := sharedauth.SubjectToUserID(claims.Subject)
	if err != nil {
		return TokenPair{}, ErrInvalidCredentials
	}
	user, err := s.repo.FindByID(ctx, userID)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			return TokenPair{}, ErrInvalidCredentials
		}
		return TokenPair{}, err
	}
	return s.issueTokenPair(user.ID, user.Role)
}

func (s *Service) ByID(ctx context.Context, id int64) (domain.User, error) {
	return s.repo.FindByID(ctx, id)
}

func (s *Service) UpdateProfile(ctx context.Context, id int64, input UpdateProfileInput) (domain.User, error) {
	fullName := strings.TrimSpace(input.FullName)
	email := strings.TrimSpace(strings.ToLower(input.Email))
	password := strings.TrimSpace(input.Password)

	if fullName == "" && email == "" && password == "" {
		return domain.User{}, ErrInvalidInput
	}
	if password != "" && len(password) < 8 {
		return domain.User{}, ErrInvalidInput
	}

	passwordHash := ""
	if password != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
		if err != nil {
			return domain.User{}, err
		}
		passwordHash = string(hash)
	}

	user, err := s.repo.UpdateProfile(ctx, id, fullName, email, passwordHash)
	if err != nil {
		return domain.User{}, err
	}
	return user, nil
}

func (s *Service) EnsureAdminUser(ctx context.Context, login, email, password string) error {
	login = strings.TrimSpace(strings.ToLower(login))
	email = strings.TrimSpace(strings.ToLower(email))
	password = strings.TrimSpace(password)
	if login == "" || email == "" || password == "" {
		return ErrInvalidInput
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	return s.repo.EnsureAdmin(ctx, login, email, string(hash))
}

func (s *Service) issueTokenPair(userID int64, role string) (TokenPair, error) {
	access, err := s.tokens.IssueAccess(userID, role)
	if err != nil {
		return TokenPair{}, err
	}
	refresh, err := s.tokens.IssueRefresh(userID, role)
	if err != nil {
		return TokenPair{}, err
	}
	return TokenPair{
		AccessToken:  access,
		RefreshToken: refresh,
		TokenType:    "Bearer",
		ExpiresIn:    int64(s.tokens.AccessTTL().Seconds()),
	}, nil
}

func normalizeRegistration(input RegisterInput) (domain.User, error) {
	login := strings.TrimSpace(strings.ToLower(input.Login))
	fullName := strings.TrimSpace(input.FullName)
	email := strings.TrimSpace(strings.ToLower(input.Email))
	password := strings.TrimSpace(input.Password)
	role := strings.TrimSpace(strings.ToLower(input.Role))
	if role == "" {
		role = sharedauth.RoleStudent
	}
	if login == "" || email == "" || password == "" {
		return domain.User{}, ErrInvalidInput
	}
	if !sharedauth.IsKnownRole(role) {
		return domain.User{}, ErrInvalidInput
	}
	if !sharedauth.CanSelfRegister(role) {
		return domain.User{}, ErrPublicAdminRegistration
	}
	if fullName == "" {
		fullName = login
	}
	return domain.User{
		Login:    login,
		FullName: fullName,
		Email:    email,
		Role:     role,
	}, nil
}
