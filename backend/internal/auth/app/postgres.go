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
		INSERT INTO users(login, full_name, email, password_hash, role)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at
	`, user.Login, user.FullName, user.Email, user.PasswordHash, user.Role)
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
		SELECT id, login, full_name, email, role, created_at, password_hash
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
		SELECT id, login, full_name, email, role, created_at, password_hash
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

func (r *PostgresUserRepository) UpdateProfile(ctx context.Context, id int64, fullName, email, passwordHash string) (domain.User, error) {
	row := r.db.QueryRowContext(ctx, `
		UPDATE users
		SET full_name = CASE WHEN NULLIF($2, '') IS NULL THEN full_name ELSE $2 END,
		    email = CASE WHEN NULLIF($3, '') IS NULL THEN email ELSE $3 END,
		    password_hash = CASE WHEN NULLIF($4, '') IS NULL THEN password_hash ELSE $4 END
		WHERE id = $1
		RETURNING id, login, full_name, email, role, created_at, password_hash
	`, id, fullName, email, passwordHash)
	user, err := scanUser(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domain.User{}, ErrUserNotFound
		}
		if isUniqueViolation(err) {
			return domain.User{}, ErrUserExists
		}
		return domain.User{}, err
	}
	return user, nil
}

func (r *PostgresUserRepository) EnsureAdmin(ctx context.Context, login, email, passwordHash string) error {
	result, err := r.db.ExecContext(ctx, `
		INSERT INTO users(login, full_name, email, password_hash, role)
		SELECT $1, $2, $3, $4, $5
		WHERE NOT EXISTS (SELECT 1 FROM users WHERE role = $5)
	`, login, "Platform Admin", email, passwordHash, sharedauth.RoleAdmin)
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
	err := row.Scan(&user.ID, &user.Login, &user.FullName, &user.Email, &user.Role, &user.CreatedAt, &user.PasswordHash)
	if err != nil {
		return domain.User{}, err
	}
	return user, nil
}

func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
