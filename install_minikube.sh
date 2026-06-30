#!/usr/bin/env bash
# ============================================================================
# Start CincoDeBio — minikube variant (ALTERNATIVE to k3s).
#
# Deploys the same Helm chart onto a local minikube cluster
# (profile "cincodebio-mk", kept distinct from the k3s container name so both
# variants can coexist). Host prerequisites: Docker, minikube, helm.
#
# Usage:
#   bash install_minikube.sh
#   DOCKER_HUB_USERNAME=me DOCKER_HUB_PASSWORD=secret bash install_minikube.sh
#
# The installer starts minikube, enables + configures the ingress addon, builds
# and loads the images, deploys the chart, and validates the endpoints
# (prints "N/4 endpoints reachable").
#
# ┌─ IMPORTANT: full browser access on minikube REQUIRES sudo ───────────────────┐
# │ The Cinco editor builds image/workflow URLs from the browser hostname WITHOUT │
# │ the port, so they only resolve when the cluster is reachable on localhost:80. │
# │ On the docker driver that needs a privileged tunnel:                          │
# │                                                                              │
# │     sudo minikube -p cincodebio-mk tunnel                                     │
# │                                                                              │
# │ then browse http://localhost/app/ and http://localhost/editor/ (just like     │
# │ k3s). Model-element images AND workflow results only render through the tunnel.│
# │ If you cannot use sudo, use the k3s variant instead: bash install_k3s.sh      │
# └──────────────────────────────────────────────────────────────────────────────┘
#
# (A no-sudo port-forward on :18080 is used only for the installer's automated
#  endpoint reachability check; it cannot serve the port-less editor URLs.)
#
# Inspect:   minikube -p cincodebio-mk kubectl -- get pods
# Stop:      minikube -p cincodebio-mk delete
# Uninstall: bash uninstall_minikube.sh
# ============================================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
echo "[WARN] minikube: full browser access (images + workflow results) needs 'sudo minikube -p cincodebio-mk tunnel'." >&2
echo "[WARN] No sudo? Use the k3s variant instead: bash install_k3s.sh" >&2
CINCODEBIO_RUNTIME=minikube \
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sccecellmaps}" \
DOCKER_HUB_PASSWORD="${DOCKER_HUB_PASSWORD:-University_of_Limerick@2024}" \
bash install.sh 2>&1
