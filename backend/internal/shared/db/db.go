package db

import (
	"database/sql"
	"fmt"
	"strings"

	"mse-mooc/backend/internal/shared/config"

	_ "github.com/jackc/pgx/v5/stdlib"
)

func BuildDSNFromEnv() string {
	host := config.Env("POSTGRES_HOST", "localhost")
	port := config.Env("POSTGRES_PORT", "5432")
	name := config.Env("POSTGRES_DB", "mse_mooc")
	user := config.Env("POSTGRES_USER", "mse_mooc")
	pass := config.Env("POSTGRES_PASSWORD", "change-me")
	sslMode := config.Env("POSTGRES_SSLMODE", "disable")
	return fmt.Sprintf("postgres://%s:%s@%s:%s/%s?sslmode=%s", user, pass, host, port, name, sslMode)
}

func Open() (*sql.DB, error) {
	dsn := config.Env("DB_DSN", "")
	if strings.TrimSpace(dsn) == "" {
		dsn = BuildDSNFromEnv()
	}
	db, err := sql.Open("pgx", dsn)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		return nil, err
	}
	return db, nil
}
