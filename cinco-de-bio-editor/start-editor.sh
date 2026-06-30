#!/usr/bin/env bash
set -euo pipefail

# Minio client is not needed for the cinco-de-bio-editor: Disabled
# cd /editor/minio-client
# node bundle/cinco-minio-client.js --metaFolder ../cinco-glsp-server/languages

WORKSPACE_ROOT="${WORKSPACE_PATH:-/editor/workspace}"

cd /editor/browser-app
exec yarn run theia start \
  --port=3000 \
  --CINCO_GLSP=5007 \
  -WEB_SERVER_PORT=3003 \
  --remote-debugging-port=9222 \
  --no-cluster \
  --loglevel=debug \
  --root-dir="${WORKSPACE_ROOT}" \
  --plugins=local-dir:./plugins \
  --hostname 0.0.0.0 \
  --META_DEV_MODE \
  --META_LANGUAGES_FOLDER="${META_LANGUAGES_FOLDER}" \
  --CLIENT_PATH="/editor/cinco-glsp-standalone/app/diagram.html" \
  --META_DEBUG_PORT 9222 \
  "${WORKSPACE_ROOT}"