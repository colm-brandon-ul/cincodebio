from fastapi import FastAPI, WebSocket, File, UploadFile, BackgroundTasks, Request, WebSocketDisconnect, status
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, JSONResponse
from jinja2 import Environment, FileSystemLoader
import requests 
import json
import logging 
import time 
import random
import uuid
import os

from fastapi.encoders import jsonable_encoder

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

WORKFLOW_LOG_PATH = os.environ.get('WORKFLOW_LOGS_PATH')
EXECUTION_INGRESS_PATH = os.environ.get('EXECUTION_API_INGRESS_PATH')


logging.basicConfig(format='%(asctime)s - %(process)d - %(levelname)s - %(message)s', level=logging.WARNING)
"""
    Execution API:
    - Ingest modelled workflows from the IME
    - Dispatch those models to the code generator
    - Handle Callbacks from JMS
        - Based on those callbacks communicate in some manner with the Execution Runtimes (based on ID)
    - Communicate Workflow State to Execution Front end via Websocket
    - API for returning all workflows
"""

from models import JobStatus, UpdateWorkflow, Workflow, JobState, WorkflowStatus
from handlers import (add_job_state_to_workflow_in_db, create_workflow_log_file, get_workflow_from_db_by_id, 
                      model_submission_handler, insert_new_workflow_to_db, create_logs_directory_handler,
                       update_job_status_in_workflow_in_db, update_workflow_in_db, update_workflow_log_file)

from db import get_db_client

app = FastAPI()
env = Environment(loader=FileSystemLoader(Path(BASE_DIR,"templates")))
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Handles the Ingestion of the Model from the IME
# Returns the URL

@app.on_event("startup")
async def startup_event():
    # If this fails the application should not start
    create_logs_directory_handler(WORKFLOW_LOG_PATH=WORKFLOW_LOG_PATH)


@app.post("/model/submit")
async def root(model: UploadFile, request: Request, background_tasks: BackgroundTasks):
    # Let the full file upload
    model_file = await model.read()

    # Create Workflow Object
    wf_obj = Workflow(status="submitted", state=[])
    uuid = insert_new_workflow_to_db(wf_obj)

    # Before a model is submitted to be built / ran there should be check to see if any data has been uploaded

    # Create Workflow Log File
    create_workflow_log_file(WORKFLOW_LOG_PATH,uuid)
    
    
    # Dispatch the model to the code generator
    background_tasks.add_task(model_submission_handler, workflow_id = uuid, model = model_file)
    logging.info(f"Dispatched model to Code Generator for Workflow: {uuid}") 
    
    
    
    # Return Status as Accepted and a link to the front-end URL
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED, 
        content={"url": str(request.base_url) + f"{EXECUTION_INGRESS_PATH}/frontend/{uuid}"})


# Needs to be indepotent (possibly?)
# With Job ID
@app.post("/control/callback/{workflow_id}")
async def handles_callbacks(workflow_id: str, job: JobState):
    logging.warning(f'JOB STATE SENT: {job}')

    if job.job_status == JobStatus.completed:
        # Happens in the case of an automated or interactive job being executed to completion
        # Update the Database with the new State
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)
        # Update log with Job ID maybe?
        update_workflow_log_file(WORKFLOW_LOG_PATH, workflow_id, job)
        
    elif job.job_status == JobStatus.awaiting_interaction:
        pass
        # Happens in the case of an where the front end is available for the user to perform their interaction
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)
        # Update the Database with the new State (so that URL to front is presented to the user)
        # get_db_client()
    
    # Callback from the execution environment to update the workflow object id 
    elif job.job_status == JobStatus.submitted:
        logging.warning(f'Job {job.id}, has been submitted')
        add_job_state_to_workflow_in_db(workflow_id=workflow_id,job_state=job)

    # Callbacks from the JMS
    elif job.job_status == JobStatus.accepted: 
        logging.warning(f'Job {job.id}, has been accepted')
        logging.warning(job)
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)

     # Callbacks from the JMS
    elif job.job_status == JobStatus.interaction_accepted: 
        logging.warning(f'Job {job.id}, has been accepted')
        logging.warning(job)
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)



    # Callbacks from the JMS, Occurs when the data processing service reads the job off the queue
    elif job.job_status == JobStatus.processing:
        logging.warning(f'Job {job.id}, has started processing')
        logging.warning(job)
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)
    
    # Callbacks from the JMS - if job failed, need to figure this one out
    elif job.job_status == JobStatus.failed:
        pass
    
    # logging.warning(f"Callback made for Workflow: {workflow_id}, Job: {job.id}, with Status: {job.job_status}")
    # f = open(f"data/test-id-{workflow_id}.txt", "a")
    # f.write(r"\tCallback has been made!")
    # return None

@app.post("/control/update-workflow/{workflow_id}")
async def update_workflow_state(workflow_id: str, workflow_update: UpdateWorkflow):

    update_workflow_in_db(
        workflow_id=workflow_id,
        workflow=workflow_update)

@app.get("/frontend/{workflow_id}", response_class=HTMLResponse)
async def render_front_end(request: Request, workflow_id: str):
    logging.warning(f"FRONT END REQUEST: {request.base_url}")

    # Create the appropriate WS address
    ws_address = f"{request.base_url.__str__().replace('http','ws')}/{EXECUTION_INGRESS_PATH}/state/ws/{workflow_id}"

    template = env.get_template("execution_template.html")
    html_content = template.render(request=request, ws_address=ws_address)

    return HTMLResponse(content=html_content)



class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_json(self, message: str, websocket: WebSocket):
        await websocket.send_json(message)


manager = ConnectionManager()


# Needs to read the state from somewhere and push it to the front-end
@app.websocket("/state/ws/{workflow_id}")
async def websocket_endpoint(websocket: WebSocket,workflow_id: str):
    logging.warning(f"WS COOKIES: {websocket.cookies}")
    await manager.connect(websocket)
    # await websocket.close()
    # Check for None Type
    try: 
        while True:
            data = await websocket.receive_text()
            workflow_state = get_workflow_from_db_by_id(workflow_id)
            logging.warning(f'WEBSOCKET: {workflow_state.json()}')
            await manager.send_json(workflow_state.json(),websocket)
            if workflow_state.status == WorkflowStatus.completed:
                manager.disconnect(websocket)
                break
    except WebSocketDisconnect:
        logging.warning("Client disconnected")
        manager.disconnect(websocket)
        # await manager.broadcast(f"Client #{client_id} left the chat")
        

@app.get("/get-workflows")
async def get_all_workflow_objects():
    return [obj for obj in get_db_client().find()]

@app.get("/get-worfklow/{workflow_id}")
async def get_workflow_by_id(workflow_id: str):
    workflow_state = get_workflow_from_db_by_id(workflow_id)
    return workflow_state.json()




# Function to dispatch model to code generator
def test_code_submission_handler(workflow_id, model):

    # Update the workflow state to accepted
    update_workflow_in_db(workflow_id=workflow_id,workflow=UpdateWorkflow(status="accepted"))

    EXECUTION_ADDRESS = f"{os.getenv('EXECUTION_ENVIRONMENT_SERVICE_HOST')}:{os.getenv('EXECUTION_ENVIRONMENT_SERVICE_PORT')}"

    # Send code to execution environment

    # This will be replaced with some code generatioon functionality
    res = requests.post(f"http://{EXECUTION_ADDRESS}/", 
                        json={"code": model.replace("WORKFLOW_ID", workflow_id), 
                              "workflow_id": workflow_id})
    logging.warning(str(res.status_code))






@app.post("/test/python-code/submit")
async def root(request: Request, background_tasks: BackgroundTasks, model: UploadFile = File(...)):
    # Let the full file upload
    model_file = await model.read()

    # Create Workflow Object
    wf_obj = Workflow(status="submitted", state=[])
    uuid = insert_new_workflow_to_db(wf_obj)

    # Create Workflow Log File
    create_workflow_log_file(WORKFLOW_LOG_PATH,uuid)
    
    
    # Dispatch the model to the code generator
    background_tasks.add_task(
        test_code_submission_handler, 
        workflow_id = uuid, 
        model = model_file.decode("utf-8"))
    
    logging.info(f"Dispatched model to Code Generator for Workflow: {uuid}") 
    
    
    
    # Return Status as Accepted and a link to the front-end URL
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED, 
        content={"url": str(request.base_url) + f"{EXECUTION_INGRESS_PATH}/frontend/{uuid}"})




