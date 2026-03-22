package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"mse-mooc/backend/internal/enrollment/app"
	"mse-mooc/backend/internal/enrollment/transport"
	sharedauth "mse-mooc/backend/internal/shared/auth"
	"mse-mooc/backend/internal/shared/config"
	"mse-mooc/backend/internal/shared/database"
	"mse-mooc/backend/internal/shared/events"
	"mse-mooc/backend/internal/shared/httpx"
	"mse-mooc/backend/migrations"
)

func main() {
	ctx := context.Background()
	port := config.Env("ENROLLMENT_SERVICE_PORT", "8083")
	jwtSecret := config.Env("JWT_SECRET", "dev-secret-change-me")
	accessTTL := config.EnvDuration("JWT_ACCESS_TTL", 15*time.Minute)
	refreshTTL := config.EnvDuration("JWT_REFRESH_TTL", 7*24*time.Hour)
	databaseURL := config.Env("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/mse_mooc?sslmode=disable")
	kafkaBrokers := config.EnvList("KAFKA_BROKERS", []string{"localhost:9092"})

	db, err := database.Open(ctx, databaseURL)
	if err != nil {
		log.Fatalf("enrollment-service database open failed: %v", err)
	}
	defer db.Close()
	if err := database.RunMigrations(ctx, db, migrations.Files); err != nil {
		log.Fatalf("enrollment-service migrations failed: %v", err)
	}
	publisher := events.NewPublisher(kafkaBrokers)
	defer func() {
		if err := publisher.Close(); err != nil {
			log.Printf("enrollment-service publisher close error: %v", err)
		}
	}()

	tm := sharedauth.NewTokenManager(jwtSecret, accessTTL, refreshTTL, "auth-service")
	h := transport.NewHandler(app.NewService(app.NewPostgresRepository(db), publisher), tm)
	router := http.NewServeMux()
	router.Handle("/", h.Router())
	handler := httpx.CorrelationID(httpx.Logging(router))
	srv := &http.Server{Addr: ":" + port, Handler: handler}
	go func() {
		log.Printf("enrollment-service listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("enrollment-service failed: %v", err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("enrollment-service shutdown error: %v", err)
	}
}
