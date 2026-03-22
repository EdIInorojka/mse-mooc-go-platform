# Security and Scalability Baseline (MVP)

## Security baseline
- Passwords hashed with bcrypt (`auth-service`), no plain-text secrets in code.
- JWT auth with role claims (`user`, `admin`) and route guards.
- Access checks on enrollment operations to prevent cross-user actions.
- Rate limiting enabled in `api-gateway` and `auth-service`.
- CORS explicitly controlled in gateway.
- Kubernetes network policies: default deny + explicit allows.
- Secrets externalized via env/K8s Secret.

## Scalability baseline
- Stateless app services (`api-gateway`, `auth-service`, `course-service`, `enrollment-service`) for horizontal scaling.
- HPA configured for `api-gateway` and `course-service`.
- Redis and Kafka included for cache/event patterns.
- Readiness/liveness probes for fast failure detection.

## Next hardening steps
1. Move in-memory stores to PostgreSQL repositories + migrations.
2. Add refresh-token rotation + revocation list in Redis.
3. Add Kafka producers/consumers for async enrollment and notification workflows.
4. Add OpenTelemetry traces + Prometheus metrics.
5. Add WAF/rate-limit tiers at ingress.
6. Add k6 load tests and SLO-based autoscaling policy.
