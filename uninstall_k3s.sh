#!/usr/bin/env bash
# ============================================================================
# Uninstall CincoDeBio — k3s all-in-one variant.
#
# Stops and removes the privileged Docker container that runs the embedded k3s
# cluster. Optionally also removes the all-in-one image with --rmi.
#
# Usage:
#   bash uninstall_k3s.sh            # stop + remove the container
#   bash uninstall_k3s.sh --rmi      # also remove the cincodebio-aio image
# ============================================================================
set -euo pipefail

CONTAINER_NAME="${CINCODEBIO_CONTAINER_NAME:-cincodebio}"
IMAGE_NAME="${CINCODEBIO_IMAGE_NAME:-cincodebio-aio}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }

if ! command -v docker >/dev/null 2>&1; then
  warn "docker not found; nothing to uninstall."
  exit 0
fi

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  info "Stopping and removing container '$CONTAINER_NAME'..."
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || warn "Could not remove '$CONTAINER_NAME'."
  info "Container '$CONTAINER_NAME' removed."
else
  info "No container named '$CONTAINER_NAME' found."
fi

if [[ "${1:-}" == "--rmi" ]]; then
  if docker image inspect "$IMAGE_NAME" >/dev/null 2>&1; then
    info "Removing image '$IMAGE_NAME'..."
    docker rmi "$IMAGE_NAME" >/dev/null 2>&1 || warn "Could not remove image '$IMAGE_NAME'."
  else
    info "No image named '$IMAGE_NAME' found."
  fi
fi

info "k3s uninstall complete."
