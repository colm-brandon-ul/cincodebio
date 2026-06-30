#!/usr/bin/env bash
# ============================================================================
# Uninstall CincoDeBio — minikube variant.
#
# Kills any leftover tunnel / port-forward for the profile, then deletes the
# minikube profile (cluster + its Docker container).
#
# Usage:
#   bash uninstall_minikube.sh
# ============================================================================
set -euo pipefail

MINIKUBE_PROFILE="${CINCODEBIO_MINIKUBE_PROFILE:-cincodebio-mk}"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
info() { echo -e "${GREEN}[INFO]${NC}  $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC}  $*"; }

# Best-effort: stop any tunnel / port-forward processes for this profile.
info "Stopping any tunnel / port-forward processes for '$MINIKUBE_PROFILE'..."
pkill -f "minikube.*${MINIKUBE_PROFILE}.*tunnel" 2>/dev/null || true
pkill -f "port-forward svc/ingress-nginx-controller" 2>/dev/null || true

if ! command -v minikube >/dev/null 2>&1; then
  warn "minikube not found; nothing to delete."
  exit 0
fi

if minikube --profile "$MINIKUBE_PROFILE" status >/dev/null 2>&1 \
   || minikube profile list 2>/dev/null | grep -q "$MINIKUBE_PROFILE"; then
  info "Deleting minikube profile '$MINIKUBE_PROFILE'..."
  minikube --profile "$MINIKUBE_PROFILE" delete || warn "minikube delete reported an issue."
  info "Profile '$MINIKUBE_PROFILE' deleted."
else
  info "No minikube profile named '$MINIKUBE_PROFILE' found."
fi

info "minikube uninstall complete."
