# MSE-MOOC v2

Новый контур курсового проекта: переписывание legacy MOOC системы на Go + React с инфраструктурой Kubernetes.
Status: architectural and educational prototype. Not deployed to production.

## Что уже подготовлено
- Go backend из 4 сервисов:
  - `api-gateway`
  - `auth-service`
  - `course-service`
  - `enrollment-service`
- React frontend с разделением пространств:
  - `/app/*` (student)
  - `/admin/*` (admin)
- Инфраструктурный слой:
  - Kubernetes манифесты
  - Postgres + Redis + Kafka + Zookeeper
  - HPA, probes, network policies
- Документация миграции и агентной команды.

## Структура
- `backend/` - Go микросервисы
- `frontend/` - React web приложение
- `infra/` - Kubernetes и docker-compose инфраструктура
- `docs/` - архитектурные документы, миграция, команда агентов

## Быстрый запуск (локально)

### Backend
```bash
cd backend
go test ./...
go run ./cmd/auth-service
# в отдельных терминалах:
go run ./cmd/course-service
go run ./cmd/enrollment-service
go run ./cmd/api-gateway
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

По умолчанию frontend использует `http://localhost:8080/api`.

## Важные документы
- `docs/migration-map.md` - карта миграции legacy -> v2
- `docs/agent-team.md` - команда агентов и зоны ответственности
- `docs/security-and-scale.md` - baseline по безопасности и масштабированию
