from pathlib import Path
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
import logging, os

from urllib.parse import urlparse

# For creating a zip file
import tempfile
import zipfile

import requests
import requests.cookies

from config import SIB_MANAGER_API_INGRESS, EXECUTION_API_INGRESS, DATA_MANAGER_API_INGRESS, BASE_DIR

from external import router as external_router
from internal import router as internal_router

app = FastAPI()
env = Environment(loader=FileSystemLoader(Path(BASE_DIR,"templates")))
app.mount("/static", StaticFiles(directory=Path(BASE_DIR,"static")), name="static")
app.include_router(internal_router, prefix="")
app.include_router(external_router, prefix="/ext")




    