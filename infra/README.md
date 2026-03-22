# Infra for MSE-MOOC

Infrastructure layer for the Go + React rewrite of MSE-MOOC.

## What is included

- Kubernetes manifests for:
  - `api-gateway`
  - `auth-service`
  - `course-service`
  - `enrollment-service`
  - `frontend`
- Data and event stack:
  - `postgres`
  - `redis`
  - `zookeeper`
  - `kafka`
- Shared `ConfigMap` and example `Secret`
- Bootstrap migration job for the base PostgreSQL schema
- `Ingress` for nginx
- `HorizontalPodAutoscaler` for `api-gateway` and `course-service`
- `NetworkPolicy` set with default deny + explicit allow rules
- `docker-compose.dev.yml` for local development

## Structure

```text
infra/
  docker-compose.dev.yml
  k8s/
    kustomization.yaml
    namespace.yaml
    apps/
    data/
    jobs/
    platform/
    policies/
  migrations/
```

## Kubernetes deploy

Prerequisites:
- Kubernetes cluster with dynamic storage provisioner
- nginx ingress controller installed
- metrics-server installed for HPA
- container registry that stores images such as `mse-mooc/api-gateway:latest`

1. Review and replace secret values in `k8s/platform/secrets.example.yaml`.
2. If needed, rename the file to a real secret manifest or create the secret separately.
3. Build and push application images.
4. Apply manifests:

```bash
kubectl apply -k infra/k8s
```

5. Run the bootstrap migration job once for a fresh environment:

```bash
kubectl apply -f infra/k8s/jobs/db-migrations.yaml
kubectl -n mse-mooc logs job/mse-mooc-db-migrations
```

6. Add a local host entry for ingress testing:

```text
127.0.0.1 mse-mooc.local
```

7. Verify rollout:

```bash
kubectl -n mse-mooc get pods
kubectl -n mse-mooc get ingress
kubectl -n mse-mooc get hpa
```

## Local development with Docker Compose

Default mode starts only the data/event stack:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

Bootstrap the PostgreSQL schema in local dev:

```bash
docker compose -f infra/docker-compose.dev.yml --profile migrations run --rm migrations
```

Full mode starts apps too:

```bash
docker compose -f infra/docker-compose.dev.yml --profile apps up -d --build
```

Notes:
- App build contexts are configurable through env vars:
  - `API_GATEWAY_CONTEXT`
  - `AUTH_SERVICE_CONTEXT`
  - `COURSE_SERVICE_CONTEXT`
  - `ENROLLMENT_SERVICE_CONTEXT`
  - `FRONTEND_CONTEXT`
- Default paths assume sibling directories under `../backend` and `../frontend`.
- If the backend/frontend layout differs, override these variables before running Compose.
- The `migrations` profile runs a one-shot PostgreSQL bootstrap that creates the `mse_mooc` schema.

## Security notes

- `k8s/platform/secrets.example.yaml` is a template. Replace every secret before any shared or production deployment.
- Current Kafka manifest is a single-broker template for development and course demo environments. For production, use TLS, SASL, multiple brokers, and separate listeners.
- Redis is password-protected, but traffic encryption is not enabled in these templates.
- Ingress TLS is intentionally not enabled by default because local lab clusters often terminate HTTP only. For real deployment, add TLS certificates and enable redirect.
- Network policies assume the ingress controller runs in namespace `ingress-nginx`.

## HA and scalability notes

- `api-gateway`, `auth-service`, `course-service`, `enrollment-service`, and `frontend` are stateless Deployments and can be scaled horizontally.
- HPA is configured for `api-gateway` and `course-service`; extend the same pattern to the other services when metrics are stable.
- `postgres`, `redis`, `zookeeper`, and `kafka` are configured as single-node StatefulSets. This is enough for development and the first course demo, but not for true fault tolerance.
- For production-grade HA, move to managed Postgres, Redis Sentinel or managed Redis, and a multi-broker Kafka cluster.
- Add PodDisruptionBudgets, anti-affinity, and backup jobs before production use.
- The migration job is intentionally minimal and is meant to be replaced by the real backend migration set once the application schema is finalized.

## Suggested next infra improvements

- Add `cert-manager` and TLS for ingress
- Split manifests into `base` and `overlays/dev|prod`
- Add Prometheus/Grafana and centralized log shipping
- Add database migration jobs and topic bootstrap jobs
- Add PodDisruptionBudgets and topology spread constraints
