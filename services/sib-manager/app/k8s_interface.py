from typing import List
from kubernetes import client, config
from kubernetes.client.rest import ApiException
import json
import logging
import os

import os
import pathlib
import uuid
import logging
import time
import datetime

# Do I want to use env vars for this?
KANIKO_DOCKER_HUB_AUTH_VOLUME = "kaniko-secret"
DOCKER_BUILD_CONTEXT_VOLUME = os.getenv('DOCKER_BUILD_CONTEXT_VOLUME')
DOCKER_BUILD_CONTEXT_MOUNT_PATH = os.getenv('DOCKER_BUILD_CONTEXT_MOUNT_PATH')

# Container Registry details - do I want to use env vars for this?
REGISTRY_NAME = os.getenv('REGISTRY_NAME')
REGISTRY_NAMESPACE = os.getenv('REGISTRY_NAMESPACE')
REGISTRY_PORT = os.getenv('REGISTRY_PORT')

# This should be an env var 
CONTAINER_REGISTRY_DOMAIN_ON_HOST = os.getenv('CONTAINER_REGISTRY_DOMAIN_ON_HOST')

# Kaniko image (maybe an env var)
KANIKO_IMAGE = os.getenv('KANIKO_IMAGE')

# This should be an env var
KANIKO_BUILD_NAMESPACE = os.getenv('KANIKO_BUILD_NAMESPACE')


"""
This function prepares the build context for kaniko
:param pfile_content: The content of the python file to be built
"""


try:
    config.load_incluster_config()  
except:
    config.load_kube_config()


def get_available_architectures() -> List[str]:
    # Create an instance of the CoreV1Api class
    v1 = client.CoreV1Api()

    # Get a list of nodes
    nodes = v1.list_node().items

    # Extract the architecture of each node
    architectures = [node.status.node_info.architecture for node in nodes]

    # Get a list of unique architectures
    unique_architectures = list(set(architectures))

    return unique_architectures

def create_build_namespace(namespace: str):
    # Create the Namespace if it doesn't exist
    api_instance = client.CoreV1Api()
    namespace = client.V1Namespace(metadata=client.V1ObjectMeta(name=namespace))
    try:
        api_instance.create_namespace(body=namespace)
    except ApiException as e:
        logging.info(f"Exception when calling CoreV1Api->create_namespace")



def prepare_build_context(
        pfile_content: str,
        mfile_content: str,
        docker_image_content: str,
        k8s_jobs_content: str,
        requiremnts_txt_content: str,
        utils_content: str, 
        context_path: str = DOCKER_BUILD_CONTEXT_MOUNT_PATH):
    
    """
    Prepares the build context for Docker image creation via Kaniko

    Args:
        pfile_content (str): The content of the Python file.
        mfile_content (str): The content of the models file.
        docker_image_content (str): The content of the Dockerfile.
        k8s_jobs_content (str): The content of the Kubernetes jobs file.
        requiremnts_txt_content (str): The content of the requirements.txt file.
        context_path (str, optional): The path to the build context. Defaults to DOCKER_BUILD_CONTEXT_MOUNT_PATH.

    Returns:
        bool: True if the build context is prepared successfully, False otherwise.
    """
    
    

    # mounted volume path
    bp = pathlib.Path(context_path)

    # Should I delete everything in the context directory first?


    # make app dir if it doesn't exist
    try: 
        os.mkdir(bp / 'app')
    except:
        ...

    try:
        # Write the Dockerfile - to context
        with open(bp / 'Dockerfile', 'w') as f:
            f.write(docker_image_content)
        
        # Write the requirements.txt file
        with open(bp / 'requirements.txt', 'w') as f:
            f.write(requiremnts_txt_content)

        # Write all the Application code
        
        # Write the __init__.py file
        with open(bp / 'app' / '__init__.py', 'w') as f:
            f.write('')

        # Write the main.py file
        with open(bp / 'app' / 'main.py', 'w') as f:
            f.write(pfile_content)

        # Write the models.py file
        with open(bp / 'app' / 'models.py', 'w') as f:
            f.write(mfile_content)
        
        # Write the k8s_jobs.py file
        with open(bp / 'app' / 'k8sjobs.py', 'w') as f:
            f.write(k8s_jobs_content)

        # Write the k8s_jobs.py file
        with open(bp / 'app' / 'utils.py', 'w') as f:
            f.write(utils_content)

        return True
    except:
        return False

# Could add tag as an arg, but realistically it will always be latest
def submit_kaniko_build(image_name: str,context_path: str = DOCKER_BUILD_CONTEXT_MOUNT_PATH):
    """
    Submits a Kaniko build job to a Kubernetes cluster (for rebuilding the service api image).

    Args:
        image_name (str): The name of the image to be built.
        context_path (str, optional): The path to the Docker build context. Defaults to DOCKER_BUILD_CONTEXT_MOUNT_PATH.

    Returns:
        str: The name of the submitted job.
    """
    # loads k8s config
    config.load_incluster_config()


    # Create the PVC object for storing the docker hub config (which is empty)
    pvc = client.V1PersistentVolumeClaim(
        api_version="v1",
        kind="PersistentVolumeClaim",
        metadata=client.V1ObjectMeta(name=KANIKO_DOCKER_HUB_AUTH_VOLUME),
        spec=client.V1PersistentVolumeClaimSpec(
            access_modes=["ReadWriteOnce"],
            resources=client.V1ResourceRequirements(
                requests={"storage": "10Mi"}
            )
        )
    )

    # Create the PVC in the cluster (if it doesn't exist)
    vol_api_instance = client.CoreV1Api()
    try:
        vol_api_instance.create_namespaced_persistent_volume_claim(
            namespace="default", 
            body=pvc)
        logging.info("PersistentVolumeClaim created successfully.")
    except client.ApiException as e:
        logging.warning(f"Exception when calling CoreV1Api->create_namespaced_persistent_volume_claim")

    

    # DOCKER BUILD CONTEXT 4 KANIKO (MOUNTED VOLUME)
    DOCKER_CONTEXT_VOLUME_NAME = "docker-volume"
    # Define the docker context volume (for kaniko to use)
    docker_context_volume = client.V1Volume(
        name= DOCKER_CONTEXT_VOLUME_NAME,
        persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
            claim_name=DOCKER_BUILD_CONTEXT_VOLUME),
            )  
    
    # Define the volume mount
    docker_context_volume_mount = client.V1VolumeMount(
        mount_path=context_path,
        name=DOCKER_CONTEXT_VOLUME_NAME,
    )

    # DOCKER AUTH CONFIG 4 KANIKO (MOUNTED VOLUME)
    DOCKER_HUB_AUTH_VOLUME_NAME = "kaniko-docker-hub-config"
    docker_auth_volume = client.V1Volume(
        name=DOCKER_HUB_AUTH_VOLUME_NAME,
        persistent_volume_claim=client.V1PersistentVolumeClaimVolumeSource(
            claim_name=KANIKO_DOCKER_HUB_AUTH_VOLUME),
    )

    auth_volume_mount = client.V1VolumeMount(
        name=DOCKER_HUB_AUTH_VOLUME_NAME,
        mount_path="/kaniko/.docker",
    )


    # ARGS for Kaniko
    dfile_location = f"--dockerfile=Dockerfile"
    context_location = f"--context=dir://{context_path}/"
    dest = f"--destination={REGISTRY_NAME}.{REGISTRY_NAMESPACE}.svc.cluster.local:{REGISTRY_PORT}/{image_name}"
    

    # create a k8s batch api client
    api_instance = client.BatchV1Api()

    # create a unique job name (must be less than 253 chars)
    job_name = f'service-api-kaniko-build-{uuid.uuid4().hex}'

    # Create empty job
    job = client.V1Job()
    # define job metadata
    job.metadata = client.V1ObjectMeta(name=job_name)

    container = client.V1Container(
        name="kaniko-container",
        image=KANIKO_IMAGE,
        args=[dfile_location, context_location,dest,'--insecure'],  # Do i need --insecure arg?
        volume_mounts=[docker_context_volume_mount,auth_volume_mount],
    )

    # define the job-spec
    job.spec = client.V1JobSpec(
        ttl_seconds_after_finished=60,  # this deletes the jobs from the namespace after completion.
        template=client.V1PodTemplateSpec(
            spec=client.V1PodSpec(
                containers=[container], 
                volumes=[docker_context_volume,docker_auth_volume], 
                restart_policy="Never")
        ),
    )

    # create namespace for build if it doesn't exist
    create_build_namespace(KANIKO_BUILD_NAMESPACE)


    # Submit the job to the cluster
    api_instance.create_namespaced_job(
        namespace=KANIKO_BUILD_NAMESPACE, 
        body=job)

    # perhaps (is there anything else?)
    return job_name


def get_kaniko_build_status(job_name: str, namespace: str = KANIKO_BUILD_NAMESPACE, timeout: int = 900):
    # Start time
    start = time.time()
    # Assuming you are running this code from within a Pod in the cluster
    config.load_incluster_config()
    # create a k8s batch api client
    api_instance = client.BatchV1Api()
    # Poll the API for the job status

    status_code = None

    while True:
        try:
            job_status = api_instance.read_namespaced_job_status(
                name=job_name, 
                namespace=namespace)
            
            # logging.warning("Job status: ", job_status.status)
            # Check if job is completed
            if job_status.status.succeeded == job_status.spec.completions:
                logging.warning("Job completed")
                # Set status code to true (so next function knows it's done)
                status_code = True
                break
        except client.ApiException as e:
            logging.warning(f"Exception when calling BatchV1Api->read_namespaced_job_status")
        
        curent_time = time.time()

        # Check if the job has timed out
        if curent_time - start > timeout:
            logging.warning("Job timed out")
            # Set status code to false (so next function knows it's done)
            status_code = False
            break
        # could do some backoff here (or something more sophisticated)
        time.sleep(2)
    
    return status_code


def submit_rolling_update(image_name: str,service_api_deployment_name: str, service_api_deployment_namespace: str = "default"):
    # Assuming you are running this code from within a Pod in the cluster
    config.load_incluster_config()

    api_instance = client.AppsV1Api()

    # Get the deployment
    deployment = api_instance.read_namespaced_deployment(
        service_api_deployment_name, 
        service_api_deployment_namespace)

    # Update the existing deployment
    # Update the image version here 
    deployment.spec.template.spec.containers[0].image = f'{CONTAINER_REGISTRY_DOMAIN_ON_HOST}/{image_name}:latest'
    # Ensure the Image Pull Policy is set to Always to force the deployment to pull the new image
    deployment.spec.template.spec.containers[0].imagePullPolicy = 'Always'  

    # This is a hack to force the deployment to update
    # Ensure that deployment.spec.template.metadata.annotations is a dictionary
    if deployment.spec.template.metadata.annotations is None:
        deployment.spec.template.metadata.annotations = {}
    # Update the deployment's annotations with a new timestamp
    deployment.spec.template.metadata.annotations['kubectl.kubernetes.io/restartedAt'] = datetime.datetime.now().isoformat()

    # Patch the deployment
    api_response = api_instance.patch_namespaced_deployment(
        name=deployment.metadata.name,
        namespace=deployment.metadata.namespace,
        body=deployment
    )

    # logging.warning(f"Deployment updated. status='{str(api_response)}'")


if __name__ == "__main__":
    # Print the list of available architectures
    print(get_available_architectures())