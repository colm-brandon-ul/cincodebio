from fastapi import FastAPI, Request, BackgroundTasks

# from minio import Minio
from kubernetes import client, config
import jinja2
import requests

# Set up the Jinja environment
# This is relative to the working directorty not where the python script is.
# workdir needs to be set to the root of the project (i.e. app)
TEMPLATE_DIR = "./src/templates/"
STATIC_CODE_DIR = "./src/static-code/"
PERSISTENT_STATE_MOUNT_PATH = "/sib-manager-state"

LATEST_SIBS = "latest_sibs.json"
OTHER_SIBS = "other_sibs.json"
INSTALLED_SIBS = "installed_sibs.json"

CURRENT_SIBS_IME_JSON = "current_ime_sibs.json"
UTD_SIB_FILE = "lib.sibs"


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

JINJA_ENV = jinja2.Environment(
    loader=jinja2.FileSystemLoader(TEMPLATE_DIR), 
    extensions=['jinja2_strcase.StrcaseExtension'])

app = FastAPI()


def health_check_with_timeout(url, timeout):
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            if response.status_code == 200:
                return True
        except requests.exceptions.RequestException:
            pass

    return False

    

@app.on_event("startup")
async def startup_event():
    config.load_incluster_config()
    # Check if the service-api is available (i.e. deplyoment successful.)
    service_deployment_health_check = health_check_with_timeout(
        url =f"http://{os.getenv('SERVICE_API_SERVICE_HOST')}:{os.getenv('SERVICE_API_SERVICE_PORT')}/health",
        timeout=300)
    
    container_registry_health_check = health_check_with_timeout(
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
    template = JINJA_ENV.get_template("sib-manager.html.j2")
    return template.render(request=request)


@app.post("/update-installed-sibs")
def update_installed_sibs(request: Request, background_task: BackgroundTasks):

    # need to implement the logic to update the installed sibs

    # state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    # with open(state_path / INSTALLED_SIBS, "w") as f:
    #     json.dump(latest,f)
    ...

    if handlers.update_service_api_and_sibs():
        return {"status": "success"}, 200
    else:
        return {"status": "failure"}, 500



# ALL KEYS MUST BE STRINGS

# for use with the IME, it will compare the hash of the sib file
# with the hash of the up to date sib file stored in the SIB Manager
    

# --- ENDPOINTS FOR THE ECLIPSE BASED IME ---

@app.post("/sib-manager/check-sib-file-hash")
async def check_sib_file_hash(body: CheckSibFileHashRequest):
    
    local_hash, local_hash_nl = compute_local_hash()
    logging.warning(f"Local hash: {local_hash}, {local_hash_nl}")
    logging.warning(f"File hash received: {body}")
    # if hash is equal to neither, it's incorrect
    if body.fileHash != local_hash and body.fileHash != local_hash_nl: 
        return HashValid.INVALID
    
    return HashValid.VALID


@app.get("/sib-manager/get-utd-sib-file")
def get_utd_sib_file(request: Request):
    user_agent = request.headers.get('User-Agent', '')
    logging.warning(f"User-Agent: {user_agent}")
    
    # check if user is using Windows (then convert newlines to CRLF)
    if check_if_windows(user_agent):
        
        return UtdSibFileResponse(
                file=convert_newlines('lib.sibs')
            )
            
    with open('lib.sibs', 'r') as f:
        return UtdSibFileResponse(
                file=f.read()
            )