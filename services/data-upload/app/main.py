from fastapi import FastAPI, WebSocket, File, UploadFile, BackgroundTasks, Request, WebSocketDisconnect, status
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
import requests 
import json
import logging 
import time 
import random
import uuid
import os
from urllib.parse import urlparse

from minio import Minio

from fastapi.encoders import jsonable_encoder

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent

WORKFLOW_LOG_PATH = "data/workflow-logs"
MINIO_HOST = os.environ.get('MINIO_HOST')
MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY')
MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY')
logging.basicConfig(format='%(asctime)s - %(process)d - %(levelname)s - %(message)s', level=logging.WARNING)
"""
    Data Upload Portal:
    
    Front-end for uploading experimental data to Minio
"""

app = FastAPI()
templates = Jinja2Templates(directory=Path(BASE_DIR,"templates"))
# app.mount("/static", StaticFiles(directory="static"), name="static")

# Handles the Ingestion of the Model from the IME
# Returns the URL


@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
  
    
    # Return Status as Accepted and a link to the front-end URL
    return templates.TemplateResponse("index.html",{"request": request})


@app.get('/presignedUrl/{experiment_id}')
async def put_object(experiment_id: str, request: Request):
    client = Minio(
    MINIO_HOST,
    MINIO_ACCESS_KEY,
    MINIO_SECRET_KEY,
    secure=False)
    
    # Try and create the bucket
    try:   
        client.make_bucket(
            'experiment-bucket'
        )
    except Exception as e:
        logging.warning(e)
        
    # Will need to replace docker.host.internal with something else
    def make_external_url(url,target="host.docker.internal",port="8000"):
        parsed_url = urlparse(url)
        # port = re.findall("\S*:([0-9]*)",urlparse(url).netloc)[0]
        return parsed_url._replace(netloc=f"{target}:{port}").geturl()  
        
    url = make_external_url(url=client.presigned_put_object(
        'experiment-bucket',
        f'{experiment_id}/{request.query_params.get("name")}'),
        target='localhost'
    )
    
    logging.warning(url)
    return url
    