from kubernetes import client, config
from kubernetes.client.rest import ApiException
import json
import logging
import os



# Loads the config - if running in a cluster, it will load the in-cluster config, otherwise it will load the kubeconfig file
try:
    config.load_incluster_config()  
except:
    try:
        config.load_kube_config()
    except Exception as e:
        logging.info(f"Exception when calling config.load_kube_config: {e}")




def submit_k8s_job(
        routing_key: str, # this is unique to a service / and distinguishes between process & prepare templated methods being called
        data: dict, # this is the data to be processed
        image_name: str, # this is the docker image to be used for the job
        job_id: str, # this is the unique job id from the JMS
        base_url: str = None, # this is the base url (for interactive services and defaults to none)
        is_interactive_submit: bool = False # this is a flag to determine if the job is interactive or not
        ):
    
    # to be populated - do I want a seperate namespace for jobs?
    NAMESPACE = os.environ.get('DPS_NAMESPACE')
    MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY')
    MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY')
    MINIO_WORKFLOW_BUCKET = os.environ.get('MINIO_WORKFLOW_BUCKET')
    MINIO_EXPERIMENT_BUCKET = os.environ.get('MINIO_EXPERIMENT_BUCKET')

    # Create the FQDN for the minio and jobs-api services (so dps running in different namespace can access them)
    MINIO_FQDN = f'{os.environ.get("MINIO_SERVICE_HOSTNAME")}.{os.environ.get("CINCO_DE_BIO_NAMESPACE")}.svc.cluster.local'
    MINIO_SERVICE_PORT = os.environ.get('MINIO_SERVICE_PORT')

    JOBS_API_FQDN = f'{os.environ.get("JOBS_API_SERVICE_HOSTNAME")}.{os.environ.get("CINCO_DE_BIO_NAMESPACE")}.svc.cluster.local'
    JOBS_API_SERVICE_PORT = os.environ.get('JOBS_API_SERVICE_PORT')

    try:
        # Create the Namespace if it doesn't exist
        namespace = client.V1Namespace(metadata=client.V1ObjectMeta(name=NAMESPACE))
        api_instance = client.CoreV1Api()
        api_instance.create_namespace(body=namespace)
    except:
        ...

    # Create Batch API instance client
    api_instance = client.BatchV1Api()

    # Create a Job object
    job = client.V1Job()

    # Add metadata to the Job
    job.metadata = client.V1ObjectMeta(name=job_id)

    
    # popluating env variables
    # If the dps are running in a different namespace, need info for FDQN's
    env_vars = [
        client.V1EnvVar(
                name="CINCODEBIO_DATA_PAYLOAD",
                value=json.dumps(data)
        ),
        client.V1EnvVar(
                name="CINCODEBIO_JOB_ID",
                value=job_id
        ),
        client.V1EnvVar(
                name="CINCODEBIO_ROUTING_KEY",
                value=routing_key
        ),
        # So the DPS can access the Minio instance
        client.V1EnvVar(
                name="MINIO_ACCESS_KEY",
                value=MINIO_ACCESS_KEY
        ),
        client.V1EnvVar(
                name="MINIO_SECRET_KEY",
                value=MINIO_SECRET_KEY
        ),
        client.V1EnvVar(
                name="MINIO_WORKFLOW_BUCKET",
                value=MINIO_WORKFLOW_BUCKET
        ),
        client.V1EnvVar(
                name="MINIO_EXPERIMENT_BUCKET",
                value=MINIO_EXPERIMENT_BUCKET
        ),
        client.V1EnvVar(
            name="MINIO_SERVICE_HOST",
            value=MINIO_FQDN # FQDN for minio
        ),
        client.V1EnvVar(
            name="MINIO_SERVICE_PORT",
            value=MINIO_SERVICE_PORT
        ),
        client.V1EnvVar(
            name="JOBS_API_SERVICE_HOST",
            value=JOBS_API_FQDN # FQDN for jobs-api
        ),
        client.V1EnvVar(
            name="JOBS_API_SERVICE_PORT",
            value=JOBS_API_SERVICE_PORT
        )
    ]

    # If it's an interactive service, add the base_url to the env variables
    if base_url != None:
        env_vars.append(
            client.V1EnvVar(
                name="CINCODEBIO_BASE_URL",
                value=base_url
            )
        )

    
    # Create the container
    container = client.V1Container(
        # creating a unique name for the container
        name=f"{routing_key.replace('.', '-')}-{job_id}",
        image=image_name,
        env=env_vars
    )
    

    job.spec = client.V1JobSpec(
        ttl_seconds_after_finished=60, # this deletes the jobs from the namespace after completion.
        template=client.V1PodTemplateSpec(
            spec=client.V1PodSpec(containers=[container],restart_policy="Never")
        ),
    )


    # Create the Job
    try:
        api_instance.create_namespaced_job(namespace=NAMESPACE, body=job)
    except ApiException as e:
        logging.info(f"Exception when calling BatchV1Api->create_namespaced_job for job: {job_id}: {e}")