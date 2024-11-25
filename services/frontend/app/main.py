import base64
import os
import json
import logging
from pathlib import Path
from typing import Dict
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
import requests
from config import EXECUTION_API_INGRESS_PATH, DATA_MANAGER_API_INGRESS, SIB_MANAGER_API_INGRESS
from ws import ConnectionManager
from handlers import get_health, get_form_details, get_sib_details

BASE_DIR = Path(__file__).resolve().parent

map2service = {
    "workflow_manager": EXECUTION_API_INGRESS_PATH,
    "data_manager": DATA_MANAGER_API_INGRESS,
    "sib_manager": SIB_MANAGER_API_INGRESS
}
app = FastAPI()
env = Environment(loader=FileSystemLoader(Path(BASE_DIR,"templates")))
app.mount("/static", StaticFiles(directory=Path(BASE_DIR,"static")), name="static")
manager = ConnectionManager()



# Data Upload Portal
@app.get("/data-manager", response_class=HTMLResponse)
async def data_manager(request: Request):
    # This will need to be generated based on the ontology version installed
    data_manager_address = f'/{DATA_MANAGER_API_INGRESS}/ext/'
    
    # retreive the ontology version from the environment variable
    # extract the subclasses of Experiment, etc..
    template = env.get_template("data-manager-index.html.j2")
    html_content = template.render(
        request=request,
        data_manager_address=data_manager_address,
        service_name="data_manager",
    )

    return HTMLResponse(content=html_content)

@app.get("/data-manager/get-form-details", response_class=Dict)
async def get_form_details(request: Request):
    # get the form details from the ontology manager
    form_details = get_form_details()
    return form_details



# This is the front end for the SIB Manager
@app.get("/sib-manager")
async def sib_manager(request: Request):
    # get latest, installed and rest sibs from sib-manager
    
    latest,rest,installed = get_sib_details()

    # sib_manager_address = f'{request.base_url.__str__()}/{SIB_MANAGER_API_INGRESS}/ext/'
  
    submit_url = f'/{SIB_MANAGER_API_INGRESS}/ext/update-installed-sibs'
    return HTMLResponse(content=env.get_template("sib-manager.html.j2").render(**{
        "submit_url": submit_url,
        "latest": latest,
        "rest": rest,
        "installed": installed,
        "service_name" : "sib_manager",
        }))


# Endpoint for displaying all workflows
@app.get("/workflows", response_class=HTMLResponse)
async def workflow_frontend(request: Request):

    execution_api_address = f'/{EXECUTION_API_INGRESS_PATH}/ext/'

    # Create the appropriate WS address
    template = env.get_template("all_workflows.html.j2")
    html_content = template.render(
        request=request, 
        execution_api_address=execution_api_address,
        service_name="workflow_manager")
    return HTMLResponse(content=html_content)


# FRONT END RENDERING
# Endpoint for displaying the progress of a single workflow
@app.get("/workflows/{workflow_id}", response_class=HTMLResponse)
async def render_front_end(request: Request, workflow_id: str):
    logging.warning(f"FRONT END REQUEST: {request.base_url}")

    execution_api_address = f'/{EXECUTION_API_INGRESS_PATH}/ext/'
    data_manager_address = f'/{DATA_MANAGER_API_INGRESS}/ext/'
    # Create the appropriate WS address
    ws_address = f"{request.base_url.__str__().replace('http','ws')}/{EXECUTION_API_INGRESS_PATH}/ext/state/ws/{workflow_id}"
    template = env.get_template("execution_template.html.j2")
    html_content = template.render(request=request,
                                   service_name="workflow_manager",
                                   execution_api_address=execution_api_address,
                                   data_manager_address=data_manager_address,
                                   ws_address=ws_address)
    

@app.websocket("/ws/healthcheck")
async def websocket_endpoint(websocket: WebSocket):
    logging.warning(f"WS COOKIES: {websocket.cookies}")
    await manager.connect(websocket)
    # await websocket.close()
    # Check for None Type
    try: 
        while True:
            data = await websocket.receive_text()
            data = json.loads(data)
            logging.warning(f"DATA: {data}")
            service = map2service.get(data['service'],None)
            if service is None:
                await manager.send_json({"status": "unhealthy"},websocket)
                continue

            url = f"http://{service}/health"

            health = get_health(url)
            logging.warning(f'{data["service"]} - HEALTH: {health}')


            await manager.send_json(health,websocket)
            
            if health['status'] == "healthy":
                manager.disconnect(websocket)
                break
    except WebSocketDisconnect:
        logging.warning("Client disconnected")
        manager.disconnect(websocket)
        # await manager.broadcast(f"Client #{client_id} left the chat")