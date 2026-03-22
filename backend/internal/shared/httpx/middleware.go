package httpx

import (
	"crypto/rand"
	"encoding/hex"
	"log"
	"net"
	"net/http"
	"sync"
	"time"
)

func CorrelationID(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		id := r.Header.Get("X-Correlation-ID")
		if id == "" {
			buf := make([]byte, 8)
			_, _ = rand.Read(buf)
			id = hex.EncodeToString(buf)
		}
		w.Header().Set("X-Correlation-ID", id)
		r.Header.Set("X-Correlation-ID", id)
		next.ServeHTTP(w, r)
	})
}

func Logging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("method=%s path=%s duration_ms=%d corr_id=%s", r.Method, r.URL.Path, time.Since(start).Milliseconds(), r.Header.Get("X-Correlation-ID"))
	})
}

type inMemoryBucket struct {
	mu      sync.Mutex
	windows map[string]window
	now     func() time.Time
}

type window struct {
	start time.Time
	count int
}

func NewRateLimit(maxReq int, per time.Duration) func(http.Handler) http.Handler {
	b := &inMemoryBucket{windows: map[string]window{}, now: time.Now}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			host, _, _ := net.SplitHostPort(r.RemoteAddr)
			if host == "" {
				host = r.RemoteAddr
			}

			b.mu.Lock()
			win := b.windows[host]
			now := b.now()
			if now.Sub(win.start) >= per {
				win = window{start: now, count: 0}
			}
			win.count++
			b.windows[host] = win
			b.mu.Unlock()

			if win.count > maxReq {
				Error(w, http.StatusTooManyRequests, "rate limit exceeded")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
