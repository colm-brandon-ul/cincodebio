import logging
import pika
from pika.exchange_type import ExchangeType
import os
from fastapi.encoders import jsonable_encoder
import json
from bson.objectid import ObjectId

EXCHANGE_NAME = os.environ.get('CODE_GENERATOR_EXCHANGE_NAME')
EXCHANGE_TYPE = ExchangeType.direct
ROUTING_KEY = os.environ.get('CODE_GENERATOR_ROUTING_KEY')
RABBIT_MQ_HOST = f"{os.environ.get('RABBITMQ_SERVICE_HOST')}:{os.environ.get('RABBITMQ_SERVICE_PORT')}"

from models import JobState, UpdateWorkflow, Workflow
from db import get_db_client

# Function to dispatch model to code generator
def model_submission_handler(workflow_id, model):
    logging.warning(workflow_id)
    # Add model to queue
    connection_params = pika.ConnectionParameters(host=RABBIT_MQ_HOST)
    connection = pika.BlockingConnection(connection_params)
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE)
    
    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=ROUTING_KEY,
        body=json.dumps(jsonable_encoder({"model": model, "workflow_id" : workflow_id }))
        )
    
    connection.close()


def insert_new_workflow_to_db(wf_obj: Workflow):
    # Insert Workflow Object to DB & return ID
    inserted_wf_obj = get_db_client().insert_one(jsonable_encoder(wf_obj))
    return inserted_wf_obj.inserted_id

def update_workflow_in_db(workflow_id, workflow: UpdateWorkflow) -> None:
    get_db_client().update_one({"_id": workflow_id}, {"$set": workflow.dict(exclude_none=True)})

def add_job_state_to_workflow_in_db(workflow_id, job_state: JobState) -> None:
    # jsonable-encoder by default uses alias, whereas pydantic json serializer does not.
    wri_res = get_db_client().update_one({"_id": workflow_id}, {"$push": {"state" : jsonable_encoder(job_state, by_alias=False)}})
    # logging.warning(f"Write Result {wri_res.raw_result}")

def update_job_status_in_workflow_in_db(workflow_id, job_state: JobState) -> None:
    logging.warning('UPDATE JOB STATE')
    logging.warning(f'ID {job_state.id}')
    logging.warning(f'ID {job_state.job_status}')

    wri_res = get_db_client().update_one({"_id": workflow_id, "state.id": job_state.id.__str__()}, {"$set" : {"state.$.job_status" : job_state.job_status, "state.$.url": job_state.url}})
    logging.warning(wri_res.modified_count)
    
def get_workflow_from_db_by_id(workflow_id) -> Workflow:
    try:
        return Workflow.parse_obj(get_db_client().find_one({"_id": workflow_id}))
    except TypeError:
        return None

# Creates the logs directory
def create_logs_directory_handler(WORKFLOW_LOG_PATH: str):
# If the workflow logs directory doesn't exist, create it
    if not os.path.exists(WORKFLOW_LOG_PATH):
        # Create a new directory because it does not exist
        os.makedirs(WORKFLOW_LOG_PATH)
        logging.info("Created Workflow Log Path")

# Creates the Workflow Log file and writes it to the logs directory
def create_workflow_log_file(WORKFLOW_LOG_PATH: str, uuid: str):
    try:
        f = open(f"{WORKFLOW_LOG_PATH}/{uuid}.txt", "x")
        f.write("Log File Created")
        f.close()
        logging.info(f"Created Log File for Workflow: {uuid}")      
    except FileExistsError:
        # Shouldn't be possible?
        pass
    except Exception as e:
        logging.warning(str(e))

def update_workflow_log_file(WORKFLOW_LOG_PATH: str, workflow_id: str, job: JobState):
    f = open(f"{WORKFLOW_LOG_PATH}/{workflow_id}.txt", "a")
    f.write(job.id.__str__())