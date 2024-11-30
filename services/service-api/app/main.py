from .models import *

from fastapi import FastAPI
import os

app = FastAPI()
JMS_ADDRESS = f"{os.environ.get('JOBS_API_SERVICE_HOST')}:{os.environ.get('JOBS_API_SERVICE_PORT')}" # jobsapi


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "unhealthy"}
