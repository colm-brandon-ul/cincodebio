from fastapi import FastAPI, Request, BackgroundTasks
from minio import Minio
from kubernetes import client, config
import jinja2
import requests

# Set up the Jinja environment
# This is relative to the working directorty not where the python script is.
# workdir needs to be set to the root of the project (i.e. app)
TEMPLATE_DIR = "./src/templates/"
STATIC_CODE_DIR = "./src/static_code/"
PERSISTENT_STATE_MOUNT_PATH = "/sib-manager-state"

LATEST_SIBS = "latest_sibs.json"
OTHER_SIBS = "other_sibs.json"
INSTALLED_SIBS = "installed_sibs.json"

# ONTOLOGY_VERSION = "0.1.0"

import utils 
import k8s_interface

import requests
import time
import os
import pathlib
import json
import logging


env = jinja2.Environment(
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


def check_if_local_state_exists():
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    try:
        with open(state_path / LATEST_SIBS, "r") as f:
            json.loads(f.read())

        with open(state_path / OTHER_SIBS, "r") as f:
            json.loads(f.read())

        with open(state_path / INSTALLED_SIBS, "r") as f:
            json.loads(f.read())

            return True

    except FileNotFoundError:
        return False



def rebuild_service_api(dh_namespace):
    static_path = pathlib.Path(STATIC_CODE_DIR)
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    # Retrieve the set of sibs available from DH
    latest, rest = utils.get_valid_images_from_namespace(dh_namespace, static_path)

    # WRITE THEM TO LOCAL STATE - LATEST, INSTALLED, OTHER
        # Initially, we will assume that all latest sibs are installed
    with open(state_path / LATEST_SIBS, "w") as f:
        json.dump(latest,f)

    with open(state_path / INSTALLED_SIBS, "w") as f:
        json.dump(latest,f)

    with open(state_path / OTHER_SIBS, "w") as f:
        json.dump(rest,f)

    # Generate the code for the service-api
    api_code, model_code = utils.code_gen(
        template_env=env,
        service_models=latest,   
    )

    # Need to create the docker context

    # Read the Dockerfile, k8s jobs and requirements.txt from static_code dir
    with open(static_path / 'Dockerfile', 'r') as f:
        dfile = f.read()
    
    with open(static_path / 'k8sjobs.py', 'r') as f:
        k8s_jobs_content = f.read()

    with open(static_path / 'requirements.txt', 'r') as f:
        requirements_content = f.read()

    if k8s_interface.prepare_build_context(
        pfile_content=api_code,
        mfile_content=model_code,
        docker_image_content=dfile,
        k8s_jobs_content= k8s_jobs_content,
        requiremnts_txt_content=requirements_content
    ):

        # Submit the kaniko job to build the service api image image
        kaniko_job_name = k8s_interface.submit_kaniko_build(
            image_name=os.getenv('SERVICE_API_NAME')
        )
        
        if k8s_interface.get_kaniko_build_status(kaniko_job_name):
            # Successfully built the service api image and pushed the image to the local registry
            # Trigger rolling updates - currently assuming default namespace
            k8s_interface.submit_rolling_update(
                image_name=os.getenv('SERVICE_API_NAME'),
                service_api_deployment_name=os.getenv('SERVICE_API_NAME')
            )
        else:
            logging.error("Failed to build the service api image")

           
    else:
        logging.error("Failed to create the docker context")


    

@app.on_event("startup")
async def startup_event(background_tasks: BackgroundTasks):
    config.load_incluster_config()
    # Check if the service-api is available (i.e. deplyoment successful.)
    service_deployment_health_check = health_check_with_timeout(
        url =f"http://{os.getenv("SERVICE_API_SERVICE_HOST")}:{os.getenv("SERVICE_API_SERVICE_PORT")}/health",
        timeout=300)
    
    container_registry_health_check = health_check_with_timeout(
        url=f"http://{os.getenv('REGISTRY_NAME')}.{os.getenv('REGISTRY_NAMESPACE')}.svc.cluster.local:{os.getenv('REGISTRY_PORT')}",
        timeout=300)
    
    
    # Depending on the health of the service-api and the local registry, we can decide whether to rebuild the service-api
    if service_deployment_health_check and container_registry_health_check:

        # If conditions are met, trigger the rebuild of the service-api
        
        background_tasks.add_task(rebuild_service_api, dh_namespace=os.getenv('DOCKER_HUB_NAMESPACE'))
    else:
        # Failure - for some reason the service-api deployment failed
        # Need to log this and raise an error
        logging.error("Dependant services are not available. Local Registry Health Check: {container_registry_health_check}. Service API Health Check: {service_deployment_health_check}")
        


    
    
    
# Need to retrieve the set of sibs available

# Need to generate the code
    
# Need to create the docker context
    
# Trigger the image build with kaniko and push the image to the registry
    
# Need to create the k8s deployment (to trigger update of service api)



@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down")

@app.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}


@app.get("/update-service-list")
def update_service_list():
    ...

