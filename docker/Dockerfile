# ============================================================================
# CincoDeBio All-in-One Container (k3s)
#
# Packages the entire CincoDeBio platform into a single Docker container
# running k3s (lightweight Kubernetes).  The only host dependency is Docker.
#
# Build (from cincodebio/ directory):
#   docker build -f docker/Dockerfile -t cincodebio-aio .
#
# Run:
#   docker run -d --privileged --cgroupns=host --name cincodebio \
#     -p 80:80 \
#     -e DOCKER_HUB_USERNAME=<user> \
#     -e DOCKER_HUB_PASSWORD=<pass> \
#     -p 5007:5007 \
#     cincodebio-aio
#
# Access:  http://localhost/app/   (allow ~5 min for first start)
# Logs:    docker logs -f cincodebio
# Shell:   docker exec -it cincodebio kubectl get pods
# Stop:    docker stop cincodebio && docker rm cincodebio
# ============================================================================

ARG K3S_TAG=v1.28.13-k3s1

# --- Stage 1: Collect tools ---
FROM alpine:3.20 AS tools
RUN apk add --no-cache curl bash openssl
RUN curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | \
    VERIFY_CHECKSUM=false bash

# --- Stage 2: k3s runtime ---
FROM rancher/k3s:${K3S_TAG}

COPY --from=tools /usr/local/bin/helm /usr/local/bin/helm

# k3s containerd registry mirror — allows containerd to pull images pushed
# to the in-cluster registry (registry.kube-system.svc.cluster.local)
# via localhost:5000 (the registry pod's hostPort).
COPY docker/registries.yaml /etc/rancher/k3s/registries.yaml

# Helm chart, Docker-specific value overrides, and supporting manifests
COPY charts/cincodebio/           /opt/cincodebio/chart/
COPY docker/values-docker.yaml    /opt/cincodebio/values-docker.yaml
COPY docker/registry.yaml         /opt/cincodebio/registry.yaml
# Editor language bundle — packed into a ConfigMap and mounted by the editor at startup.
COPY cinco-de-bio-editor/languages/ /opt/cincodebio/editor-languages/

# Entrypoint
COPY docker/entrypoint.sh         /opt/cincodebio/entrypoint.sh
RUN chmod +x /opt/cincodebio/entrypoint.sh

ENV HOME=/root

# k3s-only: install.sh mounts image tarballs here before starting the container.
# Minikube uses 'minikube image load' in install.sh; this directory is not used there.
RUN mkdir -p /var/lib/rancher/k3s/agent/images

# 80 = nginx-ingress HTTP, 5007 = Cinco GLSP diagram websocket
EXPOSE 80 5007

ENTRYPOINT ["/opt/cincodebio/entrypoint.sh"]
