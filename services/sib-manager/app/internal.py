from fastapi import APIRouter, Request
from pathlib import Path
from config import PERSISTENT_STATE_MOUNT_PATH, SIB_MAP_FILE
import json
from config import LATEST_SIBS, INSTALLED_SIBS, OTHER_SIBS

router = APIRouter()

# ALL KEYS MUST BE STRINGS
# for use with the IME, it will compare the hash of the sib file
# with the hash of the up to date sib file stored in the SIB Manager

@router.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}
    
# --- ENDPOINTS FOR THE Workflow Code Gen ---
@router.get("/get-sib-map")
def get_sib_map(request: Request):
    state_path = Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / SIB_MAP_FILE, "r") as f:
        return json.loads(f.read())
    

# This is the front end for the SIB Manager
@router.get("/sib-manager-state")
def sib_manager(request: Request):

    state_path = Path(PERSISTENT_STATE_MOUNT_PATH)


    with open(state_path / LATEST_SIBS ) as f:
        latest_sibs = json.load(f)

    with open(state_path / INSTALLED_SIBS ) as f:
        installed_sibs = json.load(f)
    
    with open(state_path / OTHER_SIBS ) as f:
        other_sibs = json.load(f)
    
    # get the sib names 
    latest = [sib['cincodebio.schema']['service_name'] for sib in latest_sibs if sib] 
    rest = [sib['cincodebio.schema']['service_name'] for sib in other_sibs if sib]
    installed = [sib['cincodebio.schema']['service_name'] for sib in installed_sibs if sib]

    # sort the lists so they are displayed in a alphabetical order
    latest.sort(),rest.sort(),installed.sort()

    return {
        "latest": latest,
        "installed": installed,
        "rest": rest
    }