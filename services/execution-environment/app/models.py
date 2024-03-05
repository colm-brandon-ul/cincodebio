from pydantic import BaseModel

class Code(BaseModel):
    code: str
    workflow_id: str