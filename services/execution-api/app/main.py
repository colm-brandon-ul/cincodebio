from config import (BASE_DIR)
from internal import router as internal_router
from external import router as external_router

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader
import logging 
from pathlib import Path





logging.basicConfig(format='%(asctime)s - %(process)d - %(levelname)s - %(message)s', level=logging.WARNING)
"""
    Execution API:
    - Ingest modelled workflows from the IME
    - Dispatch those models to the code generator
    - Handle Callbacks from JMS
        - Based on those callbacks communicate in some manner with the Execution Runtimes (based on ID)
    - Communicate Workflow State to Execution Front end via Websocket
    - API for returning all workflows
"""

app = FastAPI()
env = Environment(loader=FileSystemLoader(Path(BASE_DIR,"templates")))
app.mount("/static", StaticFiles(directory=Path(BASE_DIR,"static")), name="static")
app.include_router(internal_router,prefix="")
app.include_router(external_router,prefix="/ext")

# Handles the Ingestion of the Model from the IME
# Returns the URL

@app.on_event("startup")
async def startup_event():
    # If this fails the application should not start
    ...