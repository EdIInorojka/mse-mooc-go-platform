package app

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"mse-mooc/backend/internal/auth/domain"
	sharedauth "mse-mooc/backend/internal/shared/auth"

	"github.com/jackc/pgx/v5/pgconn"
)

type PostgresUserRepository struct {
	db *sql.DB
}

func NewPostgresUserRepository(db *sql.DB) *PostgresUserRepository {
	return &PostgresUserRepository{db: db}
}

func (r *PostgresUserRepository) Create(ctx context.Context, user domain.User) (domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		INSERT INTO users(login, email, password_hash, role)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at
	`, user.Login, user.Email, user.PasswordHash, user.Role)
	if err := row.Scan(&user.ID, &user.CreatedAt); err != nil {
		if isUniqueViolation(err) {
			return domain.User{}, ErrUserExists
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *PostgresUserRepository) FindByLoginOrEmail(ctx context.Context, loginOrEmail string) (domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, login, email, role, created_at, password_hash
		FROM users
		WHERE login = $1 OR email = $1
	`, loginOrEmail)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.User{}, ErrUserNotFound
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *PostgresUserRepository) FindByID(ctx context.Context, id int64) (domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		SELECT id, login, email, role, created_at, password_hash
		FROM users
		WHERE id = $1
	`, id)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.User{}, ErrUserNotFound
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *PostgresUserRepository) EnsureAdmin(ctx context.Context, login, email, passwordHash string) error {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO users(login, email, password_hash, role)
		SELECT $1, $2, $3, $4
		WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = $4)
	`, login, email, passwordHash, sharedauth.RoleAdmin)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("admin credentials conflict with existing user: %w", err)
		}
		return err
	}
	if _, err := result.RowsAffected(); err != nil {
		return err
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (domain.User, error) {
	var user domain.User
	err := row.Scan(&user.ID, &user.Login, &user.Email, &user.Role, &user.CreatedAt, &user.PasswordHash)
	if err != nil {
		return domain.User{}, err
	}
	return user, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
