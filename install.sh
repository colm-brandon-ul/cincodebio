#!/usr/bin/env bash
# ============================================================================
# CincoDeBio Local Installer
#
# Deploys the full CincoDeBio platform with a selectable runtime:
#
#   CINCODEBIO_RUNTIME=k3s        (default) — one privileged Docker container
#                                  running an embedded k3s cluster.
#                                  Host prerequisite: Docker only.
#                                  Access: http://localhost/app/ , /editor/
#
#   CINCODEBIO_RUNTIME=minikube   — deploys the same Helm chart onto a local
#                                  minikube cluster (profile "cincodebio-mk").
#                                  Host prerequisites: Docker, minikube, helm.
#                                  Reach via a port-forward (see deploy_minikube
#                                  output) or `minikube -p cincodebio-mk tunnel`.
#
# Common env: DOCKER_HUB_USERNAME / DOCKER_HUB_PASSWORD (authenticated pulls).
# The workspace root provides install_k3s.sh / install_minikube.sh wrappers.
# ============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTAINER_NAME="${CINCODEBIO_CONTAINER_NAME:-cincodebio}"
IMAGE_NAME="${CINCODEBIO_IMAGE_NAME:-cincodebio-aio}"
READY_TIMEOUT="${CINCODEBIO_READY_TIMEOUT:-1800}"
BUILD_LOCAL_IMAGES="${CINCODEBIO_BUILD_LOCAL_IMAGES:-true}"
EDITOR_IMAGE="${CINCODEBIO_EDITOR_IMAGE:-registry.gitlab.com/scce/cinco-projects/cinco-editor/cinco-editor@sha256:3a7ab800ebe4734401be8d204c341b79c72a73746fb45da69b829ea80b1eeafc}"

# Deployment runtime: "k3s" (single privileged Docker container, default) or "minikube"
# (deploys the Helm chart onto a local minikube cluster as an alternative).
RUNTIME="${CINCODEBIO_RUNTIME:-k3s}"
# NOTE: the minikube profile name becomes a Docker container name, so it must NOT collide with
# the k3s all-in-one container (CONTAINER_NAME, default "cincodebio"). Keep them distinct so both
# runtimes can coexist on the same host.
MINIKUBE_PROFILE="${CINCODEBIO_MINIKUBE_PROFILE:-cincodebio-mk}"
MINIKUBE_CPUS="${CINCODEBIO_MINIKUBE_CPUS:-4}"
MINIKUBE_MEMORY="${CINCODEBIO_MINIKUBE_MEMORY:-8192}"
MINIKUBE_DISK="${CINCODEBIO_MINIKUBE_DISK:-40g}"
MINIKUBE_TUNNEL_PID=""

mk() { minikube --profile "$MINIKUBE_PROFILE" kubectl -- "$@"; }

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
ts() { date '+%H:%M:%S'; }
elapsed() { printf '%4ss' "$SECONDS"; }
info()  { echo -e "${GREEN}[INFO]${NC}  [$(ts)][+$(elapsed)] $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  [$(ts)][+$(elapsed)] $*"; }
error() { echo -e "${RED}[ERROR]${NC} [$(ts)][+$(elapsed)] $*"; exit 1; }

check_tool() {
  command -v "$1" >/dev/null 2>&1 || error "'$1' is not installed. Please install Docker first."
}

check_docker_daemon() {
  local timeout="${1:-90}"
  local deadline=$((SECONDS + timeout))
  local next_progress=$((SECONDS + 15))
  local pid

  docker info >/dev/null 2>&1 &
  pid=$!

  while kill -0 "$pid" 2>/dev/null; do
    if [[ $SECONDS -ge $deadline ]]; then
      kill "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi

    if [[ $SECONDS -ge $next_progress ]]; then
      warn "Still waiting for Docker daemon to answer... elapsed ${SECONDS}s / timeout ${timeout}s."
      next_progress=$((SECONDS + 15))
    fi

    sleep 1
  done

  wait "$pid"
}

cleanup_log_stream() {
  if [[ -n "${LOG_STREAM_PID:-}" ]] && kill -0 "$LOG_STREAM_PID" 2>/dev/null; then
    kill "$LOG_STREAM_PID" 2>/dev/null || true
  fi
  if [[ -n "${LOG_FILE:-}" && -f "$LOG_FILE" ]]; then
    rm -f "$LOG_FILE"
  fi
  if [[ -n "${IMAGE_PRELOAD_DIR:-}" && -d "$IMAGE_PRELOAD_DIR" ]]; then
    rm -rf "$IMAGE_PRELOAD_DIR"
  fi
  return 0
}

start_startup_log_stream() {
  docker logs -f "$CONTAINER_NAME" 2>&1 &
  LOG_STREAM_PID=$!
}

docker_pull_tag_save() {
  local source_image="$1"
  local target_image="$2"
  local tar_name="$3"
  local attempts=0
  local max_attempts=4
  local save_attempts=0
  local target_cached=false

  info "Preparing image $target_image..."
  if docker image inspect "$target_image" >/dev/null 2>&1; then
    info "Using cached local image $target_image."
    target_cached=true
  else
    while true; do
      attempts=$((attempts + 1))
      if docker pull "$source_image" >/dev/null; then
        break
      fi
      if [[ $attempts -ge $max_attempts ]]; then
        if docker image inspect "$source_image" >/dev/null 2>&1; then
          warn "Pull failed for $source_image but a local cached copy exists; continuing."
          break
        fi
        error "Failed to pull $source_image after $max_attempts attempts."
      fi
      warn "Pull failed for $source_image (attempt $attempts/$max_attempts). Retrying..."
      sleep 3
    done
  fi

  if [[ "$source_image" != "$target_image" && "$target_cached" != "true" ]]; then
    docker tag "$source_image" "$target_image"
  fi

  attempts=0
  while true; do
    save_attempts=$((save_attempts + 1))
    info "Saving $target_image to preload bundle ($save_attempts/$max_attempts)..."
    if docker save "$target_image" -o "$IMAGE_PRELOAD_DIR/$tar_name.tar"; then
      break
    fi
    if [[ $save_attempts -ge $max_attempts ]]; then
      error "Failed to save $target_image after $max_attempts attempts."
    fi
    warn "Save failed for $target_image (attempt $save_attempts/$max_attempts). Retrying..."
    sleep 2
  done
}

build_and_save_service_image() {
  local service_name="$1"
  local service_path="$2"
  local image="sccecincodebio/$service_name:latest"
  local service_dir="$SCRIPT_DIR/services/$service_path"
  local source_hash

  source_hash="$(cd "$service_dir" && find app -type f -print | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | awk '{print $1}')"
  info "Building or refreshing local service image $image (source $source_hash)..."
  docker build --build-arg "CINCODEBIO_SOURCE_HASH=$source_hash" -t "$image" "$service_dir"
  docker save "$image" -o "$IMAGE_PRELOAD_DIR/$service_name.tar"
}

prepare_k3s_image_preload() {
  IMAGE_PRELOAD_DIR="$(mktemp -d -t cincodebio-images.XXXXXX)"

  info "Preparing k3s image preload bundle..."
  docker_pull_tag_save "mirror.gcr.io/library/busybox:1.36" "busybox:1.36" "busybox"
  docker_pull_tag_save "mirror.gcr.io/library/registry:2" "registry:2" "registry"
  docker_pull_tag_save "mirror.gcr.io/library/mongo:latest" "mongo:latest" "mongo"
  docker_pull_tag_save "mirror.gcr.io/library/rabbitmq:3-management" "rabbitmq:3-management" "rabbitmq"
  docker_pull_tag_save "quay.io/minio/minio:latest" "quay.io/minio/minio:latest" "minio"
  docker_pull_tag_save "quay.io/minio/mc:latest" "quay.io/minio/mc:latest" "minio-mc"
  docker_pull_tag_save "gcr.io/kaniko-project/executor:latest" "gcr.io/kaniko-project/executor:latest" "kaniko"
  docker_pull_tag_save "$EDITOR_IMAGE" "$EDITOR_IMAGE" "cinco-de-bio-editor"

  if [[ "$BUILD_LOCAL_IMAGES" == "true" ]]; then
    build_and_save_service_image "jobs-api" "jobs-api"
    build_and_save_service_image "data-manager" "data-manager"
    build_and_save_service_image "execution-api" "execution-api"
    build_and_save_service_image "service-api" "service-api"
    build_and_save_service_image "code-generator" "code-generator"
    build_and_save_service_image "ontology-manager" "ontology-manager"
    build_and_save_service_image "sib-manager" "sib-manager"
    build_and_save_service_image "execution-environment" "execution-environment"
    build_and_save_service_image "frontend" "frontend"
  else
    warn "Skipping local service image builds; k3s will pull sccecincodebio images from the registry."
  fi
}

remove_existing_container() {
  local attempts=0
  local max_attempts=30

  if ! docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
    return 0
  fi

  info "Removing existing container '$CONTAINER_NAME'..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

  while docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; do
    attempts=$((attempts + 1))
    if [[ $attempts -ge $max_attempts ]]; then
      error "Timed out waiting for container '$CONTAINER_NAME' to be removed."
    fi
    warn "Container removal still in progress; waiting..."
    sleep 2
  done
}

wait_for_ready_marker() {
  local deadline=$((SECONDS + READY_TIMEOUT))
  local next_progress=$((SECONDS + 30))
  LOG_FILE="$(mktemp -t cincodebio-install.XXXXXX)"
  docker logs -f "$CONTAINER_NAME" 2>&1 | tee "$LOG_FILE" &
  LOG_STREAM_PID=$!

  while true; do
    if grep -q "CincoDeBio is ready!" "$LOG_FILE" 2>/dev/null; then
      cleanup_log_stream
      info "CincoDeBio ready marker detected."
      return 0
    fi

    if docker logs "$CONTAINER_NAME" --tail 250 2>/dev/null | grep -q "CincoDeBio is ready!"; then
      cleanup_log_stream
      info "CincoDeBio ready marker detected."
      return 0
    fi

    if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" != "true" ]]; then
      cleanup_log_stream
      docker logs "$CONTAINER_NAME" --tail 120 2>/dev/null || true
      error "Container '$CONTAINER_NAME' exited before CincoDeBio became ready."
    fi

    if [[ $SECONDS -ge $deadline ]]; then
      cleanup_log_stream
      docker logs "$CONTAINER_NAME" --tail 160 2>/dev/null || true
      error "Timed out waiting for CincoDeBio to become ready after ${READY_TIMEOUT}s."
    fi

    if [[ $SECONDS -ge $next_progress ]]; then
      warn "Still waiting for ready marker... elapsed ${SECONDS}s / timeout ${READY_TIMEOUT}s."
      next_progress=$((SECONDS + 30))
    fi

    sleep 2
  done
}

wait_for_k8s_api() {
  local deadline=$((SECONDS + READY_TIMEOUT))
  local next_progress=$((SECONDS + 15))

  info "Waiting for k3s Kubernetes API to answer..."
  while true; do
    if docker exec "$CONTAINER_NAME" kubectl get nodes 2>/dev/null | grep -q " Ready"; then
      info "k3s Kubernetes API is ready."
      return 0
    fi

    if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" != "true" ]]; then
      docker logs "$CONTAINER_NAME" --tail 120 2>/dev/null || true
      error "Container '$CONTAINER_NAME' exited before k3s became ready."
    fi

    if [[ $SECONDS -ge $deadline ]]; then
      docker logs "$CONTAINER_NAME" --tail 160 2>/dev/null || true
      error "Timed out waiting for k3s Kubernetes API after ${READY_TIMEOUT}s."
    fi

    if [[ $SECONDS -ge $next_progress ]]; then
      warn "Still waiting for k3s Kubernetes API... elapsed ${SECONDS}s / timeout ${READY_TIMEOUT}s."
      next_progress=$((SECONDS + 15))
    fi

    sleep 2
  done
}

wait_for_app() {
  local app="$1"
  local timeout="${2:-600s}"
  local timeout_seconds="${timeout%s}"
  local deadline=$((SECONDS + timeout_seconds))
  local next_progress=$((SECONDS + 30))

  info "Waiting for $app pod to be Ready..."
  while true; do
    if docker exec "$CONTAINER_NAME" kubectl wait --for=condition=Ready pod -l "app=$app" -n default --timeout=15s >/dev/null 2>&1; then
      info "$app pod is Ready."
      return 0
    fi

    if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" != "true" ]]; then
      docker logs "$CONTAINER_NAME" --tail 120 2>/dev/null || true
      error "Container '$CONTAINER_NAME' exited before $app became ready."
    fi

    if [[ $SECONDS -ge $deadline ]]; then
      docker exec "$CONTAINER_NAME" kubectl get pods -n default -l "app=$app" 2>/dev/null || true
      docker logs "$CONTAINER_NAME" --tail 160 2>/dev/null || true
      error "Timed out waiting for $app pod to become Ready after $timeout."
    fi

    if [[ $SECONDS -ge $next_progress ]]; then
      warn "Still waiting for $app pod... elapsed ${SECONDS}s / timeout ${timeout_seconds}s."
      docker exec "$CONTAINER_NAME" kubectl get pods -n default -l "app=$app" 2>/dev/null | sed 's/^/[POD]  /' || true
      next_progress=$((SECONDS + 30))
    fi
  done
}

wait_for_container_http() {
  local label="$1"
  local url="$2"
  local deadline=$((SECONDS + READY_TIMEOUT))
  local next_progress=$((SECONDS + 20))

  info "Waiting for $label to answer through the local ingress..."
  while true; do
    if docker exec "$CONTAINER_NAME" wget -q -T 5 -O /dev/null "$url" >/dev/null 2>&1; then
      info "$label is reachable."
      return 0
    fi

    if [[ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null || echo false)" != "true" ]]; then
      docker logs "$CONTAINER_NAME" --tail 120 2>/dev/null || true
      error "Container '$CONTAINER_NAME' exited before $label became reachable."
    fi

    if [[ $SECONDS -ge $deadline ]]; then
      docker logs "$CONTAINER_NAME" --tail 160 2>/dev/null || true
      error "Timed out waiting for $label at $url after ${READY_TIMEOUT}s."
    fi

    if [[ $SECONDS -ge $next_progress ]]; then
      warn "Still waiting for $label at $url... elapsed ${SECONDS}s / timeout ${READY_TIMEOUT}s."
      next_progress=$((SECONDS + 20))
    fi

    sleep 2
  done
}

# ============================================================================
# minikube runtime (CINCODEBIO_RUNTIME=minikube)
# Deploys the same Helm chart onto a local minikube cluster instead of the
# all-in-one k3s container. Mirrors docker/entrypoint.sh's deployment steps.
# ============================================================================
cleanup_minikube_tunnel() {
  if [[ -n "${MINIKUBE_TUNNEL_PID:-}" ]] && kill -0 "$MINIKUBE_TUNNEL_PID" 2>/dev/null; then
    kill "$MINIKUBE_TUNNEL_PID" 2>/dev/null || true
  fi
}

mk_load_image() {
  # mk_load_image <image> [build_dir] [build_arg]
  local image="$1" build_dir="${2:-}" build_arg="${3:-}"
  if [[ -z "$build_dir" ]] && minikube --profile "$MINIKUBE_PROFILE" image ls 2>/dev/null | grep -q "${image%@*}"; then
    info "$image already present in minikube; skipping load."
    return 0
  fi
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    if [[ -n "$build_dir" ]]; then
      info "Building $image for minikube..."
      if [[ -n "$build_arg" ]]; then
        docker build --build-arg "$build_arg" -t "$image" "$build_dir"
      else
        docker build -t "$image" "$build_dir"
      fi
    else
      info "Pulling $image for minikube..."
      docker pull "$image" >/dev/null || warn "Could not pull $image; minikube will try to pull it."
    fi
  fi
  info "Loading $image into minikube..."
  minikube --profile "$MINIKUBE_PROFILE" image load "$image" 2>/dev/null \
    || warn "minikube image load failed for $image; the cluster may pull it from the registry."
}

wait_for_minikube_app() {
  local app="$1" timeout="${2:-300s}"
  info "Waiting for $app pod to be Ready..."
  if mk wait --for=condition=Ready pod -l "app=$app" -n default --timeout="$timeout" >/dev/null 2>&1; then
    info "$app pod is Ready."
  else
    warn "$app pod not Ready within $timeout."
    mk get pods -n default -l "app=$app" 2>/dev/null | sed 's/^/[POD]  /' || true
  fi
}

deploy_minikube() {
  info "Deploying CincoDeBio onto minikube (profile: $MINIKUBE_PROFILE)..."
  check_tool minikube
  check_tool helm

  # ---- Start cluster -------------------------------------------------------
  if minikube --profile "$MINIKUBE_PROFILE" status >/dev/null 2>&1; then
    info "minikube profile '$MINIKUBE_PROFILE' already running."
  else
    info "Starting minikube (cpus=$MINIKUBE_CPUS memory=$MINIKUBE_MEMORY disk=$MINIKUBE_DISK)..."
    minikube --profile "$MINIKUBE_PROFILE" start \
      --driver=docker --cpus="$MINIKUBE_CPUS" --memory="$MINIKUBE_MEMORY" --disk-size="$MINIKUBE_DISK" \
      --kubernetes-version=v1.28.13 \
      || error "minikube failed to start."
  fi

  info "Enabling ingress addon..."
  minikube --profile "$MINIKUBE_PROFILE" addons enable ingress >/dev/null 2>&1 \
    || warn "Could not enable ingress addon."
  info "Waiting for ingress-nginx controller..."
  mk -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=180s 2>/dev/null \
    || warn "ingress-nginx controller not ready yet."
  # The CincoDeBio ingress uses nginx configuration-snippet annotations; the minikube ingress
  # addon disables those by default, so enable them (the k3s path sets allowSnippetAnnotations=true).
  # Also disable global ssl-redirect (the k3s path sets controller.config.ssl-redirect=false);
  # otherwise the ingress answers HTTP requests with a 308 redirect to HTTPS.
  info "Enabling snippet annotations and disabling ssl-redirect on ingress-nginx..."
  mk -n ingress-nginx patch configmap ingress-nginx-controller --type merge \
    -p '{"data":{"allow-snippet-annotations":"true","annotations-risk-level":"Critical","ssl-redirect":"false"}}' 2>/dev/null \
    || warn "Could not patch ingress-nginx config."
  mk -n ingress-nginx rollout restart deployment/ingress-nginx-controller 2>/dev/null || true
  mk -n ingress-nginx rollout status deployment/ingress-nginx-controller --timeout=120s 2>/dev/null || true

  # ---- CoreDNS: resolve minio.localhost in-cluster -> ingress --------------
  # Interactive SIBs + data-manager generate presigned MinIO URLs against minio.localhost.
  # minio-py does an in-cluster bucket-region lookup against that host when generating the
  # URL, which fails (minio.localhost is otherwise only browser-resolvable). Rewrite it to
  # the ingress service so the lookup succeeds (the ingress routes minio.localhost -> minio).
  info "Adding CoreDNS rewrite for minio.localhost..."
  local corefile
  corefile="$(mk get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}' 2>/dev/null)"
  if [[ -n "$corefile" ]] && ! printf '%s' "$corefile" | grep -q "rewrite name minio.localhost"; then
    printf '%s' "$corefile" | sed 's#^\( *\)ready#\1ready\n\1rewrite name minio.localhost ingress-nginx-controller.ingress-nginx.svc.cluster.local#' > /tmp/cdb-mk-Corefile
    mk get configmap coredns -n kube-system -o jsonpath='{.data.NodeHosts}' > /tmp/cdb-mk-NodeHosts 2>/dev/null || true
    if [[ -s /tmp/cdb-mk-NodeHosts ]]; then
      mk create configmap coredns -n kube-system \
        --from-file=Corefile=/tmp/cdb-mk-Corefile --from-file=NodeHosts=/tmp/cdb-mk-NodeHosts \
        --dry-run=client -o yaml | mk apply -f - >/dev/null 2>&1 || warn "CoreDNS patch failed."
    else
      mk create configmap coredns -n kube-system \
        --from-file=Corefile=/tmp/cdb-mk-Corefile \
        --dry-run=client -o yaml | mk apply -f - >/dev/null 2>&1 || warn "CoreDNS patch failed."
    fi
    mk rollout restart deployment/coredns -n kube-system >/dev/null 2>&1 || true
    rm -f /tmp/cdb-mk-Corefile /tmp/cdb-mk-NodeHosts
    info "CoreDNS rewrite for minio.localhost added."
  else
    info "CoreDNS rewrite for minio.localhost already present (or Corefile unavailable)."
  fi

  # ---- Build + load images -------------------------------------------------
  if [[ "$BUILD_LOCAL_IMAGES" == "true" ]]; then
    for svc in jobs-api data-manager execution-api service-api code-generator \
               ontology-manager sib-manager execution-environment frontend; do
      local src_hash
      src_hash="$(cd "$SCRIPT_DIR/services/$svc" && find app -type f -print | LC_ALL=C sort | xargs shasum -a 256 | shasum -a 256 | awk '{print $1}')"
      mk_load_image "sccecincodebio/$svc:latest" "$SCRIPT_DIR/services/$svc" "CINCODEBIO_SOURCE_HASH=$src_hash"
    done
  fi
  # Base images and the editor base (languages are injected via ConfigMap below).
  mk_load_image "mongo:latest"
  mk_load_image "rabbitmq:3-management"
  mk_load_image "quay.io/minio/minio:latest"
  mk_load_image "quay.io/minio/mc:latest"
  mk_load_image "gcr.io/kaniko-project/executor:latest"
  if docker pull "$EDITOR_IMAGE" >/dev/null 2>&1 || docker image inspect "$EDITOR_IMAGE" >/dev/null 2>&1; then
    docker tag "$EDITOR_IMAGE" cinco-de-bio-editor:latest
    mk_load_image "cinco-de-bio-editor:latest"
  else
    warn "Editor base image unavailable; minikube will pull editor.image at deploy time."
  fi

  # ---- In-cluster registry (kaniko push target) ----------------------------
  info "Deploying in-cluster container registry..."
  mk apply -f "$SCRIPT_DIR/docker/registry.yaml" 2>/dev/null || warn "Registry manifest apply failed."
  mk wait --for=condition=Available deployment/registry -n kube-system --timeout=120s 2>/dev/null \
    || warn "Registry not available yet — continuing."

  # ---- cert-manager --------------------------------------------------------
  info "Installing cert-manager..."
  helm repo add jetstack https://charts.jetstack.io --force-update >/dev/null 2>&1 || true
  helm repo update jetstack >/dev/null 2>&1 || true
  helm --kube-context "$MINIKUBE_PROFILE" install cert-manager jetstack/cert-manager \
    --namespace cert-manager --create-namespace --version v1.17.2 \
    --set crds.enabled=true --wait --timeout=10m 2>/dev/null \
    || warn "cert-manager install reported an issue (may already be installed)."

  # ---- Secrets + editor language bundle ------------------------------------
  info "Creating platform secrets and editor language bundle..."
  mk create secret generic cinco-cloud-main-secrets \
    --from-literal=authPublicKey="local-dev-placeholder-key" -n default 2>/dev/null || true
  local langs_tgz
  langs_tgz="$(mktemp -t cdb-langs.XXXXXX).tgz"
  tar -czf "$langs_tgz" -C "$SCRIPT_DIR/cinco-de-bio-editor/languages" .
  mk create configmap cinco-de-bio-editor-language \
    --from-file=languages.tgz="$langs_tgz" -n default \
    --dry-run=client -o yaml | mk apply -f - >/dev/null
  rm -f "$langs_tgz"

  # ---- Deploy chart --------------------------------------------------------
  # Apply values-local.yaml AND docker/values-docker.yaml (same overrides the k3s
  # entrypoint uses): the latter pins minio to quay.io/minio (bitnami was removed
  # from Docker Hub), sets imagePullPolicy=IfNotPresent so the minikube-loaded
  # images are used, and enables the editor language ConfigMap.
  info "Deploying CincoDeBio Helm chart onto minikube..."
  helm --kube-context "$MINIKUBE_PROFILE" upgrade --install cincodebio "$SCRIPT_DIR/charts/cincodebio/" \
    -n default \
    -f "$SCRIPT_DIR/charts/cincodebio/values-local.yaml" \
    -f "$SCRIPT_DIR/docker/values-docker.yaml" \
    --set-string editor.image="cinco-de-bio-editor:latest" \
    --set editor.imagePullPolicy="IfNotPresent" \
    --set-string global.containers.docker_hub_username="${DOCKER_HUB_USERNAME:-}" \
    --set-string global.containers.docker_hub_password="${DOCKER_HUB_PASSWORD:-}" \
    --timeout 10m \
    || error "Helm install failed."

  # ---- kaniko Docker Hub auth PVC ------------------------------------------
  cat <<PVCEOF | mk apply -f - 2>/dev/null || true
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: kaniko-secret
  namespace: default
spec:
  accessModes: ["ReadWriteOnce"]
  resources:
    requests:
      storage: 10Mi
PVCEOF

  if [[ -n "${DOCKER_HUB_USERNAME:-}" && -n "${DOCKER_HUB_PASSWORD:-}" ]]; then
    info "Populating kaniko Docker Hub auth..."
    local dh_auth_b64
    dh_auth_b64="$(printf '%s:%s' "${DOCKER_HUB_USERNAME}" "${DOCKER_HUB_PASSWORD}" | base64 | tr -d '\n')"
    cat > /tmp/kaniko-writer.yaml <<WREOF
apiVersion: v1
kind: Pod
metadata:
  name: kaniko-auth-writer
  namespace: default
spec:
  restartPolicy: Never
  containers:
  - name: writer
    image: busybox
    command: ["sh", "-c", "printf '{\"auths\":{\"https://index.docker.io/v1/\":{\"auth\":\"%s\"}}}' '${dh_auth_b64}' > /secret/config.json && echo done"]
    volumeMounts:
    - name: kaniko-secret
      mountPath: /secret
  volumes:
  - name: kaniko-secret
    persistentVolumeClaim:
      claimName: kaniko-secret
WREOF
    mk apply -f /tmp/kaniko-writer.yaml 2>/dev/null || true
    mk wait --for=condition=Ready pod/kaniko-auth-writer -n default --timeout=120s 2>/dev/null || true
    sleep 5
    mk delete pod kaniko-auth-writer -n default --force 2>/dev/null || true
    rm -f /tmp/kaniko-writer.yaml
    info "kaniko Docker Hub auth populated."
  else
    warn "Skipping kaniko Docker Hub auth; kaniko will use anonymous pulls."
  fi

  # ---- Wait for core pods --------------------------------------------------
  for app in code-generator data-manager execution-api execution-environment \
             frontend jobs-api minio mongodb ontology-manager rabbitmq sib-manager service-api cinco-de-bio-editor; do
    wait_for_minikube_app "$app" 300s
  done

  # ---- sib-manager startup + service-api image fix + patches ---------------
  info "Waiting for sib-manager startup (kaniko build, ~2-5 min)..."
  local sib_deadline=$((SECONDS + 600))
  while [[ $SECONDS -lt $sib_deadline ]]; do
    if mk logs -l app=sib-manager -n default --tail=20 2>/dev/null | grep -q "Application startup complete"; then
      info "sib-manager startup complete!"; break
    fi
    sleep 10
  done
  local sa_image
  sa_image="$(mk get deployment service-api -n default -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")"
  if echo "$sa_image" | grep -q "registry.kube-system.svc.cluster.local"; then
    info "Patching service-api image reference..."
    mk set image deployment/service-api service-api=localhost:5000/service-api:latest -n default 2>/dev/null || true
  fi

  # ---- Expose the ingress on the host for endpoint validation --------------
  # On the docker driver the cluster IP is not directly routable from the host.
  # `minikube tunnel` would expose it on 127.0.0.1 but needs sudo, so for the
  # automated endpoint check we port-forward the ingress controller (no sudo)
  # and send an explicit Host header so the ingress host rule matches.
  info "Port-forwarding the ingress controller to localhost:${MINIKUBE_INGRESS_PORT:-18080}..."
  local pf_port="${MINIKUBE_INGRESS_PORT:-18080}"
  mk port-forward -n ingress-nginx svc/ingress-nginx-controller "${pf_port}:80" \
    >/tmp/cincodebio-mk-portforward.log 2>&1 &
  MINIKUBE_TUNNEL_PID=$!
  sleep 6

  # ---- Validate endpoints --------------------------------------------------
  info "Validating endpoints via the minikube ingress..."
  local ok=0 total=0
  for path in "/app/" "/editor/" "/execution-api/ext/get-workflows" "/sib-manager/health"; do
    total=$((total + 1))
    local code
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 8 -H 'Host: localhost' "http://localhost:${pf_port}${path}" 2>/dev/null || echo 000)"
    if [[ "$code" =~ ^(200|301|302|401)$ ]]; then
      info "  OK  ${path} -> HTTP $code"; ok=$((ok + 1))
    else
      warn "  --  ${path} -> HTTP $code"
    fi
  done
  cleanup_minikube_tunnel

  echo ""
  info "============================================"
  info " CincoDeBio (minikube) deployment complete! ($ok/$total endpoints reachable)"
  info "============================================"
  warn "----------------------------------------------------------------------------"
  warn " FULL BROWSER ACCESS REQUIRES sudo."
  warn " The cinco-de-bio editor builds model-element image URLs and the workflow-result"
  warn " URL from the browser hostname WITHOUT the port, so they only resolve when"
  warn " the cluster is reachable on localhost:80. On the docker driver that needs a"
  warn " privileged tunnel:"
  warn ""
  warn "     sudo minikube -p $MINIKUBE_PROFILE tunnel"
  warn ""
  warn " then browse  http://localhost/app/  and  http://localhost/editor/  (like k3s)."
  warn " Model-element images AND workflow results only render through the tunnel."
  warn " No sudo? Use the k3s variant instead:  bash install_k3s.sh"
  warn "----------------------------------------------------------------------------"
  info " Inspect:   minikube -p $MINIKUBE_PROFILE kubectl -- get pods"
  info " Stop:      minikube -p $MINIKUBE_PROFILE delete"
  info " Uninstall: bash uninstall_minikube.sh"
}

trap cleanup_log_stream EXIT
trap cleanup_minikube_tunnel EXIT

if [[ "$RUNTIME" == "minikube" ]]; then
  info "Checking Docker prerequisite (minikube docker driver)..."
  check_tool docker
  check_docker_daemon 90 || error "Docker is not running or did not answer within 90s."
  info "Docker daemon is responding."
  deploy_minikube
  exit 0
fi

info "Checking Docker prerequisite..."
check_tool docker
check_docker_daemon 90 || error "Docker is not running or did not answer within 90s. Restart Docker Desktop and rerun this installer."
info "Docker daemon is responding."

info "Building CincoDeBio all-in-one k3s image '$IMAGE_NAME'..."
docker build -f "$SCRIPT_DIR/docker/Dockerfile" -t "$IMAGE_NAME" "$SCRIPT_DIR"

prepare_k3s_image_preload

remove_existing_container

docker_args=(
  -d
  --privileged
  --cgroupns=host
  --name "$CONTAINER_NAME"
  -p 80:80
  -p 5007:5007
  -v "$IMAGE_PRELOAD_DIR:/var/lib/rancher/k3s/agent/images:ro"
)

if [[ -n "${DOCKER_HUB_USERNAME:-}" && -n "${DOCKER_HUB_PASSWORD:-}" ]]; then
  info "Docker Hub credentials detected; authenticated pulls are enabled."
  docker_args+=(
    -e "DOCKER_HUB_USERNAME=$DOCKER_HUB_USERNAME"
    -e "DOCKER_HUB_PASSWORD=$DOCKER_HUB_PASSWORD"
  )
else
  warn "Docker Hub credentials not provided; using anonymous pulls."
fi

info "Starting CincoDeBio k3s container '$CONTAINER_NAME'..."
docker run "${docker_args[@]}" "$IMAGE_NAME" >/dev/null

info "Streaming startup logs while waiting for Kubernetes and service readiness..."
start_startup_log_stream
wait_for_k8s_api

wait_for_app code-generator
wait_for_app data-manager
wait_for_app execution-api
wait_for_app execution-environment
wait_for_app frontend
wait_for_app jobs-api
wait_for_app minio
wait_for_app mongodb
wait_for_app ontology-manager
wait_for_app rabbitmq
wait_for_app sib-manager
wait_for_app service-api
wait_for_app cinco-de-bio-editor 900s

wait_for_container_http "frontend" "http://localhost/app/"
wait_for_container_http "Theia editor" "http://localhost/editor/"

echo ""
info "============================================"
info " CincoDeBio deployment complete!"
info "============================================"
info ""
info " Services:"
info "   Frontend:       http://localhost/app/"
info "   Editor:         http://localhost/editor/"
info "   Editor GLSP:    ws://localhost:5007/cinco-diagram"
info "   Minio Console:  http://localhost/minio-console/"
info ""
info " Inspect cluster:"
info "   docker exec $CONTAINER_NAME kubectl get pods"
info ""
info " Stop:"
info "   docker stop $CONTAINER_NAME && docker rm $CONTAINER_NAME"