from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from jinja2 import Environment, FileSystemLoader
from minio import Minio
from minio.commonconfig import Tags
import logging

app = FastAPI()

TEMP_MIN_CRED = "Q3AM3UQ867SPQQA43P2F"
TEMP_MIN_PASS = 'zuf+tfteSlswRu7BJ86wekitnifILbZam1KYY3TG'
TEST_BUCKET = "cdbtest"

@app.get("/")
def read_root():
    # This will need to be generated based on the ontology version installed
    with open("static/index.html") as f:
        content = f.read()
    return HTMLResponse(content=content)

    

@app.get("/check-prefix")
def check_prefix(prefix: str):
    """
    Check if a prefix exists in a Minio bucket.

    Args:
        prefix (str): The prefix to check.

    Returns:
        bool: True if the prefix does not exist in the bucket, False otherwise.
    """
    client = Minio(
        "play.min.io",
        access_key=TEMP_MIN_CRED,
        secret_key=TEMP_MIN_PASS,
        secure=True,
    )

    found = client.bucket_exists(TEST_BUCKET)
    if not found:
        return True

    objects = client.list_objects(TEST_BUCKET, prefix)

    # If the iterator has at least one object, the prefix exists
    try:
        next(objects)
        return False
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
    client = Minio(
        "play.min.io",
        access_key=TEMP_MIN_CRED,
        secret_key=TEMP_MIN_PASS,
        secure=True,
    )

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

    return url


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
    client = Minio(
        "play.min.io",
        access_key=TEMP_MIN_CRED,
        secret_key=TEMP_MIN_PASS,
        secure=True,
    )
    tags = Tags.new_bucket_tags()
    tags["cdb_experiment_type"] = experimental_tag

    # Add tags to object
    client.set_object_tags(TEST_BUCKET, f'{prefix}/{object_name}', tags)

    return {"message": "Tags added successfully"}