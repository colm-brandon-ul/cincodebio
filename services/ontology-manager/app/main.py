from models import OntologyState
from handlers import parse_new_ontology, check_if_local_state_exists, make_state_dir
from config import DEFAULT_ONTOLOGY_URL, ONTOLOGY_STATE_FILE, PERSISTENT_STATE_MOUNT_PATH
from internal import router as internal_router
from external import router as external_router

from fastapi import FastAPI
import logging


# For creating a zip file
app = FastAPI()
app.include_router(internal_router,prefix="")
app.include_router(external_router,prefix="/ext")


@app.on_event("startup")
async def startup_event():
    if not check_if_local_state_exists():
        logging.info("No local state found. Parsing new ontology.")
        make_state_dir()
        ontology_version = parse_new_ontology(DEFAULT_ONTOLOGY_URL)
        ont_state = OntologyState(
            current_ontology=ontology_version,
            other_ontologies=[]
        )
        ont_state.save(PERSISTENT_STATE_MOUNT_PATH / ONTOLOGY_STATE_FILE)


    else:
        logging.info("Local state found. Loading ontology state.")



