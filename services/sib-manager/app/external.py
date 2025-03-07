from config import (PERSISTENT_STATE_MOUNT_PATH, UTD_SIB_FILE, 
                    INSTALLED_SIBS, OTHER_SIBS, CINCO_CLOUD_SIBS_PATH, SIB_FILE_EXTENSION)
from models import (CheckSibFileHashRequest, CheckSibFilesHashesRequest,HashValid, CheckSibFilesHashesResponse,UtdSibFileResponse, UtdSibFilesRequest, UtdSibFilesResponse)
import handlers
from cinco_interface import compute_local_hash, convert_newlines, check_if_windows

from fastapi import APIRouter
from fastapi.requests import Request
from fastapi import BackgroundTasks
from typing import List
import pathlib
import json
import logging

router = APIRouter()

# --- ENDPOINTS FOR THE ECLIPSE BASED IME ---
# deprecated - was used for eclipse based IME
@router.post("/check-sib-file-hash", response_model=HashValid)
async def check_sib_file_hash(body: CheckSibFileHashRequest):
    local_hash, local_hash_nl = compute_local_hash()
    logging.info(f"Local hash: {local_hash}, {local_hash_nl}")
    logging.info(f"File hash received: {body}")
    # if hash is equal to nither, it's incorrect
    if body.fileHash != local_hash and body.fileHash != local_hash_nl: 
        return HashValid.INVALID
    return HashValid.VALID

@router.post("/check-sib-files-hashes", response_model=CheckSibFilesHashesResponse)
async def check_sib_file_hashes(body: CheckSibFilesHashesRequest):
    # need to have a db which stores the hashes of the sib files
    state_path = pathlib.Path(CINCO_CLOUD_SIBS_PATH)
    sib_files = list(state_path.glob(SIB_FILE_EXTENSION))

    hash_valid = {}

    for file,file_hash in body.fileHashes.items():
        if file not in sib_files:
            hash_valid[file] = HashValid.INVALID
        else:
            local_hash, local_hash_nl = compute_local_hash(file,v2=True)
            logging.info(f"Local hash: {local_hash}, {local_hash_nl}")
            logging.info(f"File hash received: {body}")
            # if hash is equal to nither, it's incorrect
            if file_hash != local_hash and file_hash != local_hash_nl: 
                hash_valid[file] = HashValid.INVALID
            else:
                hash_valid[file] = HashValid.VALID
                
    return CheckSibFilesHashesResponse(
                hashesValid=hash_valid
            )

# --- ENDPOINTS FOR THE UTD SIB FILES ---
# deprecated - was used for eclipse based IME
@router.get("/get-utd-sib-file", response_model=UtdSibFilesResponse)
def get_utd_sib_file(request: Request):
    user_agent = request.headers.get('User-Agent', '')
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    logging.info(f"User-Agent: {user_agent}")
    
    # check if user is using Windows (then convert newlines to CRLF)
    if check_if_windows(user_agent):
        return UtdSibFileResponse(
                file=convert_newlines(state_path / UTD_SIB_FILE)
            )
            
    with open(state_path / UTD_SIB_FILE , 'r') as f:
        return UtdSibFileResponse(
                file=f.read()
            )
    
@router.post("/get-missing-sib-files", response_model=UtdSibFilesResponse)
def get_missing_sib_files(body: UtdSibFilesRequest,request: Request):
    files = {}
    state_path = pathlib.Path(CINCO_CLOUD_SIBS_PATH)
    sib_files = list(state_path.glob(SIB_FILE_EXTENSION))
    for fid in sib_files:
        if fid.name in body.file_ids:
            ...
        else: 
            with open(fid , 'r') as f:
                files[fid.name]=(f.read())
       
    return UtdSibFilesResponse(
                files=files
            )

@router.post("/get-utd-sib-files", response_model=UtdSibFilesResponse)
def get_utd_sib_files(body: UtdSibFilesRequest,request: Request):
    files = {}
    state_path = pathlib.Path(CINCO_CLOUD_SIBS_PATH)
    sib_files = [f.name for f in list(state_path.glob(SIB_FILE_EXTENSION))]
    for fid in body.file_ids:
        if fid not in sib_files:
            ...
        else: 
            with open(state_path / fid , 'r') as f:
                files[fid.name]=(f.read())
       
    return UtdSibFilesResponse(
                files=files
            )

# --- ENDPOINTS FOR THE SIB Manager --
@router.get("/sync-sibs-with-registry")
def sync_sibs_with_registry():
    # get the latest sibs from the registry (and overwrite the local state)

    pass


@router.get("/get-installed-sibs")
def get_installed_sibs():
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / INSTALLED_SIBS, "r") as f:
        return json.loads(f.read())
    

@router.get("/get-uninstalled-sibs")
def get_uninstalled_sibs():
    # set of sibs that are not installed but are available
    # compare latest and installed
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / OTHER_SIBS, "r") as f:
        return json.loads(f.read())
    
# external 
@router.post("/update-installed-sibs")
def update_installed_sibs(body: List, request: Request, background_task: BackgroundTasks):

    # this shoudl check if there are any changes, if there aren't do nothing

    # get the list of sibs to be installed from the request body
    tbi_sib_list = handlers.resolve_to_be_installed_sibs(body)


    if handlers.update_service_api_and_sibs(tbi_sib_list):
        return {"status": "success"}, 200
    else:
        return {"status": "failure"}, 500