import jinja2
import os
import pathlib

# K8S ENVIRONMENT VARIABLES (used in app)
#     - CONTAINER_REGISTRY_DOMAIN_ON_HOST
#     - DOCKER_BUILD_CONTEXT_VOLUME
#     - DOCKER_BUILD_CONTEXT_MOUNT_PATH
#     - DOCKER_HUB_NAMESPACE
#     - KANIKO_IMAGE
#     - KANIKO_BUILD_NAMESPACE
#     - REGISTRY_NAME
#     - REGISTRY_NAMESPACE
#     - REGISTRY_PORT
#     - SERVICE_API_SERVICE_HOST
#     - SERVICE_API_SERVICE_PORT
#     - SERVICE_API_NAME (for rolling update submission)
#     - SIB_MANAGER_API_INGRESS_PATH

# Get Ingress Paths
BASE_DIR = pathlib.Path(__file__).resolve().parent
EXECUTION_INGRESS_PATH = os.environ.get('EXECUTION_API_INGRESS_PATH')
DATA_MANAGER_API_INGRESS = os.environ.get('DATA_MANAGER_API_INGRESS')
SIB_MANAGER_API_INGRESS = os.environ.get('SIB_MANAGER_API_INGRESS_PATH')
SERVICE_API_NAME = os.getenv('SERVICE_API_NAME')
SERVICE_API_SERVICE_HOST = os.getenv('SERVICE_API_SERVICE_HOST')
SERVICE_API_SERVICE_PORT = os.getenv('SERVICE_API_SERVICE_PORT')
REGISTRY_NAME = os.getenv('REGISTRY_NAME')
REGISTRY_NAMESPACE = os.getenv('REGISTRY_NAMESPACE')
REGISTRY_PORT = os.getenv('REGISTRY_PORT')
DOCKER_HUB_NAMESPACE = os.getenv('DOCKER_HUB_NAMESPACE')
# Do I want to use env vars for this?
KANIKO_DOCKER_HUB_AUTH_VOLUME = "kaniko-secret"
DOCKER_BUILD_CONTEXT_VOLUME = os.getenv('DOCKER_BUILD_CONTEXT_VOLUME')
DOCKER_BUILD_CONTEXT_MOUNT_PATH = os.getenv('DOCKER_BUILD_CONTEXT_MOUNT_PATH')
# Container Registry details - do I want to use env vars for this?
REGISTRY_NAME = os.getenv('REGISTRY_NAME')
REGISTRY_NAMESPACE = os.getenv('REGISTRY_NAMESPACE')
REGISTRY_PORT = os.getenv('REGISTRY_PORT')
# This should be an env var 
CONTAINER_REGISTRY_DOMAIN_ON_HOST = os.getenv('CONTAINER_REGISTRY_DOMAIN_ON_HOST')
# Kaniko image (maybe an env var)
KANIKO_IMAGE = os.getenv('KANIKO_IMAGE')
# This should be an env var
KANIKO_BUILD_NAMESPACE = os.getenv('KANIKO_BUILD_NAMESPACE')
# Ontology Manager..
ONTOLOGY_MANAGER_SERVICE_HOST = os.environ.get('ONTOLOGY_MANAGER_SERVICE_HOST')
ONTOLOGY_MANAGER_SERVICE_PORT = os.environ.get('ONTOLOGY_MANAGER_SERVICE_PORT')

TEMPLATE_DIR = "./src/templates/"
STATIC_DIR = "./src/static/"
STATIC_CODE_DIR = "./src/static-code/"
PERSISTENT_STATE_MOUNT_PATH = "/sib-manager-state"

LATEST_SIBS = "latest_sibs.json"
OTHER_SIBS = "other_sibs.json"
INSTALLED_SIBS = "installed_sibs.json"

CURRENT_SIBS_IME_JSON = "current_ime_sibs.json"
UTD_SIB_FILE = "lib.sibs"
UTD_SIB_FILE_V2 = "cclib.sibs"
SIB_MAP_FILE = "sib_map.json"

# Common constants
DH_ENDPOINT = "hub.docker.com"
DH_AUTH_ENDPOINT = "auth.docker.io"
DH_API_ENDPOINT = "registry-1.docker.io"


JINJA_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR), 
    extensions=['jinja2_strcase.StrcaseExtension'])

DOCKER_HUB_PASSWORD = os.environ.get('DOCKER_HUB_PASSWORD')
DOCKER_HUB_USERNAME = os.environ.get('DOCKER_HUB_USERNAME')

MAX_WORKERS = 10