# Base image for DAO-ML Editor => cinco editor:fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62
ARG BASE_IMAGE=registry.gitlab.com/scce/cinco-projects/cinco-editor/cinco-editor:latest #fix-docker-build-run-18d5a43276527ff2b3788bb98f280f740c29ed62@sha256:3a7ab800ebe4734401be8d204c341b79c72a73746fb45da69b829ea80b1eeafc
FROM ${BASE_IMAGE}

RUN apt-get update \
      && apt-get install -y --no-install-recommends procps \
      && rm -rf /var/lib/apt/lists/*

# Image metadata
LABEL name="Cinco-de-Bio-Editor" \
      version="1.0" \
      maintainer="Cinco de Bio Team"
LABEL description="Cinco de Bio Editor based on Cinco Cloud"

# Build minio-client (required for the editor to run) - This is a workaround until the base image is fixed to include the built minio-client
RUN cd /editor/minio-client && yarn build && cd /editor

# Install and load the Cinco de Bio workspace/language templates from the standard Cinco workspace language path.
# The editor resolves META_LANGUAGES_FOLDER ("workspace/languages") relative to /editor, so the
# language definitions must be baked into /editor/workspace/languages (matching the in-cluster
# init-container layout in charts/cincodebio/templates/editor.yaml).
ENV META_LANGUAGES_FOLDER="workspace/languages" \
      CINCODEBIO_WORKSPACE="/editor/workspace" \
      CINCODEBIO_LANGUAGES="/editor/workspace/languages"
RUN find /editor/workspace -mindepth 1 -maxdepth 1 -exec rm -rf {} + \
      && mkdir -p /editor/workspace/languages
COPY workspace ${CINCODEBIO_WORKSPACE}
COPY languages ${CINCODEBIO_LANGUAGES}
COPY start-editor.sh /editor/start-editor.sh
RUN chmod +x /editor/start-editor.sh

# Declare the workspace folder as a volume mount point
VOLUME /editor/workspace

# Expose necessary ports
EXPOSE 3000 3003 5007

CMD ["/editor/start-editor.sh"]
