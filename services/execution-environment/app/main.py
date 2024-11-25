from fastapi import FastAPI, File, BackgroundTasks
import logging 

from models import Code

"""
    Execution Environment - Receives Code & Runs it
"""
app = FastAPI()

def run_code(code: Code):
    # Receive Code and Run it
    logging.info(f"Executing Workflow: {code.workflow_id}")
    logging.warning(code.code)
    exec(code.code)
    logging.warning(f"Completed Workflow: {code.workflow_id}")
    
@app.post("/", status_code=202)
async def root(code: Code, background_tasks: BackgroundTasks):
    logging.info(f"Received Workflow {code.workflow_id} Code")
    background_tasks.add_task(run_code, code)
    return {"message": "Welcome to the root endpoint of the execution API"}

@app.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}