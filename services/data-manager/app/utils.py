from config import (JMS_ADDRESS, MINIO_FQDN, MINIO_SERVICE_PORT_MINIO_CONSOLE, MINIO_ACCESS_KEY, 
                    MINIO_SECRET_KEY, MINIO_SERVICE_PORT, MINIO_PRESIGNED_EXTERNAL_PATH)

import requests
import json
import httpx
from urllib.parse import urlparse
from minio import Minio



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



def get_minio_session_token() -> requests.cookies.RequestsCookieJar:
    """
    Retrieves a session token from the Minio Console API.

    Returns:
        str: The session token.

    """
    # Set the URL for the POST request
    url = f'http://{MINIO_FQDN}:{MINIO_SERVICE_PORT_MINIO_CONSOLE}/api/v1/login'


    # Set the request headers
    headers = {'Content-Type': 'application/json'}

    # Create the JSON body
    body = json.dumps({
        'accessKey': MINIO_ACCESS_KEY,
        'secretKey': MINIO_SECRET_KEY
    }).encode('utf-8')

    # Set the request headers
    headers = {'Content-Type': 'application/json'}

    # Make the POST request with authentication
    response = requests.post(url, headers=headers, data=body)

    return response.cookies

def retrieve_prefix_for_job(job_id: str) -> str:

    # Retrieve the Job State Object for the job_id from the jobs API

    # Set the URL for the GET request

    url = f'http://{JMS_ADDRESS}/get-job-by-id/{job_id}'

    # Make the GET request
    response = requests.get(url)

    # If the request is successful, return the prefix
    if response.status_code == 200:
        # Return the root prefix from the job state object (workflow_id/TIME-STAMP-ROUTING_KEY/)
        return response.json()['root_prefix']
    else:
        return None


# Function that streams the file from the Minio Console API
async def stream_file(url: str, cookies: requests.cookies.RequestsCookieJar):
    async with httpx.AsyncClient(cookies=cookies) as client:
        async with client.stream("GET", url) as response:
            async for chunk in response.aiter_bytes():
                yield chunk