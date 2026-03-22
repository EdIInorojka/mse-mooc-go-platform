# Migration Map: Legacy MOOC -> MSE-MOOC v2

## 1) Legacy Domain Model (MOOCAPI)

### Core entities
- `User`
  - fields: `Id`, `Login` (unique), `Password` (plain text), `Email` (unique), profile fields, `IsActive`
  - relations: many-to-many with `Course` (`UserCourses`)
- `Course`
  - fields: title, description, link, dates, price, language, flags for certification, credits, reviews
  - relations:
    - many-to-many with `User` (`UserCourses`)
    - many-to-many with `Discipline` (`CourseDisciplines`)
    - many-to-many with `Lecturer` (`CourseLecturers`)
    - many-to-one with `University` (`UniversityId` nullable)
- `Discipline`
  - fields: title, start/end date
  - relations: many-to-many with `Course`
- `University`
  - fields: name + metadata
  - relations: one-to-many with `Course`
- `Lecturer`
  - fields: first/last name + metadata
  - relations: many-to-many with `Course`

### Functional spaces in legacy UI (MOOCSite)
- User space:
  - course catalog + filters
  - enroll/unenroll
  - profile + password change
  - my courses
- Admin space:
  - dashboard
  - CRUD courses/universities/lecturers
  - relation management (course-disciplines, course-lecturers)

## 2) API Endpoint Map (Legacy)

> Base prefix: `/api`

### UsersController (`/api/Users`)
- `GET /Users` - list users
- `GET /Users/{id}` - get user
- `POST /Users` - register user
- `PUT /Users/{id}` - update user profile
- `DELETE /Users/{id}` - delete user
- `POST /Users/Authenticate` - login by login/email + password
- `POST /Users/{userId}/password` - change password
- `POST /Users/{userId}/courses/{courseId}` - enroll user into course
- `GET /Users/{userId}/courses/{courseId}/isEnrolled` - enrollment check
- `GET /Users/{userId}/courses` - user courses
- `DELETE /Users/{userId}/courses/{courseId}` - unenroll
- `GET /Users/courses/{courseId}` - users by course
- `GET /Users/{userId}/courses/count` - user courses count
- `GET /Users/{userId}/courses/{courseId}/canGetCertificate` - certificate eligibility check

### CoursesController (`/api/Courses`)
- `GET /Courses` - list courses + simple sort/search
- `GET /Courses/{id}` - course by id
- `POST /Courses` - create course
- `PUT /Courses/{id}` - update course
- `DELETE /Courses/{id}` - delete course
- `GET /Courses/{id}/disciplines` - disciplines for course
- `POST /Courses/{id}/disciplines/{disciplineId}` - attach discipline
- `DELETE /Courses/{id}/disciplines/{disciplineId}` - detach discipline
- `GET /Courses/Filter` - advanced filtering endpoint
- `GET /Courses/ByDiscipline/{disciplineId}` - courses by discipline
- `POST /Courses/{courseId}/lecturers/{lecturerId}` - attach lecturer

### DisciplinesController (`/api/Disciplines`)
- `GET /Disciplines`
- `GET /Disciplines/{id}`
- `POST /Disciplines`
- `PUT /Disciplines/{id}`
- `DELETE /Disciplines/{id}`
- `GET /Disciplines/{id}/courses`

### UniversitiesController (`/api/Universities`)
- `GET /Universities`
- `GET /Universities/{id}`
- `POST /Universities`
- `PUT /Universities/{id}`
- `DELETE /Universities/{id}`

### LecturersController (`/api/Lecturers`)
- `GET /Lecturers`
- `GET /Lecturers/{id}`
- `POST /Lecturers`
- `PUT /Lecturers/{id}`
- `DELETE /Lecturers/{id}`

## 3) Security and Scalability Gaps in Legacy

### Security gaps
- Passwords stored and compared in plain text.
- No JWT/OAuth2 session model in API layer.
- Admin access is hardcoded (`login == "admin"`) in UI.
- No RBAC/ABAC model in backend API.
- No refresh token rotation / revocation.
- No brute-force protection or rate limiting on auth endpoints.
- No strict request validation boundary DTOs for all writes.
- Potential overexposure of entities (password field on user model).

### Scalability/operational gaps
- Monolithic DB context and tightly coupled controllers.
- Synchronous request chains and no event-driven integration.
- No cache tier for hot reads (course catalog/filtering).
- No queue/broker for asynchronous workflows.
- No clear horizontal scaling strategy (stateless/session separation).
- Limited observability: no metrics/tracing/correlation-id by default.
- No explicit resilience patterns (timeouts/retries/circuit breakers).

### Correctness/API consistency gaps
- UI expects endpoints not implemented in API (`GET /Courses/{id}/lecturers`, some relation updates).
- Query parameters like `includeUniversity=true` are passed by UI but ignored in API.
- Relationship update flow in admin relies on dynamic payload assumptions.

## 4) Mapping to Target Go Microservices (MSE-MOOC v2)

## Proposed service boundaries
- `auth-service`
  - responsibility: identity, registration/login, role model, token lifecycle
  - owns: users, roles, refresh sessions
- `course-service`
  - responsibility: course catalog, filters, disciplines, universities, lecturers, relation CRUD
  - owns: courses + taxonomy data
- `enrollment-service`
  - responsibility: enroll/unenroll, user-course progress, certificate eligibility and issuance workflow
  - owns: enrollments and completion/certificate state
- `api-gateway`
  - responsibility: external API entrypoint, auth verification, rate limits, routing to services
- `notification-worker` (optional next step)
  - responsibility: async email/events from Kafka

## Data ownership mapping
- `User` -> `auth-service.users`
- `Course` -> `course-service.courses`
- `Discipline` -> `course-service.disciplines`
- `University` -> `course-service.universities`
- `Lecturer` -> `course-service.lecturers`
- `UserCourses` -> split:
  - enrollment state in `enrollment-service.enrollments`
  - denormalized course profile via API call/event sync from `course-service`

## Event model (Kafka)
- Produced by `auth-service`
  - `user.registered`
  - `user.role.changed`
- Produced by `course-service`
  - `course.created`
  - `course.updated`
  - `course.deleted`
- Produced by `enrollment-service`
  - `enrollment.created`
  - `enrollment.cancelled`
  - `certificate.eligible`

## Cache model (Redis)
- hot cache for course list/filter responses (`course-service`)
- token/session revocation list (`auth-service`)
- short-lived rate-limit counters (`api-gateway`)

## UI space mapping
- User space (`/app/*`)
  - catalog, course details, enrollment, profile
- Admin space (`/admin/*`)
  - CRUD for catalog and taxonomy, relation management, audit views
- Both spaces should use server-issued JWT with role claims and route guards.

## 5) Migration Phasing (suggested)
- Phase 1: auth-service + gateway + React auth shell
- Phase 2: course-service + user catalog UI
- Phase 3: enrollment-service + my courses
- Phase 4: admin UI + full CRUD + relation management
- Phase 5: Kafka-driven async flows, load tests, security hardening

## Assumptions / ambiguities
- Legacy model has no explicit role entity; assumed roles are `user` and `admin` in v2.
- Certificate issuance logic is currently placeholder; assumed ownership by `enrollment-service`.
- Current API and UI contract mismatch suggests some endpoints were planned but not completed.
