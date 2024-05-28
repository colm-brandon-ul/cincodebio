# Job Management Imports
from typing import List
from fastapi import BackgroundTasks, FastAPI, HTTPException, Request, WebSocket
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.encoders import jsonable_encoder


from .models import JobState,JobStatus, CreateJobState, UpdateJobState
import uuid

import requests 
import json
import logging 
import time 
import os

import pymongo
from bson.objectid import ObjectId

# Service Discovery ENV variables
EXECUTION_ADDRESS = f"{os.environ.get('EXECUTION_API_SERVICE_HOST')}:{os.environ.get('EXECUTION_API_SERVICE_PORT')}" # jobsapi
MONGODB_HOST = os.environ.get("MONGODB_SERVICE_HOST")
MONGODB_PORT = os.environ.get("MONGODB_SERVICE_PORT")
# Database Table and Collection ENV variables
JOBS_DB = os.environ.get('JOBS_DB')
JOBS_COLLECTION = os.environ.get('JOBS_COLLECTION')

app = FastAPI()
mdbclient = pymongo.MongoClient(MONGODB_HOST, int(MONGODB_PORT),minPoolSize=0, maxPoolSize=200)


# Callback to execution API after create and update events
def callback_to_execution(job_state: JobState):
    logging.warning(f'Calling back with: {job_state.json()}')
    # Call to Jobs API to update to Processing
    # logging.warning(f' JOB STATE {job_state.json()}')
    requests.post(f"http://{EXECUTION_ADDRESS}/control/callback/{job_state.workflow}", json=json.loads(job_state.json()))

# CREATE A JOB
@app.post('/create-job/', response_model=JobState,response_model_by_alias=False, response_model_exclude_none=True)
async def create_job(job: CreateJobState, background_tasks: BackgroundTasks, request: Request):
    # Get DB Table
    db = mdbclient[JOBS_DB]
    db_col = db[JOBS_COLLECTION]
    # Insert Job in DB
    result = db_col.insert_one(jsonable_encoder(job))
    logging.warning('JOB STATE OBJECT')
    logging.warning(db_col.find_one(result.inserted_id))
    js = JobState.parse_obj(db_col.find_one(result.inserted_id))
    # Callback to Execution API to inform it of the job creation
    background_tasks.add_task(callback_to_execution, job_state = js)
    # Return Job Object
    return js

# UPDATE A JOB
@app.put('/update-job/{id}', response_model=JobState,response_model_by_alias=False)
async def update_job(id: str, job: UpdateJobState, background_tasks: BackgroundTasks, request: Request):
    # Get DB Table
    db = mdbclient[JOBS_DB]
    db_col = db[JOBS_COLLECTION]


    # Remove updates which are None
    job = {k: v for k, v in job.dict().items() if v is not None}

    # Check if there is one or more updates to make
    if len(job) >= 1:

        update_result =  db_col.update_one(
            {"_id": ObjectId(id)}, {"$set": job}
        )


        if update_result.modified_count == 1:
            if (
                updated_job := db_col.find_one({"_id": ObjectId(id)})
            ) is not None:
                
                js = JobState.parse_obj(updated_job)
                # Callback to execution with Job State
                background_tasks.add_task(callback_to_execution, job_state = js)

                # Return Job State
                return js
            
    # If not changed
    if (existing_job := db_col.find_one({"_id": ObjectId(id)})) is not None:
        return JobState.parse_obj(existing_job)
    
    # If no job to update found, return exception
    raise HTTPException(status_code=404, detail=f"Job {id} not found")


# GET JOB(S)
@app.get('/get-job-by-id/{id}', response_model=JobState)
async def get_job_by_id(id: str):
    # Get DB Table
    db = mdbclient[JOBS_DB]
    db_col = db[JOBS_COLLECTION]
    
    if (job := db_col.find_one({"_id": ObjectId(id)})) is not None:
        return JobState.parse_obj(job)

    raise HTTPException(status_code=404, detail=f"Job {id} not found")

@app.get('/get-jobs-by-workflow-id/{workflow_id}', response_model=List[JobState])
async def get_jobs_by_workflow_id(workflow_id: str):
    # Get DB Table
    db = mdbclient[JOBS_DB]
    db_col = db[JOBS_COLLECTION]

    # query objects by workflow id 
    cursor = db_col.find({'workflow': workflow_id})
    jobs = [JobState.parse_obj(doc) for doc in cursor]

    # check if more than 1 job is returned, if so return list, else return 404 exception
    if len(jobs) > 0:
        return jobs 
    
    raise HTTPException(status_code=404, detail=f"No Jobs for workflow {workflow_id}")
    


# DELETE JOB
@app.delete('/delete-job-by-id/{id}')
async def delete_job_by_id(id: str):
    # Get DB Table
    db = mdbclient[JOBS_DB]
    db_col = db[JOBS_COLLECTION]

    # Delete Job
    result = db_col.delete_one({"_id": id})

    # Return Successful response state content has been delete
    if result.deleted_count == 1:
        return JSONResponse(status_code=204)
    
    
    raise HTTPException(status_code=404, detail=f"Job {id} not found")

