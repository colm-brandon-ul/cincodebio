#!/usr/bin/env bash
# ============================================================================
# Start CincoDeBio — k3s all-in-one variant (DEFAULT, recommended).
#
# Runs the whole platform as a single privileged Docker container with an
# embedded k3s Kubernetes cluster. Host prerequisite: Docker only.
#
# Usage:
#   bash install_k3s.sh
#   # optionally override the Docker Hub credentials used for authenticated pulls:
#   DOCKER_HUB_USERNAME=me DOCKER_HUB_PASSWORD=secret bash install_k3s.sh
#
# First start takes ~6-10 min (k3s + pods + the sib-manager kaniko build).
# When you see "CincoDeBio is ready!" the platform is up at:
#   Frontend:  http://localhost/app/
#   Editor:    http://localhost/editor/
#   GLSP:      ws://localhost:5007/cinco-diagram
#
# Stop:      docker stop cincodebio && docker rm cincodebio
# Uninstall: bash uninstall_k3s.sh
# ============================================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
CINCODEBIO_RUNTIME=k3s \
DOCKER_HUB_USERNAME="${DOCKER_HUB_USERNAME:-sccecellmaps}" \
DOCKER_HUB_PASSWORD="${DOCKER_HUB_PASSWORD:-University_of_Limerick@2024}" \
bash install.sh 2>&1
