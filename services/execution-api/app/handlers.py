from config import (CINCO_DE_BIO_NAMESPACE, RABBIT_MQ_HOST, RABBIT_MQ_PORT, 
                    RABBITMQ_USERNAME, RABBITMQ_PASSWORD, 
                    EXCHANGE_NAME, EXCHANGE_TYPE, ROUTING_KEY, EXECUTION_ENV_HL)
from models import JobState, UpdateWorkflow, Workflow, WorkflowInternal
from db import get_db_client

import logging
import pika
import os
from fastapi.encoders import jsonable_encoder
import json
import requests

# Function to dispatch model to code generator
def model_submission_handler(workflow_id: str, model: str, external_url: str, v2: bool = False):
    logging.warning(workflow_id)
    # Add model to queue
    credentials = pika.PlainCredentials(RABBITMQ_USERNAME, RABBITMQ_PASSWORD)
    connection_params = pika.ConnectionParameters(host=RABBIT_MQ_HOST,port=RABBIT_MQ_PORT, credentials=credentials)
    connection = pika.BlockingConnection(connection_params)
    channel = connection.channel()
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type=EXCHANGE_TYPE)
    payload = {"model": model, "workflow_id" : workflow_id, "external_url": external_url}
    if v2:
        payload["v2"] = True

    channel.basic_publish(
        exchange=EXCHANGE_NAME,
        routing_key=ROUTING_KEY,
        body=json.dumps(jsonable_encoder(payload))
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
    get_db_client().update_one({"_id": workflow_id}, {"$push": {"state" : jsonable_encoder(job_state, by_alias=False)}})

def update_job_status_in_workflow_in_db(workflow_id, job_state: JobState) -> None:
    logging.warning('UPDATE JOB STATE')
    logging.warning(f'ID {job_state.id}')
    logging.warning(f'ID {job_state.job_status}')

    wri_res = get_db_client().update_one(
        {"_id": workflow_id, "state.id": job_state.id.__str__()}, 
        {"$set" : {"state.$.job_status" : job_state.job_status, "state.$.url": job_state.url}})
    
    logging.warning(wri_res.modified_count)
    
def get_workflow_from_db_by_id(workflow_id) -> Workflow:
    try:
        return Workflow.parse_obj(get_db_client().find_one({"_id": workflow_id}))
    except TypeError:
        return None
    
def get_workflow_internal_from_db_by_id(workflow_id) -> WorkflowInternal:
    try:
        return WorkflowInternal.parse_obj(get_db_client().find_one({"_id": workflow_id}))
    except TypeError:
        return None


def inform_execution_env(workflow_id: str, job: JobState):

    wf = get_workflow_internal_from_db_by_id(workflow_id)
    job_id = job.id.__str__()
    # Inform the Execution Environment
    res = requests.post(
        url=f"http://{wf.hostname}.{EXECUTION_ENV_HL}.{CINCO_DE_BIO_NAMESPACE}.svc.cluster.local/callback/{wf.process_id}/{job_id}",
    )

    res.raise_for_status()