package main

import (
	"context"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"mse-mooc/backend/internal/shared/config"
	"mse-mooc/backend/internal/shared/httpx"
)

func main() {
	port := config.Env("GATEWAY_PORT", "8080")
	authURL := config.Env("AUTH_SERVICE_URL", "http://localhost:8081")
	courseURL := config.Env("COURSE_SERVICE_URL", "http://localhost:8082")
	enrollmentURL := config.Env("ENROLLMENT_SERVICE_URL", "http://localhost:8083")
	authProxy := newProxy(authURL)
	courseProxy := newProxy(courseURL)
	enrollmentProxy := newProxy(enrollmentURL)
	apiMux := http.NewServeMux()
	apiMux.Handle("/auth/", authProxy)
	apiMux.Handle("/courses", courseProxy)
	apiMux.Handle("/courses/", courseProxy)
	apiMux.Handle("/enrollments", enrollmentProxy)
	apiMux.Handle("/enrollments/", enrollmentProxy)
	apiMux.Handle("/users/", enrollmentProxy)
	apiMux.Handle("/groups", enrollmentProxy)
	apiMux.Handle("/groups/", enrollmentProxy)
	apiMux.Handle("/invites", enrollmentProxy)
	apiMux.Handle("/invites/", enrollmentProxy)
	apiMux.Handle("/grades", enrollmentProxy)
	apiMux.Handle("/grades/", enrollmentProxy)
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("/readyz", func(w http.ResponseWriter, _ *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})
	mux.Handle("/", apiMux)
	mux.Handle("/api/", http.StripPrefix("/api", apiMux))
	handler := httpx.CorrelationID(httpx.Logging(httpx.NewRateLimit(240, time.Minute)(cors(mux))))
	srv := &http.Server{Addr: ":" + port, Handler: handler}
	go func() {
		log.Printf("api-gateway listening on :%s", port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("api-gateway failed: %v", err)
		}
	}()
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("api-gateway shutdown error: %v", err)
	}
}

func newProxy(raw string) http.Handler {
	target, err := url.Parse(raw)
	if err != nil {
		panic(err)
	}
	proxy := httputil.NewSingleHostReverseProxy(target)
	origDirector := proxy.Director
	proxy.Director = func(req *http.Request) {
		origDirector(req)
		req.URL.Scheme = target.Scheme
		req.URL.Host = target.Host
		req.Host = target.Host
	}
	return proxy
}

func cors(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin == "" {
			origin = "*"
		}
		if strings.HasPrefix(origin, "http://") || strings.HasPrefix(origin, "https://") || origin == "*" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Correlation-ID")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
