package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mse-mooc/backend/internal/auth/app"
	"mse-mooc/backend/internal/auth/transport"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/config"
	"mse-mooc/backend/internal/shared/database"
	"mse-mooc/backend/internal/shared/events"
	"mse-mooc/backend/internal/shared/httpx"
	"mse-mooc/backend/internal/shared/seed"
	"mse-mooc/backend/migrations"
)

func main() {
	ctx := context.Background()
	port := config.Env("AUTH_SERVICE_PORT", "8081")
	jwtSecret := config.Env("JWT_SECRET", "dev-secret-change-me")
	accessTTL := config.EnvDuration("JWT_ACCESS_TTL", 15*time.Minute)
	refreshTTL := config.EnvDuration("JWT_REFRESH_TTL", 7*24*time.Hour)
	databaseURL := config.Env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mse_mooc?sslmode=disable")
	kafkaBrokers := config.EnvList("KAFKA_BROKERS", []string{})

	db, err := database.Open(ctx, databaseURL)
	if err != nil {
		log.Fatalf("auth-service database open failed: %v", err)
	}
	defer db.Close()
	if err := database.RunMigrations(ctx, db, migrations.Files); err != nil {
		log.Fatalf("auth-service migrations failed: %v", err)
	}
	publisher := events.NewPublisher(kafkaBrokers)
	defer func() {
		if err := publisher.Close(); err != nil {
			log.Printf("auth-service publisher close error: %v", err)
		}
	}()

	tm := sharedauth.NewTokenManager(jwtSecret, accessTTL, refreshTTL, "auth-service")
	repo := app.NewPostgresUserRepository(db)
	svc := app.NewService(repo, tm, publisher)
	if config.EnvBool("DEMO_SEED", true) {
		if err := seed.SeedDemoData(ctx, db, seed.DemoConfig{
			Reset: config.EnvBool("DEMO_SEED_RESET", false),
		}); err != nil {
			log.Fatalf("auth-service demo seed failed: %v", err)
		}
	}
	if err := svc.EnsureAdminUser(ctx, config.Env("ADMIN_LOGIN", "admin"), config.Env("ADMIN_EMAIL", "admin@example.com"), config.Env("ADMIN_PASSWORD", "admin123")); err != nil {
		log.Fatalf("auth-service ensure admin failed: %v", err)
	}
	h := transport.NewHandler(svc, tm)
	router := http.NewServeMux()
	router.Handle("/", h.Router())
	handler := httpx.CorrelationID(httpx.Logging(httpx.NewRateLimit(120, time.Minute)(router)))
	srv := &http.Server{Addr: ":" + port, Handler: handler}
	go func() {
		log.Printf("auth-service listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("auth-service failed: %v", err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("auth-service shutdown error: %v", err)
	}
}
