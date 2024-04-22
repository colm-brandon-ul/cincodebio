from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
from minio import Minio
from minio.commonconfig import Tags
import logging, os

from urllib.parse import urlparse




# to be populated - do I want a seperate namespace for jobs?
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY')
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY')
MINIO_WORKFLOW_BUCKET = os.environ.get('MINIO_WORKFLOW_BUCKET')
MINIO_EXPERIMENT_BUCKET = os.environ.get('MINIO_EXPERIMENT_BUCKET')

# Create the FQDN for the minio and jobs-api services (so dps running in different namespace can access them)
MINIO_FQDN = f'{os.environ.get("MINIO_SERVICE_HOSTNAME")}.{os.environ.get("CINCO_DE_BIO_NAMESPACE")}.svc.cluster.local'
MINIO_SERVICE_PORT = os.environ.get('MINIO_SERVICE_PORT')
MINIO_PRESIGNED_EXTERNAL_PATH = 'minio-presigned'

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")


def get_minio_client():
    """
    Returns a Minio client object.

    The Minio client is initialized with the provided access key, secret key,
    and connection details.

    Returns:
        Minio: A Minio client object.

    """
    return Minio(
        f"{MINIO_FQDN}:{MINIO_SERVICE_PORT}",
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=False,
    )




def make_external_url(request_base_url: str, presigned_url: str) -> str:
    """
    Constructs an presigned URL for accessing minio outside the cluster by replacing the netloc and path of the presigned URL with the base URL.

    Args:
        request_base_url (str): The base URL to be used as the netloc for the external URL.
        presigned_url (str): The presigned URL to be modified.

    Returns:
        str: The modified external URL.

    """
    # Get the base url
    base_url = urlparse(request_base_url)
    # Get the presigned url
    presigned = urlparse(presigned_url)
    # Needs to use cluster IP and port for cluster ingress (on host machine)
    # + it needs to base path i.e. minio-presigned/
    return presigned._replace(netloc=base_url.netloc, path=f'{MINIO_PRESIGNED_EXTERNAL_PATH}{presigned.path}').geturl()

@app.get("/")
def read_root():
    # This will need to be generated based on the ontology version installed
    return FileResponse('static/index.html')

    

@app.get("/check-prefix")
def check_prefix(prefix: str):
    """
    Check if a prefix exists in a Minio bucket.

    Args:
        prefix (str): The prefix to check.

    Returns:
        bool: True if the prefix does not exist in the bucket, False otherwise.
    """
    client = get_minio_client()

    found = client.bucket_exists(MINIO_EXPERIMENT_BUCKET)
    if not found:
        return True

    # List objects with the prefix (list_objects returns partial matches as well, so we need to check if the object is a directory and the name matches the prefix exactly)
    objects = [c._object_name for c in client.list_objects(MINIO_EXPERIMENT_BUCKET, prefix) if c._object_name == prefix and c.is_dir == True]

    # If the iterator has at least one object, the prefix exists
    try:
        if objects:
            # objects is not empty so prefix exists
            return False
        else:
            return True
        
    except StopIteration:
        return True
    

@app.get("/get-presigned-upload-url")
def presigned_upload_url(prefix: str, object_name: str , content_type: str, request: Request):
    """
    Generates a presigned URL for uploading an object to a Minio bucket.

    Args:
        prefix (str): The prefix for the object name.
        object_name (str): The name of the object to be uploaded.
        content_type (str): The content type of the object.
        request (Request): The HTTP request object.

    Returns:
        str: The presigned URL for uploading the object.
    """
    client = get_minio_client()

    # need to do some validation on the object name (i.e. file extension, etc.)

    logging.warning(f"Creating a presigned URL for PUT operation, {request.base_url}")

    # Make 'asiatrip' bucket if not exist.
    found = client.bucket_exists(MINIO_EXPERIMENT_BUCKET)
    if not found:
        try: 
            client.make_bucket(MINIO_EXPERIMENT_BUCKET)
        except Exception as err:
            logging.warning(err)
    else:
        print("Bucket 'asiatrip' already exists")

    # Generate presigned URL for upload
    url = client.get_presigned_url(
    "PUT",
    MINIO_EXPERIMENT_BUCKET,
    object_name=f'{prefix}/{object_name}',)

    return make_external_url(request.base_url.__str__(),url)


@app.get("/add-tags")
def add_tags(prefix: str, object_name: str, experimental_tag: str, file_tag: str):
    """
    Adds tags to an object in a Minio bucket.

    Args:
        prefix (str): The prefix of the object's path.
        object_name (str): The name of the object.
        experimental_tag (str): The experimental tag to be added.

    Returns:
        dict: A dictionary with a success message.
    """
    client = get_minio_client()

    tags = Tags.new_bucket_tags()
    # This is prefix specific (i.e. all files under the one prefix will share the same value of this)
    tags["cdb_experiment_type"] = experimental_tag
    # this is file specific 
    tags["cdb_file_tag"] = file_tag

    # Add tags to object
    client.set_object_tags(MINIO_EXPERIMENT_BUCKET, f'{prefix}/{object_name}', tags)

    return {"message": "Tags added successfully"}