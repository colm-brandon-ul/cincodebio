import os
from pika.exchange_type import ExchangeType
# Import Environment Variables
EXECUTION_ADDRESS = f'http://{os.environ.get("EXECUTION_ENVIRONMENT_SERVICE_HOST")}:{os.environ.get("EXECUTION_ENVIRONMENT_SERVICE_PORT")}'
EXECUTION_API_ADDRESS = f'http://{os.environ.get("EXECUTION_API_SERVICE_HOST")}:{os.environ.get("EXECUTION_API_SERVICE_PORT")}'
SIB_MANAGER_ADDRESS = f'http://{os.environ.get("SIB_MANAGER_SERVICE_HOST")}:{os.environ.get("SIB_MANAGER_SERVICE_PORT")}'

# RabbitMQ ENV Variables
RABBIT_MQ_HOST = os.environ.get('RABBITMQ_SERVICE_HOST')
RABBIT_MQ_PORT = int(os.environ.get('RABBITMQ_SERVICE_PORT'))
RABBITMQ_USERNAME = os.getenv('RABBITMQ_USERNAME')
RABBITMQ_PASSWORD = os.getenv('RABBITMQ_PASSWORD')

EXCHANGE_NAME = os.environ.get('CODE_GENERATOR_EXCHANGE_NAME')
EXCHANGE_TYPE = ExchangeType.direct
CODE_GEN_ROUTING_KEY = os.environ.get('CODE_GENERATOR_ROUTING_KEY')