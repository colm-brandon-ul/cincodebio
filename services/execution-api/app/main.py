from typing import List
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
# Get Ingress Paths
EXECUTION_INGRESS_PATH = os.environ.get('EXECUTION_API_INGRESS_PATH')
SERVICES_INGRESS_PATH = os.environ.get('SERVICES_API_INGRESS_PATH')
SIB_MANAGER_INGRESS_PATH = os.environ.get('SIB_MANAGER_API_INGRESS_PATH')
DATA_MANAGER_API_INGRESS = os.environ.get('DATA_MANAGER_API_INGRESS')


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

from models import JobStatus, UpdateWorkflow, Workflow, JobState, WorkflowState, WorkflowStatus
from handlers import (add_job_state_to_workflow_in_db, create_workflow_log_file, get_workflow_from_db_by_id, 
                      model_submission_handler, insert_new_workflow_to_db, create_logs_directory_handler,
                       update_job_status_in_workflow_in_db, update_workflow_in_db, update_workflow_log_file)

from db import get_db_client

app = FastAPI()
env = Environment(loader=FileSystemLoader(Path(BASE_DIR,"templates")))
app.mount("/static", StaticFiles(directory=Path(BASE_DIR,"static")), name="static")

# Handles the Ingestion of the Model from the IME
# Returns the URL

@app.on_event("startup")
async def startup_event():
    # If this fails the application should not start
    create_logs_directory_handler(WORKFLOW_LOG_PATH=WORKFLOW_LOG_PATH)


# Needs to be indepotent (possibly?)
# Model Submission Endpoint
@app.post("/model/submit")
async def root(request: Request, background_tasks: BackgroundTasks, model: UploadFile = File(...)):
    # Let the full file upload
    model_file = model.file.read().decode("utf-8")

    # Create Workflow Object
    wf_obj = Workflow(status="submitted", state=[])
    uuid = insert_new_workflow_to_db(wf_obj)

    # Before a model is submitted to be built / ran there should be check to see if any data has been uploaded

    # Create Workflow Log File
    create_workflow_log_file(WORKFLOW_LOG_PATH,uuid)
    
    
    # Dispatch the model to the code generator
    background_tasks.add_task(
        model_submission_handler, 
        workflow_id = uuid, 
        model = model_file, 
        # the external is for services front-ends to be accesible
        external_url = f'{str(request.base_url)}{SERVICES_INGRESS_PATH}')
    
    logging.info(f"Dispatched model to Code Generator for Workflow: {uuid}") 
    
    
    
    # Return Status as Accepted and a link to the front-end URL
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED, 
        content={"url": str(request.base_url) + f"{EXECUTION_INGRESS_PATH}/frontend/{uuid}"})

# Handles the Callbacks from the Job Management Service
# Needs to be indepotent (possibly?)
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
        # TO BE IMPLEMENTED
        # Should add a kill statement to log file for execution environment
        pass
    

@app.post("/control/update-workflow/{workflow_id}")
async def update_workflow_state(workflow_id: str, workflow_update: UpdateWorkflow):
    update_workflow_in_db(
        workflow_id=workflow_id,
        workflow=workflow_update)
    

# Websocket(s) for the Front End
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
        

# Workflow Retrieval Endpoints

@app.get("/get-workflows", response_model=List[WorkflowState])
async def get_all_workflow_objects():
    # retrieve all workflows from the database
    # return them as a list of WorkflowState objects
    return [WorkflowState(**obj) for obj in get_db_client().find()]

@app.get("/get-worfklow/{workflow_id}", response_model=Workflow)
async def get_workflow_by_id(workflow_id: str):
    workflow_state = get_workflow_from_db_by_id(workflow_id)
    return Workflow(**workflow_state)



# TEST API ENDPOINT & HANDLER

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



# FRONT END RENDERING
# Endpoint for displaying the progress of a single workflow
@app.get("/frontend/{workflow_id}", response_class=HTMLResponse)
async def render_front_end(request: Request, workflow_id: str):
    logging.warning(f"FRONT END REQUEST: {request.base_url}")

    # Create the appropriate WS address
    ws_address = f"{request.base_url.__str__().replace('http','ws')}/{EXECUTION_INGRESS_PATH}/state/ws/{workflow_id}"

    template = env.get_template("execution_template.html.j2")
    html_content = template.render(request=request,
                                   executionApiIngress=EXECUTION_INGRESS_PATH,
                                   dataUploadIngress=DATA_MANAGER_API_INGRESS,
                                   sibManagerIngress=SIB_MANAGER_INGRESS_PATH,
                                   ws_address=ws_address)

    return HTMLResponse(content=html_content)

# Endpoint for displaying all workflows
@app.get("/", response_class=HTMLResponse)
async def workflow_frontend(request: Request):
    logging.warning(f"FRONT END REQUEST: {request.base_url}")
    # Create the appropriate WS address
    template = env.get_template("all_workflows.html.j2")
    
    html_content = template.render(
        request=request, 
        executionApiIngress=EXECUTION_INGRESS_PATH,
        dataUploadIngress=DATA_MANAGER_API_INGRESS,
        sibManagerIngress=SIB_MANAGER_INGRESS_PATH,
        getWorkflowsEndpoint=f'/{EXECUTION_INGRESS_PATH}/get-workflows')
    return HTMLResponse(content=html_content)