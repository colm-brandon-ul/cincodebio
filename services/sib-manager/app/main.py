from typing import List
from fastapi import FastAPI, Request, BackgroundTasks
from fastapi.responses import HTMLResponse

# from minio import Minio
from kubernetes import client, config
import jinja2
import requests
# ONTOLOGY_VERSION = "0.1.0"

import utils 
import k8s_interface

import requests
import time
import os
import pathlib
import json
import logging

from models import CheckSibFileHashRequest, HashValid, UtdSibFileResponse
from cinco_interface import compute_local_hash, check_if_windows, convert_newlines
import handlers

# Set up the Jinja environment
# This is relative to the working directorty not where the python script is.
# workdir needs to be set to the root of the project (i.e. app)
from config import (
    TEMPLATE_DIR,
    PERSISTENT_STATE_MOUNT_PATH,
    LATEST_SIBS,
    OTHER_SIBS,
    INSTALLED_SIBS,
    SIB_MAP_FILE,
    UTD_SIB_FILE,
    JINJA_ENV
)

# K8S ENVIRONMENT VARIABLES (used in app)
#     - CONTAINER_REGISTRY_DOMAIN_ON_HOST
#     - DOCKER_BUILD_CONTEXT_VOLUME
#     - DOCKER_BUILD_CONTEXT_MOUNT_PATH
#     - DOCKER_HUB_NAMESPACE
#     - KANIKO_IMAGE
#     - KANIKO_BUILD_NAMESPACE
#     - REGISTRY_NAME
#     - REGISTRY_NAMESPACE
#     - REGISTRY_PORT
#     - SERVICE_API_SERVICE_HOST
#     - SERVICE_API_SERVICE_PORT
#     - SERVICE_API_NAME (for rolling update submission)
#     - SIB_MANAGER_API_INGRESS_PATH


    

# JINJA_ENV = jinja2.Environment(
#     loader=jinja2.FileSystemLoader(TEMPLATE_DIR), 
#     extensions=['jinja2_strcase.StrcaseExtension'])

app = FastAPI()


    

@app.on_event("startup")
async def startup_event():
    config.load_incluster_config()
    # Check if the service-api is available (i.e. deplyoment successful.)
    service_deployment_health_check = handlers.health_check_with_timeout(
        url =f"http://{os.getenv('SERVICE_API_SERVICE_HOST')}:{os.getenv('SERVICE_API_SERVICE_PORT')}/health",
        timeout=300)
    
    container_registry_health_check = handlers.health_check_with_timeout(
        url=f"http://{os.getenv('REGISTRY_NAME')}.{os.getenv('REGISTRY_NAMESPACE')}.svc.cluster.local:{os.getenv('REGISTRY_PORT')}",
        timeout=300)
    
    
    # Depending on the health of the service-api and the local registry, we can decide whether to rebuild the service-api
    # also if the local state exists
    if service_deployment_health_check and container_registry_health_check and handlers.check_if_local_state_exists():
        # If conditions are met, trigger the rebuild of the service-api
        if handlers.initial_build_service_api(dh_namespace=os.getenv('DOCKER_HUB_NAMESPACE')):
            ...
        else:
            # Failure - for some reason the service-api deployment failed
            # Need to log this and raise an error
            logging.error(f"Failed to build the service-api image")
    else:
        # Failure - for some reason the service-api deployment failed
        # Need to log this and raise an error
        logging.error(f"Dependant services are not available. Local Registry Health Check: {container_registry_health_check}. Service API Health Check: {service_deployment_health_check}")



@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down")

@app.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}


@app.get("/get-installed-sibs")
def get_installed_sibs():
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / INSTALLED_SIBS, "r") as f:
        return json.loads(f.read())
    

@app.get("/get-uninstalled-sibs")
def get_uninstalled_sibs():
    # set of sibs that are not installed but are available
    # compare latest and installed
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / OTHER_SIBS, "r") as f:
        return json.loads(f.read())
    

# This is the front end for the SIB Manager
@app.get("/")
def sib_manager(request: Request):

    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)


    with open(state_path / LATEST_SIBS ) as f:
        latest_sibs = json.load(f)

    with open(state_path / INSTALLED_SIBS ) as f:
        installed_sibs = json.load(f)
    
    with open(state_path / OTHER_SIBS ) as f:
        other_sibs = json.load(f)
    
    # get the sib names 
    latest = [sib['cincodebio.schema']['service_name'] for sib in latest_sibs if sib] 
    rest = [sib['cincodebio.schema']['service_name'] for sib in other_sibs if sib]
    installed = [sib['cincodebio.schema']['service_name'] for sib in installed_sibs if sib]

    # sort the lists so they are displayed in a alphabetical order
    latest.sort(),rest.sort(),installed.sort()

    submit_url = f'{request.base_url.__str__()}{os.getenv("SIB_MANAGER_API_INGRESS_PATH")}/update-installed-sibs'

    
    return HTMLResponse(content=JINJA_ENV.get_template("sib-manager.html.j2").render(**{
        "submit_url": submit_url,
        "latest": latest,
        "rest": rest,
        "installed": installed
        }))



@app.post("/update-installed-sibs")
def update_installed_sibs(body: List, request: Request, background_task: BackgroundTasks):

    # get the list of sibs to be installed from the request body
    tbi_sib_list = handlers.resolve_to_be_installed_sibs(body)

    if handlers.update_service_api_and_sibs(tbi_sib_list):
        return {"status": "success"}, 200
    else:
        return {"status": "failure"}, 500



# ALL KEYS MUST BE STRINGS

# for use with the IME, it will compare the hash of the sib file
# with the hash of the up to date sib file stored in the SIB Manager
    
# --- ENDPOINTS FOR THE Workflow Code Gen ---
@app.get("/get-sib-map")
def get_sib_map(request: Request):
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / SIB_MAP_FILE, "r") as f:
        return json.loads(f.read())
    

# --- ENDPOINTS FOR THE ECLIPSE BASED IME ---

@app.post("/check-sib-file-hash", response_model=HashValid)
async def check_sib_file_hash(body: CheckSibFileHashRequest):
    
    local_hash, local_hash_nl = compute_local_hash()
    logging.info(f"Local hash: {local_hash}, {local_hash_nl}")
    logging.info(f"File hash received: {body}")
    # if hash is equal to nither, it's incorrect
    if body.fileHash != local_hash and body.fileHash != local_hash_nl: 
        return HashValid.INVALID
    return HashValid.VALID


@app.get("/get-utd-sib-file", response_model=UtdSibFileResponse)
def get_utd_sib_file(request: Request):
    user_agent = request.headers.get('User-Agent', '')
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    logging.info(f"User-Agent: {user_agent}")
    
    # check if user is using Windows (then convert newlines to CRLF)
    if check_if_windows(user_agent):
        
        return UtdSibFileResponse(
                file=convert_newlines(state_path / UTD_SIB_FILE)
            )
            
    with open(state_path / UTD_SIB_FILE , 'r') as f:
        return UtdSibFileResponse(
                file=f.read()
            )
    


