# infra (deployment and operations)

Owner: Infrastructure / DevOps. arc42 section 7 (Deployment View) is currently a stub, so this folder is a placeholder skeleton awaiting decisions.

To complete: target environments (dev, test, prod), hosting (containers / Kubernetes / app service / VM), how the SPA is served (static hosting / CDN), how the API and PostgreSQL are hosted and connected, secrets management, TLS termination, CI/CD pipeline, and how database migrations are applied on deploy.

- `docker/`: container definitions and compose files.
- `ci/`: pipeline definitions (test on every PR, OpenAPI contract validation, migrations).
- `k8s/`: Kubernetes manifests, if Kubernetes is chosen.
