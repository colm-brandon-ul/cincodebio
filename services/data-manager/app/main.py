from fastapi import FastAPI, Request
from fastapi.responses import FileResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
from minio import Minio
from minio.commonconfig import Tags
import logging, os


from urllib.parse import urlparse

app = FastAPI()
app.mount("/static", StaticFiles(directory="static"), name="static")

# to be populated - do I want a seperate namespace for jobs?
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY')
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY')
MINIO_WORKFLOW_BUCKET = os.environ.get('MINIO_WORKFLOW_BUCKET')
MINIO_EXPERIMENT_BUCKET = os.environ.get('MINIO_EXPERIMENT_BUCKET')

# Create the FQDN for the minio and jobs-api services (so dps running in different namespace can access them)
MINIO_FQDN = f'{os.environ.get("MINIO_SERVICE_HOSTNAME")}.{os.environ.get("CINCO_DE_BIO_NAMESPACE")}.svc.cluster.local'
MINIO_SERVICE_PORT = os.environ.get('MINIO_SERVICE_PORT')
MINIO_PRESIGNED_EXTERNAL_PATH = 'minio-presigned'

TEMP_MIN_CRED = "Q3AM3UQ867SPQQA43P2F"
TEMP_MIN_PASS = 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG'
TEST_BUCKET = "cdbtest"


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

    # return Minio(
    #     "play.min.io",
    #     access_key=TEMP_MIN_CRED,
    #     secret_key=TEMP_MIN_PASS,
    #     secure=True,
    # )

# def get_external_url(self) -> str:
#         target = _os.environ.get('REVERSE-PROXY-HOST')
#         port = _os.environ.get('REVERSE-PROXY-PORT')
#         parsed_url = _urlparse(self.url)
#         return parsed_url._replace(netloc=f"{target}:{port}").geturl()

def make_external_url(request_base_url: str, presigned_url: str) -> str:
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

    found = client.bucket_exists(TEST_BUCKET)
    if not found:
        return True

    # List objects with the prefix (list_objects returns partial matches as well, so we need to check if the object is a directory and the name matches the prefix exactly)
    objects = [c._object_name for c in client.list_objects(TEST_BUCKET, prefix) if c._object_name == prefix and c.is_dir == True]

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
    found = client.bucket_exists(TEST_BUCKET)
    if not found:
        try: 
            client.make_bucket(TEST_BUCKET)
        except Exception as err:
            logging.warning(err)
    else:
        print("Bucket 'asiatrip' already exists")

    # Generate presigned URL for upload
    url = client.get_presigned_url(
    "PUT",
    TEST_BUCKET,
    object_name=f'{prefix}/{object_name}',)

    return make_external_url(request.base_url.__str__(),url)


@app.get("/add-tags")
def add_tags(prefix: str, object_name: str, experimental_tag: str):
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
    tags["cdb_experiment_type"] = experimental_tag

    # Add tags to object
    client.set_object_tags(TEST_BUCKET, f'{prefix}/{object_name}', tags)

    return {"message": "Tags added successfully"}