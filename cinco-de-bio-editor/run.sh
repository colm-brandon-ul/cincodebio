#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
IMAGE_NAME="${CINCO_EDITOR_IMAGE:-cinco-de-bio-editor:latest}"
CONTAINER_NAME="${CINCO_EDITOR_CONTAINER:-cinco-de-bio-editor}"
CINCODEBIO_API_BASE_URL="${CINCODEBIO_API_BASE_URL:-http://host.docker.internal}"

mkdir -p "$SCRIPT_DIR/workspace"

TTY_ARGS=()
if [ -t 0 ]; then
  TTY_ARGS=(-it)
fi

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
docker run --rm "${TTY_ARGS[@]}" \
  --name "$CONTAINER_NAME" \
  --env-file "$SCRIPT_DIR/env.list" \
  -e CINCODEBIO_API_BASE_URL="$CINCODEBIO_API_BASE_URL" \
  -p 3000:3000 \
  -p 3003:3003 \
  -p 5007:5007 \
  -v "$SCRIPT_DIR/workspace:/editor/workspace" \
  -v "$SCRIPT_DIR/languages:/editor/workspace/languages" \
  "$IMAGE_NAME"