# Cinco De Bio Core Repository

## Try

You can easily try out Cinco De Bio. Choose one of the deployment options below:

## Docker Only (Recommended for Development & Testing)

### Prerequisites

1. **Docker** — Install [Docker Desktop](https://www.docker.com/products/docker-desktop) (Mac, Windows with WSL2, or Linux)
2. **Docker Hub Account** — Create a free account at [hub.docker.com](https://hub.docker.com) (needed to avoid Docker pull rate limits)

### Installation

CincoDeBio runs as a single all-in-one Docker container with an embedded k3s Kubernetes cluster:

```bash
docker run -d --privileged --cgroupns=host --name cincodebio \
  -p 80:80 \
  -p 5007:5007 \
  -e DOCKER_HUB_USERNAME=<docker-hub-username> \
  -e DOCKER_HUB_PASSWORD=<docker-hub-password> \
  cincodebio-aio
```

If anonymous image pulls are rate-limited, add `-e DOCKER_HUB_USERNAME=<docker-hub-username>` and `-e DOCKER_HUB_PASSWORD=<docker-hub-password>` to the `docker run` command.

Or build from source:

```bash
cd cincodebio/
docker build -f docker/Dockerfile -t cincodebio-aio .

docker run -d --privileged --cgroupns=host --name cincodebio \
  -p 80:80 \
  -p 5007:5007 \
  -e DOCKER_HUB_USERNAME=<docker-hub-username> \
  -e DOCKER_HUB_PASSWORD=<docker-hub-password> \
  cincodebio-aio
```

### First-Time Setup

The first startup takes ~5-10 minutes (k3s initialization + pod deployment + kaniko SIB build):

```bash
# Monitor startup progress
docker logs cincodebio --follow

# Once you see "CincoDeBio is ready!" the system is running
```

### Access CincoDeBio

- **Frontend:** [http://localhost/app/](http://localhost/app/)
- **CincoDeBio Editor:** [http://localhost/editor/](http://localhost/editor/)
- **CincoDeBio Editor's GLSP WebSocket:** [ws://localhost:5007/cinco-diagram](ws://localhost:5007/cinco-diagram)
- **Minio Console:** [http://localhost/minio-console/](http://localhost/minio-console/) (admin / mypassword)

### Verify Installation

```bash
# Check all pods are running
docker exec cincodebio kubectl get pods

# View sib-manager logs
docker exec cincodebio kubectl logs -l app=sib-manager

# Stop the container
docker stop cincodebio && docker rm cincodebio
```

### End-to-end demo / verification tests (with video)

Playwright tests drive the editor against a running platform and record `.webm`
videos to `artifacts/playwright/`. Against the **k3s** deployment (native
`localhost`):

```bash
# Peer-reviewer journey: build a TMA workflow ENTIRELY via the palette
# (drop SIBs onto the canvas, wire control-flow + data-flow edges), then
# generate, execute, and inspect the result.  -> final-gui-journey-k3s.webm
npm run test:final-gui-journey

# Faster seeded demo: open editor -> refresh SIB library -> open workflow ->
# generate/execute -> result.                  -> final-full-demo-k3s.webm
npm run test:final-full-demo

# Just the generate/execute flow (editor -> execution-api submit ->
# MiniBrowser opens the workflow URL).         -> final-workflow-generation.webm
npm run test:final-workflow-generation
```

Against **minikube**, start the privileged tunnel first so the cluster is reachable
on `localhost:80` (identical access model to k3s — see the Minikube access section
below), then set the URLs and kubectl command:

```bash
sudo minikube -p cincodebio-mk tunnel &        # serves http://localhost/...

CINCODEBIO_RUNTIME_LABEL=minikube \
CINCODEBIO_EDITOR_URL=http://localhost/editor/ \
CINCODEBIO_APP_URL=http://localhost/app \
CINCODEBIO_EXECUTION_API_URL=http://localhost/execution-api/ext \
CINCODEBIO_KUBECTL_COMMAND='minikube -p cincodebio-mk kubectl --' \
npm run test:final-gui-journey
```

## Installer script

`install.sh` automates either runtime via the `CINCODEBIO_RUNTIME` switch (and
this folder provides `install_k3s.sh` / `install_minikube.sh` wrappers, plus
`uninstall_k3s.sh` / `uninstall_minikube.sh`):

```bash
# k3s all-in-one container (default)
DOCKER_HUB_USERNAME=<user> DOCKER_HUB_PASSWORD=<pass> bash install.sh

# minikube (alternative)
CINCODEBIO_RUNTIME=minikube DOCKER_HUB_USERNAME=<user> DOCKER_HUB_PASSWORD=<pass> bash install.sh
```

The k3s path builds the all-in-one image and runs the container; the minikube
path starts minikube, configures the ingress addon, loads images, deploys the
Helm chart, and prints an endpoint-validation summary. Both wait for the
platform to be ready.

## Minikube (Alternative)

### Prerequisites (minikube)

1. **Docker** — Install [Docker Desktop](https://www.docker.com/products/docker-desktop)
2. **Minikube** — Install [minikube](https://minikube.sigs.k8s.io/)
3. **Helm** — Install [Helm](https://helm.sh/) (kubectl is bundled via `minikube kubectl`)
4. **Docker Hub Account** — Create a free account at [hub.docker.com](https://hub.docker.com)

### Installation (minikube)

```bash
cd cincodebio/
CINCODEBIO_RUNTIME=minikube \
DOCKER_HUB_USERNAME=<docker-hub-username> \
DOCKER_HUB_PASSWORD=<docker-hub-password> \
bash install.sh 2>&1
```

The installer starts minikube (profile `cincodebio-mk` — distinct from the k3s
container name so both can coexist), enables the ingress addon (with snippet
annotations + ssl-redirect disabled, matching k3s), loads the service/base/editor
images, deploys the chart with `values-local.yaml` + `values-docker.yaml`, and
validates `/app/`, `/editor/`, `/execution-api/ext/get-workflows`, `/sib-manager/health`.

### Access CincoDeBio (minikube)

> ⚠️ **Full browser access needs `sudo`.** The Cinco editor builds model-element
> image URLs and the workflow-result URL from the browser hostname **without the
> port**, so they only resolve when the cluster is reachable on `localhost:80`.
> On the docker driver that requires a privileged tunnel:

```bash
sudo minikube -p cincodebio-mk tunnel        # serves http://localhost/...
# then browse — identical to k3s:
curl http://localhost/app/        # frontend
curl http://localhost/editor/     # editor
```

A no-sudo port-forward still works for raw API checks but **cannot** serve the
port-less editor URLs (model-element images and workflow results will be broken):

```bash
minikube -p cincodebio-mk kubectl -- -n ingress-nginx \
  port-forward svc/ingress-nginx-controller 18080:80 &
curl -H 'Host: localhost' http://localhost:18080/app/
```

**If you cannot use `sudo`, use the k3s variant instead** (`bash install_k3s.sh`).
Stop with `minikube -p cincodebio-mk delete` (or `bash uninstall_minikube.sh`).

## Architecture Overview

CincoDeBio is a cloud-native application designed for bioinformatics workflow management. It leverages a microservices architecture, orchestrated through Kubernetes, and employs several key components and technologies to ensure scalability, reliability, and flexibility.

### Code Generator

The code generator is pretty simple. It takes the workflow model (currently in Gratext, but soon to be updated to a JSON syntax), parses it and generates a python program which orchestrates the workflow, to do this it pulls in some additional metadata from the sib-manager (that is not currently stored in the SIB models directly). Once it generated the workflow program it dispatches it to the execution environemnt and notifies the execution API of the updated status.

*Interfaces with: Sib-Manager, Rabbit MQ, Execution API, Execution Environment*

### Data Manager

The data manager is the client facing frontend for uploading experiment data to the object storage / downloading the workflow results (or the intermediate results for a workflow step). As the S3 API for object storage doesn't enable a prefix to be download as a zip file the data-manager using the minio-frontend api and streams it to the client.

Interfaces with: Minio, Jobs API

### Execution API

The execution API interfaces with the IME to receive the workflow models and dispatch them via RabbitMQ to the codegerator. It then handles call backs from the jobs API, which it subsequently informs the execution environment that a job has been completed and the results can be retrieved from the service API. This is done via log files stored in a mounted volume between the execution api container (write only permissions) & the execution environment (read only permission).

It also manages the websocket connection for the execution front-end client which keeps the user updated about the workflow status.

*Interfaces with: Cinco De Bio Integrated Modelling Environment (Cinco Cloud Product), MongoDB, RabbtiMQ*

*Tightly Coupled with: Execution Environment*

### Execution Environment

The Execution Environment is an application designed to receive and execute code for workflows. It receives code generated for workflows, executes it in a controlled environment, and manages the lifecycle of these processes. It provides endpoints for creating, monitoring, and terminating processes, as well as handling job callbacks.

Key features:

- Creates and manages processes from provided code
- Monitors process status
- Handles process termination
- Processes job callbacks

Interfaces with: Services API

### Frontend

This service acts as a central frontend and integration layer for managing workflows, data, and system components. It handles user authentication, renders dynamic web pages using Jinja2 templates, and routes requests to backend microservices. It also supports real-time health checks and workflow updates via WebSocket connections. Interfaces with: Execution API, Data Manager, SIB Manager

*Interfaces with: Execution API, Data Manager, SIB Manager, Ontology Manager*

### Jobs API

The Jobs API manages the lifecycle of a single data processing step and the data processing services interface with it to update it of the jobs status and to write the results or the front-end data to the database when the dataprocessing is complete.

*Interfaces with: MongoDB, Execution API*

### Ontology Manager

...

### Service API

The services API is where the workflow execution program(s) send data processing jobs to and subsequently retrieves the results from. In the case of interactive SIBs it also serves the client with the SIBs front-end and handles the clients requests. It interfaces with the K8s jobs api to configure and schedule the dataprocessing results. It also retrieves the results of a data processing job from the jobs API.

*Interfaces with: Kubernetes API, Jobs API*

### Sib Manager

The sib manager scans the external container repositories from registry providers (currently only dockerhub is supported) and pulls in all the SIBs which are compatible with the compute. It then generates the SIB models which are used in the IME for modelling workflow. It handles the installation and removal of SIBs. It also handles the rebuilding of the services API container based on the set of SIBs the user wishes to have available.

*Interfaces with: Cinco De Bio Integrated Modelling Environment (Cinco Cloud Product), Kaniko, Kubernetes API*

### Container Registry

As the service API is rebuilt based on the set of available SIBs, the application contains an internal container registry for storing the latest version of the service API image.

*Interface with:* Kubernetes

### Kaniko

Kaniko is use to rebuild the service api docker image inside the cluster.

*Interface with:* *Container Registry*

### Minio

The object storage for the system. It stores the data generated by the data processing services, this faciliates pass the data from one step of the workflow to the next and also for retrieiving results the workflow is complete.

Inter

### Rabbit MQ

The only service it currently servers is queueing workflow generation tasks, but I can envision its use being extending to other functions in the future.

Interfaces with: Execution API, Code Generator.

### Kubernetes

Cinco de bio is built as a kubernetes native application and it leverages the k8s Jobs API extensively to schedule data processing jobs. Currently all SIBs are implemented as containers, but with-in time we will include additional runtimes for more efficient execution of SIBs which are more lightweight and have simpler dependencies.

## On the Agenda

- Refactor Frontend:
  Currently each service that has a client facing front end serves it from directly. I will soon refactor this to a single frotend service that the client interfaces with, that then interfaces with the various services as needed. The current structure is as a result as components being tacked on as their need became evident, but is quite clunky and unwei

## Technologies Used

- **Programming Languages:** Python
- **Frameworks:** FastAPI, Jinja2
- **Databases:** MongoDB
- **Messaging:** RabbitMQ
- **Cloud Storage:** MinIO
- **Containerization:** Docker
- **Container Registry:** Kaniko
- **Orchestration:** Kubernetes
- **Package Management:** Helm
- **Version Control:** Git

This comprehensive architecture description provides an overview of the various services and technologies used in the CincoDeBio application.
