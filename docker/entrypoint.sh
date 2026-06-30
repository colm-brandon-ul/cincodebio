#!/bin/sh
# ============================================================================
# CincoDeBio All-in-One Entrypoint
# Starts k3s, deploys infrastructure (registry, ingress, cert-manager),
# then deploys the CincoDeBio Helm chart.
# ============================================================================
set -e

info()  { printf '\033[0;32m[INFO]\033[0m  %s\n' "$*"; }
warn()  { printf '\033[1;33m[WARN]\033[0m  %s\n' "$*"; }
error() { printf '\033[0;31m[ERROR]\033[0m %s\n' "$*"; exit 1; }

# ---- Optional Docker Hub authentication ------------------------------------
# Credentials are useful for avoiding Docker Hub anonymous pull limits, but the
# local all-in-one image should still boot for reviewers who only have Docker.
HAS_DOCKER_HUB_AUTH=false
if [ -n "${DOCKER_HUB_USERNAME:-}" ] && [ -n "${DOCKER_HUB_PASSWORD:-}" ]; then
  HAS_DOCKER_HUB_AUTH=true
  info "Docker Hub credentials detected; authenticated pulls are enabled"
else
  warn "Docker Hub credentials not provided; using anonymous pulls"
fi

# ---- Write registries.yaml --------------------------------------------------
cat > /etc/rancher/k3s/registries.yaml <<REGEOF
mirrors:
  "registry.kube-system.svc.cluster.local":
    endpoint:
      - "http://127.0.0.1:5000"
  "localhost:5000":
    endpoint:
      - "http://127.0.0.1:5000"
  "host.docker.internal:5001":
    endpoint:
      - "http://host.docker.internal:5001"
  "docker.io":
    endpoint:
      - "https://mirror.gcr.io"
      - "https://registry-1.docker.io"
REGEOF

if [ "$HAS_DOCKER_HUB_AUTH" = "true" ]; then
cat >> /etc/rancher/k3s/registries.yaml <<REGEOF
configs:
  "registry-1.docker.io":
    auth:
      username: "${DOCKER_HUB_USERNAME}"
      password: "${DOCKER_HUB_PASSWORD}"
REGEOF
fi

# ---- Prepare cgroups for cgroupv2 (Docker Desktop / modern hosts) -----------
# k3s needs a clean cgroup subtree.  On cgroupv2 hosts the kubepods hierarchy
# must be created before the kubelet starts.
if [ ! -s /etc/machine-id ]; then
  tr -d '-' < /proc/sys/kernel/random/uuid > /etc/machine-id
fi

if [ -f /sys/fs/cgroup/cgroup.controllers ]; then
  info "cgroupv2 detected — preparing cgroup subtree..."
  mkdir -p /sys/fs/cgroup/kubepods
  # Delegate controllers to the kubepods subtree
  cat /sys/fs/cgroup/cgroup.controllers > /sys/fs/cgroup/cgroup.subtree_control 2>/dev/null || true
fi

# ---- Start k3s -------------------------------------------------------------
info "Starting k3s (Kubernetes v1.28)..."
/bin/k3s server \
  --disable=traefik \
  --disable=metrics-server \
  --write-kubeconfig-mode=644 \
  >/var/log/k3s.log 2>&1 &
K3S_PID=$!
info "k3s internal logs are written to /var/log/k3s.log"

export KUBECONFIG=/etc/rancher/k3s/k3s.yaml

info "Waiting for k3s to become ready..."
TRIES=0
until kubectl get nodes 2>/dev/null | grep -q " Ready"; do
  TRIES=$((TRIES + 1))
  [ "$TRIES" -ge 120 ] && error "k3s did not become ready within 4 minutes"
  sleep 2
done
info "k3s is ready"

# k3s also imports /var/lib/rancher/k3s/agent/images asynchronously, but the
# editor image is large enough that Helm can schedule the pod before import has
# finished. Import explicitly before workloads are created.
info "Importing preloaded container images..."
for image_tar in /var/lib/rancher/k3s/agent/images/*.tar; do
  [ -e "$image_tar" ] || continue
  info "  importing $(basename "$image_tar")"
  if ! /bin/ctr -n k8s.io images import "$image_tar" >/tmp/cincodebio-image-import.log 2>&1; then
    warn "  failed to import $(basename "$image_tar"); k3s may pull it later"
    sed 's/^/[WARN]    import: /' /tmp/cincodebio-image-import.log | tail -n 6
  fi
done
info "Preloaded container images imported"

# ---- In-cluster container registry -----------------------------------------
info "Deploying in-cluster container registry..."
kubectl apply -f /opt/cincodebio/registry.yaml
kubectl wait --for=condition=Available deployment/registry \
  -n kube-system --timeout=120s 2>/dev/null || warn "Registry not available yet — continuing"

# ---- nginx-ingress controller ----------------------------------------------
info "Installing nginx-ingress controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx --force-update >/dev/null 2>&1
helm repo update ingress-nginx >/dev/null 2>&1
helm install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx --create-namespace \
  --set controller.hostPort.enabled=true \
  --set controller.service.type=ClusterIP \
  --set controller.allowSnippetAnnotations=true \
  --set controller.config.annotations-risk-level=Critical \
  --set controller.config.ssl-redirect=false \
  --set controller.admissionWebhooks.enabled=false \
  --wait --timeout=15m
info "nginx-ingress ready"
# annotations-risk-level=Critical is required (alongside allowSnippetAnnotations) so the
# minio-presigned-ingress configuration-snippet is accepted; otherwise the controller
# rejects that Ingress and minio.localhost (presigned URLs) returns 404.

# ---- CoreDNS: resolve minio.localhost in-cluster -> ingress -----------------
# Interactive SIBs and the data-manager generate presigned MinIO URLs against
# minio.localhost (the browser-facing host). minio-py performs a bucket-region lookup
# against that host *from inside the cluster* when generating the URL, which fails because
# minio.localhost is otherwise only resolvable on the host. Rewrite it to the ingress
# service so the in-cluster lookup succeeds (the ingress routes minio.localhost -> minio).
info "Adding CoreDNS rewrite for minio.localhost..."
COREFILE=$(kubectl get configmap coredns -n kube-system -o jsonpath='{.data.Corefile}')
if ! printf '%s' "$COREFILE" | grep -q "rewrite name minio.localhost"; then
  NEW_COREFILE=$(printf '%s' "$COREFILE" | sed 's#^\( *\)ready#\1ready\n\1rewrite name minio.localhost ingress-nginx-controller.ingress-nginx.svc.cluster.local#')
  NODEHOSTS=$(kubectl get configmap coredns -n kube-system -o jsonpath='{.data.NodeHosts}')
  printf '%s' "$NEW_COREFILE" > /tmp/Corefile
  printf '%s' "$NODEHOSTS" > /tmp/NodeHosts
  kubectl create configmap coredns -n kube-system \
    --from-file=Corefile=/tmp/Corefile --from-file=NodeHosts=/tmp/NodeHosts \
    --dry-run=client -o yaml | kubectl apply -f - >/dev/null 2>&1 || warn "CoreDNS patch failed"
  kubectl rollout restart deployment/coredns -n kube-system >/dev/null 2>&1 || true
  info "CoreDNS rewrite for minio.localhost added"
else
  info "CoreDNS rewrite for minio.localhost already present"
fi

# ---- cert-manager ----------------------------------------------------------
info "Installing cert-manager v1.17.2..."
helm repo add jetstack https://charts.jetstack.io --force-update >/dev/null 2>&1
helm repo update jetstack >/dev/null 2>&1
helm install cert-manager jetstack/cert-manager \
  --namespace cert-manager --create-namespace \
  --version v1.17.2 \
  --set crds.enabled=true --wait --timeout=10m
info "cert-manager ready"

# ---- Pre-deploy secrets ----------------------------------------------------
info "Creating platform secrets..."
kubectl create secret generic cinco-cloud-main-secrets \
  --from-literal=authPublicKey="local-dev-placeholder-key" \
  -n default 2>/dev/null || true

info "Creating CincoDeBio editor language bundle..."
tar -czf /tmp/cinco-de-bio-editor-languages.tgz -C /opt/cincodebio/editor-languages .
kubectl create configmap cinco-de-bio-editor-language \
  --from-file=languages.tgz=/tmp/cinco-de-bio-editor-languages.tgz \
  -n default --dry-run=client -o yaml | kubectl apply -f - >/dev/null

# ---- Deploy CincoDeBio Helm chart -----------------------------------------
info "Deploying CincoDeBio chart..."
set -- helm install cincodebio /opt/cincodebio/chart/ \
  -n default \
  -f /opt/cincodebio/chart/values-local.yaml \
  -f /opt/cincodebio/values-docker.yaml \
  --set-string global.containers.docker_hub_username="${DOCKER_HUB_USERNAME:-}" \
  --set-string global.containers.docker_hub_password="${DOCKER_HUB_PASSWORD:-}" \
  --timeout 10m
if [ -n "${CINCODEBIO_EDITOR_IMAGE:-}" ]; then
  info "Using editor image override: ${CINCODEBIO_EDITOR_IMAGE}"
  set -- "$@" --set-string editor.image="${CINCODEBIO_EDITOR_IMAGE}"
fi
"$@"
info "Helm chart deployed"

# ---- Populate kaniko Docker-Hub auth PVC -----------------------------------
# The sib-manager creates a PVC called "kaniko-secret" and mounts it at
# /kaniko/.docker inside kaniko build pods.  It is created empty, so kaniko
# pulls are unauthenticated and hit Docker Hub rate limits.  We populate it
# with a config.json containing the DH credentials when provided.
info "Ensuring kaniko Docker Hub auth PVC exists..."
cat <<PVCEOF | kubectl apply -f - 2>/dev/null
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

if [ "$HAS_DOCKER_HUB_AUTH" = "true" ]; then
info "Populating kaniko Docker Hub auth..."
DH_AUTH_B64=$(printf '%s:%s' "${DOCKER_HUB_USERNAME}" "${DOCKER_HUB_PASSWORD}" | base64 | tr -d '\n')

# Write a pod spec to a tmp file (avoids shell quoting issues in heredocs)
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
    command: ["sh", "-c", "printf '{\"auths\":{\"https://index.docker.io/v1/\":{\"auth\":\"%s\"}}}' '${DH_AUTH_B64}' > /secret/config.json && echo done"]
    volumeMounts:
    - name: kaniko-secret
      mountPath: /secret
  volumes:
  - name: kaniko-secret
    persistentVolumeClaim:
      claimName: kaniko-secret
WREOF

kubectl apply -f /tmp/kaniko-writer.yaml 2>/dev/null

# Wait for the writer to finish
kubectl wait --for=condition=Ready pod/kaniko-auth-writer -n default --timeout=120s 2>/dev/null || true
sleep 5
kubectl delete pod kaniko-auth-writer -n default --force 2>/dev/null || true
info "kaniko Docker Hub auth populated"
else
warn "Skipping kaniko Docker Hub auth; kaniko will use anonymous pulls"
fi

# ---- Wait for core pods ----------------------------------------------------
info "Waiting for core services to start..."
for app in code-generator data-manager execution-api execution-environment \
           frontend jobs-api minio mongodb ontology-manager rabbitmq sib-manager service-api cinco-de-bio-editor; do
  kubectl wait --for=condition=Ready pod -l "app=$app" \
    -n default --timeout=300s 2>/dev/null \
    && info "  $app — ready" \
    || warn "  $app — not ready (timeout)"
done

# ---- Wait for sib-manager startup (includes kaniko build) ------------------
info "Waiting for sib-manager startup (kaniko build, ~2-5 min)..."
deadline=$(($(date +%s) + 600))
while true; do
  now=$(date +%s)
  if [ "$now" -ge "$deadline" ]; then
    warn "Timeout waiting for sib-manager startup"
    warn "Debug: docker exec <container> kubectl logs -l app=sib-manager"
    break
  fi
  if kubectl logs -l app=sib-manager -n default --tail=20 2>/dev/null \
       | grep -q "Application startup complete"; then
    info "sib-manager startup complete!"
    break
  fi
  sleep 10
done

# ---- Fix service-api image reference if needed -----------------------------
# kaniko pushes to registry.kube-system.svc.cluster.local but the containerd
# mirror (registries.yaml) should handle it.  If it still fails, patch to
# localhost:5000.
SA_IMAGE=$(kubectl get deployment service-api -n default \
  -o jsonpath='{.spec.template.spec.containers[0].image}' 2>/dev/null || echo "")
if echo "$SA_IMAGE" | grep -q "registry.kube-system.svc.cluster.local"; then
  info "Patching service-api image reference for k3s..."
  kubectl set image deployment/service-api \
    service-api=localhost:5000/service-api:latest -n default 2>/dev/null || true
  kubectl rollout status deployment/service-api \
    -n default --timeout=120s 2>/dev/null || true
fi

# ---- Ready -----------------------------------------------------------------
echo ""
info "============================================"
info " CincoDeBio is ready!"
info "============================================"
info ""
info " Frontend:         http://localhost/app/"
info " Editor:           http://localhost/editor/"
info " Editor GLSP:      ws://localhost:5007/cinco-diagram"
info " Minio Console:    http://localhost/minio-console/"
info ""
info " API paths (via ingress):"
info "   /execution-api/..."
info "   /services-api/..."
info "   /sib-manager/..."
info "   /data-manager/..."
info "   /jobs-api/..."
info ""
info " kubectl:"
info "   docker exec <container> kubectl get pods"
info "   docker exec <container> kubectl logs -l app=sib-manager"
info ""
info " Stop:"
info "   docker stop <container> && docker rm <container>"
info ""

# Keep the container alive — k3s is PID 1's child
wait $K3S_PID
