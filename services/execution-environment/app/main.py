from fastapi.responses import JSONResponse
from models import Code

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

@app.post("/")
async def create_process(code: Code):
    logging.info(f"Received code: {code.workflow_id}")
    try:
        process_id = await manager.start_process_from_code(code.code)
        return JSONResponse(status_code=202, content={"process_id": process_id,'host': os.getenv('HOSTNAME')})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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