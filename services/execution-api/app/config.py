import os
from pathlib import Path
from pika.exchange_type import ExchangeType

MONGODB_HOST = os.environ.get("MONGODB_SERVICE_HOST")
MONGODB_PORT = os.environ.get("MONGODB_SERVICE_PORT")
WORKFLOW_DB = os.environ.get("WORKFLOW_DB")
WORKFLOW_COLLECTION = os.environ.get("WORKFLOW_COLLECTION")

EXCHANGE_NAME = os.environ.get('CODE_GENERATOR_EXCHANGE_NAME')
EXCHANGE_TYPE = ExchangeType.direct
ROUTING_KEY = os.environ.get('CODE_GENERATOR_ROUTING_KEY')
RABBIT_MQ_HOST = os.environ.get('RABBITMQ_SERVICE_HOST')
RABBIT_MQ_PORT = int(os.environ.get('RABBITMQ_SERVICE_PORT'))
RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD')


BASE_DIR = Path(__file__).resolve().parent

WORKFLOW_LOG_PATH = os.environ.get('WORKFLOW_LOGS_PATH')
# Get Ingress Paths
EXECUTION_INGRESS_PATH = os.environ.get('EXECUTION_API_INGRESS_PATH')
SERVICES_INGRESS_PATH = os.environ.get('SERVICES_API_INGRESS_PATH')
SIB_MANAGER_INGRESS_PATH = os.environ.get('SIB_MANAGER_API_INGRESS_PATH')
DATA_MANAGER_API_INGRESS = os.environ.get('DATA_MANAGER_API_INGRESS')


