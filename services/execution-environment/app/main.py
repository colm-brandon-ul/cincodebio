from fastapi.responses import JSONResponse
from models import Code, ProcessResponse

from fastapi import FastAPI
from fastapi.exceptions import HTTPException
import logging 
from process import ProcessManager
import os

"""
    Execution Environment - Receives Code & Runs it
"""
app = FastAPI()
manager = ProcessManager()


@app.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}



@app.post("/", response_model=ProcessResponse, status_code=202)
async def create_process(code: Code) -> ProcessResponse:
    """
    Create a new process from provided code.
    
    Args:
        code: Code object containing workflow_id and code to execute
    
    Returns:
        ProcessResponse with process_id and host information
    
    Raises:
        HTTPException: If process creation fails
    """
    logging.warning(f"Received code for workflow: {code.workflow_id}")
    try:
        # Validate code before execution
        if not code.code.strip():
            raise ValueError("Empty code provided")
            
        process_id = await manager.start_process_from_code(code.code)

        return ProcessResponse(
            process_id=process_id,
            host=os.getenv('HOSTNAME')
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        logging.exception("Process creation failed")
        raise HTTPException(status_code=500, detail=f"Process creation failed: {str(e)}")

@app.get("/process/{process_id}")
async def get_process(process_id: str):
    return await manager.get_process_status(process_id)

@app.delete("/process/{process_id}")
async def delete_process(process_id: str):
    success = await manager.stop_process(process_id)
    return {"success": success}

# @app.get("/process/{process_id}/memory")
# async def get_process_memory(process_id: str):
#     return await manager.get_process_memory(process_id)

@app.post("/callback/{process_id}/{job_id}")
async def callback(process_id: str, job_id: str):
    await manager.job_callback(process_id, job_id)
    return {"process_id": process_id, "job_id": job_id}