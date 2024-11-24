import os
from pathlib import Path
# to be populated - do I want a seperate namespace for jobs?
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY')
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY')
MINIO_WORKFLOW_BUCKET = os.environ.get('MINIO_WORKFLOW_BUCKET')
MINIO_EXPERIMENT_BUCKET = os.environ.get('MINIO_EXPERIMENT_BUCKET')

# Create the FQDN for the minio and jobs-api services (so dps running in different namespace can access them)
MINIO_FQDN = f'{os.environ.get("MINIO_SERVICE_HOSTNAME")}.{os.environ.get("CINCO_DE_BIO_NAMESPACE")}.svc.cluster.local'

JMS_ADDRESS = f"{os.getenv('JOBS_API_SERVICE_HOST')}:{os.getenv('JOBS_API_SERVICE_PORT')}"
# Need to make sure that the Environment variable is set for the namespace
MINIO_SERVICE_PORT = os.environ.get('MINIO_SERVICE_PORT')
MINIO_SERVICE_PORT_MINIO_CONSOLE = os.environ.get('MINIO_SERVICE_PORT_MINIO_CONSOLE')

MINIO_PRESIGNED_EXTERNAL_PATH = 'minio-presigned'

# Get Ingress Paths
SIB_MANAGER_API_INGRESS = os.environ.get('SIB_MANAGER_API_INGRESS_PATH')
EXECUTION_API_INGRESS = os.environ.get('EXECUTION_API_INGRESS_PATH')
DATA_MANAGER_API_INGRESS = os.environ.get('DATA_MANAGER_API_INGRESS')

CHUNK_SIZE = 256 * 1024 # 256KB
STREAM_THRESHOLD = 1000 * 1024 * 1024 # 1GB

BASE_DIR = Path(__file__).resolve().parent