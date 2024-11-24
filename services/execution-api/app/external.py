from typing import List
from fastapi import APIRouter, HTTPException, WebSocket, WebSocketDisconnect
from fastapi import BackgroundTasks, Request, UploadFile, File
from fastapi.responses import JSONResponse
import logging
from fastapi import status

from config import WORKFLOW_LOG_PATH, EXECUTION_INGRESS_PATH, SERVICES_INGRESS_PATH
from models import Workflow, WorkflowState, WorkflowStatus
from handlers import get_workflow_from_db_by_id, insert_new_workflow_to_db, create_workflow_log_file, model_submission_handler
from ws import ConnectionManager
from db import get_db_client

router = APIRouter()
manager = ConnectionManager()

# Needs to be indepotent (possibly?)
# Model Submission Endpoint
@router.post("/model/submit")
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


# # FRONT END RENDERING
# # Endpoint for displaying the progress of a single workflow
# @app.get("/frontend/{workflow_id}", response_class=HTMLResponse)
# async def render_front_end(request: Request, workflow_id: str):
#     logging.warning(f"FRONT END REQUEST: {request.base_url}")

#     # Create the appropriate WS address
#     ws_address = f"{request.base_url.__str__().replace('http','ws')}/{EXECUTION_INGRESS_PATH}/state/ws/{workflow_id}"

#     template = env.get_template("execution_template.html.j2")
#     html_content = template.render(request=request,
#                                    executionApiIngress=EXECUTION_INGRESS_PATH,
#                                    dataUploadIngress=DATA_MANAGER_API_INGRESS,
#                                    sibManagerIngress=SIB_MANAGER_INGRESS_PATH,
#                                    ws_address=ws_address)

#     return HTMLResponse(content=html_content)

# # Endpoint for displaying all workflows
# @app.get("/", response_class=HTMLResponse)
# async def workflow_frontend(request: Request):
#     logging.warning(f"FRONT END REQUEST: {request.base_url}")
#     # Create the appropriate WS address
#     template = env.get_template("all_workflows.html.j2")
    
#     html_content = template.render(
#         request=request, 
#         executionApiIngress=EXECUTION_INGRESS_PATH,
#         dataUploadIngress=DATA_MANAGER_API_INGRESS,
#         sibManagerIngress=SIB_MANAGER_INGRESS_PATH,
#         getWorkflowsEndpoint=f'/{EXECUTION_INGRESS_PATH}/get-workflows')
#     return HTMLResponse(content=html_content)