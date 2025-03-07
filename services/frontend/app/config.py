import os
from pathlib import Path

# service environment variables
# Get Ingress Paths
BASE_DIR = Path(__file__).resolve().parent
EXECUTION_API_INGRESS_PATH = os.environ.get('EXECUTION_API_INGRESS_PATH')
DATA_MANAGER_API_INGRESS = os.environ.get('DATA_MANAGER_API_INGRESS')
SIB_MANAGER_API_INGRESS = os.environ.get('SIB_MANAGER_API_INGRESS_PATH')
SIB_MANAGER_SERVICE_HOST = os.environ.get('SIB_MANAGER_SERVICE_HOST')
SIB_MANAGER_SERVICE_PORT = os.environ.get('SIB_MANAGER_SERVICE_PORT')
ONTOLOGY_MANAGER_SERVICE_HOST = os.environ.get('ONTOLOGY_MANAGER_SERVICE_HOST')
ONTOLOGY_MANAGER_SERVICE_PORT = os.environ.get('ONTOLOGY_MANAGER_SERVICE_PORT')
AUTH_PUBLIC_KEY = os.environ.get('AUTH_PUBLIC_KEY')
