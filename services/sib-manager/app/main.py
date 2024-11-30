import handlers
# Set up the Jinja environment
# This is relative to the working directorty not where the python script is.
# workdir needs to be set to the root of the project (i.e. app)
from config import (
    STATIC_DIR,
    SERVICE_API_SERVICE_HOST,
    SERVICE_API_SERVICE_PORT,
    REGISTRY_NAME,
    REGISTRY_NAMESPACE,
    REGISTRY_PORT,
    DOCKER_HUB_NAMESPACE,
    ONTOLOGY_MANAGER_SERVICE_HOST,
    ONTOLOGY_MANAGER_SERVICE_PORT
)
from external import router as external_router
from internal import router as internal_router

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from kubernetes import config



import logging


app = FastAPI()
app.include_router(external_router, prefix="/ext")
app.include_router(internal_router, prefix="")

# For serving static files
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.on_event("startup")
async def startup_event():
    config.load_incluster_config()
    # Check if the service-api is available (i.e. deplyoment successful.)

    ontology_manager_health_check = handlers.health_check_with_timeout(
        url=f"http://{ONTOLOGY_MANAGER_SERVICE_HOST}:{ONTOLOGY_MANAGER_SERVICE_PORT}/health",
        timeout=300)

    service_deployment_health_check = handlers.health_check_with_timeout(
        url =f"http://{SERVICE_API_SERVICE_HOST}:{SERVICE_API_SERVICE_PORT}/health",
        timeout=300)
    
    container_registry_health_check = handlers.health_check_with_timeout(
        url=f"http://{REGISTRY_NAME}.{REGISTRY_NAMESPACE}.svc.cluster.local:{REGISTRY_PORT}",
        timeout=300)
    
    # this will also need to check for ontologies...
    
    local_state_exists = handlers.check_if_local_state_exists()

    logging.warning(f"Service Deployment Health Check: {service_deployment_health_check}, Container Registry Health Check: {container_registry_health_check}, Ontology Manager Health Check: {ontology_manager_health_check}, Local State Exists: {local_state_exists}")
    
    # Depending on the health of the service-api and the local registry, we can decide whether to rebuild the service-api
    # also if the local state exists
    if ontology_manager_health_check and service_deployment_health_check and container_registry_health_check and not local_state_exists:
        # If conditions are met, trigger the rebuild of the service-api
        if handlers.initial_build_service_api(dh_namespace=DOCKER_HUB_NAMESPACE):
            ...
        else:
            # Failure - for some reason the service-api deployment failed
            # Need to log this and raise an error
            logging.error("Failed to build the service-api image")
    else:
        # Failure - for some reason the service-api deployment failed
        # Need to log this and raise an error
        if handlers.check_if_local_state_exists():
            logging.error("Local state already exists. No need to rebuild the service-api")
        else:
            logging.error(f"Dependant services are not available. Local Registry Health Check: {container_registry_health_check}. Service API Health Check: {service_deployment_health_check}. Ontology Manager Health Check: {ontology_manager_health_check}")



@app.on_event("shutdown")
async def shutdown_event():
    print("Shutting down")








    


        
 