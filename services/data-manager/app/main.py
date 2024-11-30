
from config import BASE_DIR
from external import router as external_router
from internal import router as internal_router

from pathlib import Path
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from jinja2 import Environment, FileSystemLoader


# For creating a zip file

app = FastAPI()
env = Environment(loader=FileSystemLoader(Path(BASE_DIR,"templates")))
app.mount("/static", StaticFiles(directory=Path(BASE_DIR,"static")), name="static")
app.include_router(internal_router, prefix="")
app.include_router(external_router, prefix="/ext")




    