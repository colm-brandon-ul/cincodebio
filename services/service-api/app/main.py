from fastapi import FastAPI, WebSocket, File, UploadFile, BackgroundTasks, Request
from fastapi.responses import HTMLResponse
import requests 
import json
import logging 
import os

from .k8sjobs import submit_k8s_job
from .models import *

app = FastAPI()
JMS_ADDRESS = f"{os.environ.get('JOBS_API_SERVICE_HOST')}:{os.environ.get('JOBS_API_SERVICE_PORT')}" # jobsapi


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "unhealthy"}
