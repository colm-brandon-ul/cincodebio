from config import SERVICES_INGRESS_PATH
from models import UpdateWorkflow, Workflow, WorkflowState, WorkflowStatus
from handlers import get_workflow_from_db_by_id, inform_execution_env, insert_new_workflow_to_db, model_submission_handler, update_workflow_in_db
from ws import ConnectionManager
from db import get_db_client

from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi import BackgroundTasks, Request, UploadFile, File
from fastapi.responses import JSONResponse
import logging
from fastapi import status

router = APIRouter()
manager = ConnectionManager()

@router.get("/kill-worflow/{workflow_id}")
async def kill_workflow(workflow_id: str):
    # Kill a workflow
    inform_execution_env(workflow_id, 'KWORKFLOW')
    # update the workflow status to failed
    update_workflow_in_db(workflow_id, UpdateWorkflow(status=WorkflowStatus.failed))

    return JSONResponse(status_code=status.HTTP_200_OK, content={"message": f"Workflow - {workflow_id} - Killed"})

# Model Submission Endpoint
@router.post("/model/submit")
async def root(request: Request, background_tasks: BackgroundTasks, model: UploadFile = File(...),v2:bool =False):
    # Let the full file upload
    model_file = model.file.read().decode("utf-8")
    
    # Create Workflow Object
    wf_obj = Workflow(status="submitted", state=[])
    uuid = insert_new_workflow_to_db(wf_obj)
    # Before a model is submitted to be built / ran there should be check to see if any data has been uploaded
    # Create Workflow Log File
    # Dispatch the model to the code generator
    background_tasks.add_task(
        model_submission_handler, 
        workflow_id = uuid, 
        model = model_file, 
        # the external is for services front-ends to be accesible
        external_url = f'{str(request.base_url).replace("http://","https://")}{SERVICES_INGRESS_PATH}',
        v2=v2)
    logging.info(f"Dispatched model to Code Generator for Workflow: {uuid}") 
    # Return Status as Accepted and a link to the front-end URL
    return JSONResponse(
        status_code=status.HTTP_202_ACCEPTED, 
        content={"url": str(request.base_url).replace('http://','https://') + f"app/workflows/{uuid}"})

@router.get("/get-workflows", response_model=List[WorkflowState], response_model_by_alias=False)
async def get_all_workflow_objects():
    # retrieve all workflows from the database
    # return them as a list of WorkflowState objects
    return [WorkflowState(**obj) for obj in get_db_client().find()]

# Workflow Retrieval Endpoints

@router.websocket("/state/ws/{workflow_id}")
async def websocket_endpoint(websocket: WebSocket,workflow_id: str):
    logging.warning(f"WS COOKIES: {websocket.cookies}")
    await manager.connect(websocket)
    try: 
        while True:
            await websocket.receive_text()
            workflow_state = get_workflow_from_db_by_id(workflow_id)
            logging.warning(f'WEBSOCKET: {workflow_state.json()}')
            await manager.send_json(workflow_state.json(),websocket)
            if workflow_state.status == WorkflowStatus.completed:
                # If the workflow is completed, send the final state and disconnect
                workflow_state = get_workflow_from_db_by_id(workflow_id)
                await manager.send_json(workflow_state.json(),websocket)
                manager.disconnect(websocket)
                break
    except WebSocketDisconnect:
        logging.warning("Client disconnected")
        manager.disconnect(websocket)