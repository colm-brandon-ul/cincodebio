# CincoDeBio All-in-One Docker Image

Run the complete CincoDeBio platform inside a **single Docker container** using [k3s](https://k3s.io/) (lightweight Kubernetes). The only dependency is **Docker**.

## Quick Start

```bash
# Build (from the cincodebio/ directory)
docker build -f docker/Dockerfile -t cincodebio-aio .

# Run
docker run -d --privileged --cgroupns=host --name cincodebio \
  -p 80:80 \
  -p 5007:5007 \
  cincodebio-aio

# Watch startup logs (~5 minutes on first run)
docker logs -f cincodebio

# Once you see "CincoDeBio is ready!" open:
#   http://localhost/app/
#   http://localhost/editor/
#
# Optional editor recording:
#   CINCODEBIO_EDITOR_URL=http://localhost/editor/ npm run test:editor-model
#   CINCODEBIO_EDITOR_URL=http://localhost/editor/ \
#   CINCODEBIO_KUBECTL_COMMAND='docker exec -i cincodebio kubectl' \
#   npm run test:editor-recording
```

## What's Inside

The container packages:

| Component | Purpose |
| --------- | ------- |
| **k3s** (Kubernetes v1.28) | Container orchestration |
| **nginx-ingress** | Routes HTTP traffic to services |
| **cert-manager** v1.17.2 | TLS certificates (self-signed for local) |
| **Container registry** | In-cluster image registry for kaniko builds |
| **CincoDeBio Helm chart** | Application services, editor, MongoDB, MinIO, and RabbitMQ |

## Access Points

All services are accessible through a single port (80) via ingress routing:

| Service | URL |
| ------- | --- |
| Frontend | `http://localhost/app/` |
| CincoDeBio Editor | `http://localhost/editor/` |
| Editor GLSP WebSocket | `ws://localhost:5007/cinco-diagram` |
| Minio Console | `http://localhost/minio-console/` |
| Execution API | `http://localhost/execution-api/...` |
| Service API | `http://localhost/services-api/...` |
| SIB Manager | `http://localhost/sib-manager/...` |
| Data Manager | `http://localhost/data-manager/...` |
| Jobs API | `http://localhost/jobs-api/...` |

## Management

```bash
# View pods
docker exec cincodebio kubectl get pods

# View logs for a service
docker exec cincodebio kubectl logs -l app=sib-manager

# Restart a service
docker exec cincodebio kubectl rollout restart deployment/sib-manager

# Stop
docker stop cincodebio && docker rm cincodebio
```

## Persist Data Across Restarts

Mount a volume for k3s state:

```bash
docker run -d --privileged --cgroupns=host --name cincodebio \
  -p 80:80 \
  -e DOCKER_HUB_USERNAME=<user> \
  -e DOCKER_HUB_PASSWORD=<pass> \
  -p 5007:5007 \
  -v cincodebio-data:/var/lib/rancher/k3s \
  cincodebio-aio
```

> **Note:** The first run always performs a fresh install. On subsequent runs with the same volume, k3s restores previous state.

## Requirements

- **Docker** (Docker Desktop on macOS/Windows, Docker Engine on Linux)
- **4 GB+ RAM** allocated to Docker
- **~10 GB disk** for images and data
- **Internet access** on first run (pulls container images)

## Troubleshooting

| Symptom | Fix |
| ------- | --- |
| Container exits immediately | Check logs: `docker logs cincodebio` for the failing startup step |
| Services not reachable on port 80 | Ensure no other process uses port 80, or map to another port: `-p 8080:80` |
| Image pull errors inside container | Check internet connectivity; retry `docker stop/rm/run` |
| Slow first start (>10 min) | Normal on first run — images are pulled from remote registries |
| Editor opens but model creation hangs | Ensure `-p 5007:5007` is present and rerun with the current image; the editor pod installs `procps` and opens `/editor/workspace` for Theia workspace APIs |
| Docker Hub rate-limit errors | Rerun with `-e DOCKER_HUB_USERNAME=<user> -e DOCKER_HUB_PASSWORD=<pass>` to enable authenticated pulls |
| Editor image pull is very slow | If the editor image is already cached locally, run `docker save registry.gitlab.com/scce/cinco-projects/cinco-editor/cinco-editor:fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62 -o /tmp/cinco-editor.tar`, then add `-v /tmp/cinco-editor.tar:/var/lib/rancher/k3s/agent/images/cinco-editor.tar:ro` to the `docker run` command |

For local validation, you can also avoid pulling the editor from GitLab by pushing the cached image to a host-local registry and overriding the chart image:

```bash
docker run -d --name cdb-editor-registry -p 5001:5000 registry:2
docker tag registry.gitlab.com/scce/cinco-projects/cinco-editor/cinco-editor:fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62 \
  localhost:5001/cinco-editor:fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62
docker push localhost:5001/cinco-editor:fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62

docker run -d --privileged --cgroupns=host --name cincodebio \
  -p 80:80 \
  -p 5007:5007 \
  -e CINCODEBIO_EDITOR_IMAGE=host.docker.internal:5001/cinco-editor:fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62 \
  cincodebio-aio
```

## Architecture

```text
┌─────────────────────────────────────────────────────┐
│  Docker Container (--privileged)                    │
│                                                     │
│  k3s (Kubernetes v1.28)                             │
│  ├── nginx-ingress :80 ──→ hostPort ──→ -p 80:80   │
│  ├── cert-manager                                   │
│  ├── container registry :5000 (hostPort)            │
│  │                                                  │
│  └── default namespace                              │
│      ├── frontend                                   │
│      ├── cinco-de-bio-editor                        │
│      ├── sib-manager → kaniko → service-api         │
│      ├── execution-api                              │
│      ├── jobs-api                                   │
│      ├── data-manager                               │
│      ├── code-generator                             │
│      ├── ontology-manager                           │
│      ├── execution-environment                      │
│      ├── mongodb                                    │
│      ├── minio                                      │
│      └── rabbitmq                                   │
└─────────────────────────────────────────────────────┘
         ▲
         │ -p 80:80, -p 5007:5007 (editor)
         ▼
    http://localhost/app/
```

## Alternatives

If you need more flexibility than the all-in-one container:

| Approach | Dependencies | Pros | Cons |
| -------- | ------------ | ---- | ---- |
| **This image** | Docker only | Simplest setup, single command | `--privileged --cgroupns=host`, no hot-reload |
| **install.sh + minikube** | Docker, minikube, helm, kubectl | Full control, live code editing | 4 tool installs |
| **k3d** | Docker, k3d | Lightweight clusters, multi-node support | 1 extra binary |
| **kind** | Docker, kind | Production-like kubeadm clusters | 1 extra binary, heavier |
| **Docker Compose** | Docker, docker-compose | No Kubernetes overhead | Requires rewriting all manifests |
