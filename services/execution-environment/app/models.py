from pydantic import BaseModel
from typing import Optional

# FastAPI Models
class ProcessResponse(BaseModel):
    process_id: str

class ProcessStatus(BaseModel):
    pid: int
    running: bool
    returncode: Optional[int]
    stderr: Optional[str]
    stdout: Optional[str]


class Code(BaseModel):
    code: str
    workflow_id: str


class ProcessResponse(BaseModel):
    process_id: str
    host: Optional[str]