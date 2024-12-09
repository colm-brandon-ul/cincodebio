from fastapi import APIRouter
from models import JobState, JobStatus, UpdateWorkflow, Workflow, WorkflowStatus
from handlers import (add_job_state_to_workflow_in_db, get_workflow_from_db_by_id, inform_execution_env, update_job_status_in_workflow_in_db, 
                      update_workflow_in_db)
import logging

router = APIRouter()

@router.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}


# Handles the Callbacks from the Job Management Service
# Needs to be indepotent (possibly?)
@router.post("/control/callback/{workflow_id}")
async def handles_callbacks(workflow_id: str, job: JobState):
    logging.warning(f'JOB STATE SENT: {job}')

    if job.job_status == JobStatus.completed:
        # Happens in the case of an automated or interactive job being executed to completion
        # Update the Database with the new State
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)
        # Update log with Job ID maybe?
        inform_execution_env(
            workflow_id=workflow_id,
            job=job
        )

        
    elif job.job_status == JobStatus.awaiting_interaction:
        pass
        # Happens in the case of an where the front end is available for the user to perform their interaction
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)
        # Update the Database with the new State (so that URL to front is presented to the user)
    
    # Callback from the execution environment to update the workflow object id 
    elif job.job_status == JobStatus.submitted:
        logging.warning(f'Job {job.id}, has been submitted')
        add_job_state_to_workflow_in_db(workflow_id=workflow_id,job_state=job)

    # Callbacks from the JMS
    elif job.job_status == JobStatus.accepted: 
        logging.warning(f'Job {job.id}, has been accepted')
        logging.warning(job)
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)

     # Callbacks from the JMS
    elif job.job_status == JobStatus.interaction_accepted: 
        logging.warning(f'Job {job.id}, has been accepted')
        logging.warning(job)
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)

    # Callbacks from the JMS, Occurs when the data processing service reads the job off the queue
    elif job.job_status == JobStatus.processing:
        logging.warning(f'Job {job.id}, has started processing')
        logging.warning(job)
        update_job_status_in_workflow_in_db(workflow_id=workflow_id, job_state=job)
    
    # Callbacks from the JMS - if job failed, need to figure this one out
    elif job.job_status == JobStatus.failed:
        logging.warning(f'Job {job.id}, has failed')
        # Update the Database with the new Job State
        update_job_status_in_workflow_in_db(
            workflow_id=workflow_id, 
            job_state=job)
        # Update the Workflow State to Failed
        workflow_update = UpdateWorkflow(status=WorkflowStatus.failed)
        update_workflow_in_db(
        workflow_id=workflow_id,
        workflow=workflow_update)
        # Inform the Execution Environment to kill the workflow
        inform_execution_env(
            workflow_id=workflow_id,
            job='KWORKFLOW'
        )
        
@router.post("/control/update-workflow/{workflow_id}")
async def update_workflow_state(workflow_id: str, workflow_update: UpdateWorkflow):
    update_workflow_in_db(
        workflow_id=workflow_id,
        workflow=workflow_update)
    
@router.get("/get-worfklow/{workflow_id}", response_model=Workflow)
async def get_workflow_by_id(workflow_id: str):
    workflow_state = get_workflow_from_db_by_id(workflow_id)
    return Workflow(**workflow_state)