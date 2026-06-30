from config import (MINIO_FQDN, MINIO_SERVICE_PORT_MINIO_CONSOLE, 
                    MINIO_WORKFLOW_BUCKET, MINIO_EXPERIMENT_BUCKET)
from utils import (get_minio_client, get_minio_session_token, retrieve_prefix_for_job,
                   stream_file, build_prefix_zip, stream_zip_and_cleanup)

from fastapi import APIRouter, HTTPException
from minio.commonconfig import Tags
from fastapi import BackgroundTasks, Request
from fastapi.responses import StreamingResponse
import base64
import logging

router = APIRouter()

# HANDLING DATA UPLOAD
@router.get("/check-prefix")
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
    objects = [c._object_name for c in client.list_objects(MINIO_EXPERIMENT_BUCKET, prefix) if c._object_name == prefix and c.is_dir is True]

    # If the iterator has at least one object, the prefix exists
    try:
        if objects:
            # objects is not empty so prefix exists
            return False
        else:
            return True
        
    except StopIteration:
        return True
    

@router.get("/get-presigned-upload-url")
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
    client = get_minio_client(internal=False)

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

    return url


@router.get("/add-tags")
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



# HANDLING DATA DOWNLOAD (I.E. RESULTS)
# Using query parameter instead of path parameter
@router.get("/get-job-data-as-zip/{job_id}", response_class=StreamingResponse)
def get_job_as_zip(job_id: str,
                      request: Request,
                      background_tasks: BackgroundTasks):

    # The job's results live under WORKFLOW_ID/YYYY-MM-DD-HH-MM-SS-ROUTING_KEY/ in the workflow bucket.
    prefix = retrieve_prefix_for_job(job_id)

    # If the prefix is None, the job does not exist (or there was an error in the request to the jobs API)
    if prefix is None:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    # Zip every object under the prefix directly via the S3 API (the Console API rejected folder
    # prefixes with "specified key does not exist").
    zip_path = build_prefix_zip(MINIO_WORKFLOW_BUCKET, prefix)
    if zip_path is None:
        raise HTTPException(status_code=404, detail=f"No data found for job {job_id}")

    return StreamingResponse(
        stream_zip_and_cleanup(zip_path),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{job_id}.zip"'})



@router.get("/get-workflow-data-as-zip/{workflow_id}", response_class=StreamingResponse)
def get_wf_as_zip(workflow_id: str,
                      request: Request,
                      background_tasks: BackgroundTasks):

    prefix = f'{workflow_id}/'

    # Zip every object under the workflow prefix directly via the S3 API.
    zip_path = build_prefix_zip(MINIO_WORKFLOW_BUCKET, prefix)
    if zip_path is None:
        raise HTTPException(status_code=404, detail=f"No data found for workflow {workflow_id}")

    return StreamingResponse(
        stream_zip_and_cleanup(zip_path),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{workflow_id}.zip"'})