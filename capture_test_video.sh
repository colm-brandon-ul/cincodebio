#!/usr/bin/env bash
# ============================================================================
# Capture a CincoDeBio Playwright video test.
#
# Runs one of the recording npm scripts (see package.json) and writes the
# resulting .webm into artifacts/playwright/. Requires a running platform
# (bash install_k3s.sh, or bash install_minikube.sh + the tunnel).
#
# Usage:
#   bash capture_test_video.sh                         # default: full GUI journey
#   bash capture_test_video.sh test:final-full-demo    # any test:* npm script
#   bash capture_test_video.sh test:final-minikube-video
# ============================================================================
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

TEST_SCRIPT="${1:-test:final-gui-journey}"
echo "[INFO] Running npm run ${TEST_SCRIPT} (videos -> artifacts/playwright/)"
npm run "${TEST_SCRIPT}"
