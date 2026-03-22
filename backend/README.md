# Backend (Go Microservices)

## Services
- `api-gateway` - external entrypoint, routing, rate limiting
- `auth-service` - register/login/refresh JWT, roles `student`, `teacher`, `admin`
- `course-service` - course CRUD with teacher ownership
- `enrollment-service` - enrollments, study groups, invite links, grades

## Tech stack
- Go 1.25+
- PostgreSQL for persistence
- Kafka for domain events
- Chi for HTTP routing
- JWT + bcrypt for authentication and password storage

## Roles
- `student`
- `teacher`
- `admin`

Public registration is allowed only for `student` and `teacher`.
Admin user is bootstrapped from env vars on `auth-service` start.

## Kafka topics
- `user.registered`
- `course.created`
- `group.created`
- `grade.assigned`
- `enrollment.created`

## Quick start
1. Start PostgreSQL and Kafka locally.
2. Configure env vars from `.env.example`.
3. Run services in separate terminals:
   - `go run ./cmd/auth-service`
   - `go run ./cmd/course-service`
   - `go run ./cmd/enrollment-service`
   - `go run ./cmd/api-gateway`

All services auto-run embedded SQL migrations on startup.
Gateway default URL: `http://localhost:8080`.

## Core flow
1. Register as `student` or `teacher`: `POST /auth/register`
2. Login: `POST /auth/login`
3. Teacher creates a course: `POST /courses`
4. Teacher creates a study group: `POST /groups`
5. Teacher creates an invite link: `POST /groups/{id}/invites`
6. Student joins the group: `POST /invites/join`
7. Teacher assigns a grade: `POST /grades`

## Testing
- `go test ./...`