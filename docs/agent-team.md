# Agent Team: MSE-MOOC Rewrite

## Mission
Переписать legacy MOOC систему на Go + React с Kubernetes-инфраструктурой, нагрузочной устойчивостью и безопасностью, включая отдельные user/admin пространства.

## Agent 1 - Product/Domain Analyst
- Scope: `docs/`
- Responsibilities:
  - карта домена и API legacy
  - карта миграции в v2 сервисы
  - матрица рисков и требований безопасности
- Deliverables:
  - `docs/migration-map.md`

## Agent 2 - Backend Platform Engineer (Go)
- Scope: `backend/`
- Responsibilities:
  - auth/course/enrollment/gateway сервисы
  - JWT + RBAC (`user/admin`)
  - health/readiness, middleware, graceful shutdown
  - Dockerfiles и тесты
- Deliverables:
  - runnable backend scaffold
  - `go test ./...` зелёный

## Agent 3 - Frontend Engineer (React)
- Scope: `frontend/`
- Responsibilities:
  - user space (`/app/*`)
  - admin space (`/admin/*`)
  - auth context, route guards, API client
  - responsive UI и production build
- Deliverables:
  - `npm run build` без ошибок
  - базовые страницы user/admin

## Agent 4 - Infrastructure/SRE Engineer
- Scope: `infra/`
- Responsibilities:
  - Kubernetes manifests (apps + data stack)
  - Postgres/Redis/Kafka/Zookeeper
  - HPA, probes, network policies
  - docker-compose для dev
- Deliverables:
  - `infra/k8s` применим через kustomize
  - `infra/docker-compose.dev.yml` синхронизирован с реальной структурой

## Agent 5 - Security Engineer
- Scope: cross-cutting (`backend/`, `infra/`, `docs/`)
- Responsibilities:
  - hardening checklist
  - секреты/конфиги, RBAC, rate limits, CORS
  - минимальные security baselines для курсового MVP
- Deliverables:
  - список обязательных доработок перед продакшеном

## Agent 6 - QA/Performance Engineer
- Scope: `docs/`, `backend/`
- Responsibilities:
  - smoke-check сценарии
  - первичная стратегия нагрузочных тестов
  - критерии готовности релиза
- Deliverables:
  - тестовый чеклист и next steps по perf

## Iteration cadence
- Sprint 1: bootstrap (архитектура + scaffold)
- Sprint 2: функциональная полнота user/admin
- Sprint 3: наблюдаемость, perf, hardening

## Definition of Done (MVP)
- Разделены user/admin пространства на frontend и backend уровне.
- Backend работает как набор независимых сервисов через gateway.
- Инфра включает Postgres + Redis + Kafka в Kubernetes.
- Включены probes, HPA и базовые network policies.
- Сборки backend/frontend проходят локально.
