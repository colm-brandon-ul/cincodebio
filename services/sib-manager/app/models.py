from enum import Enum
from pydantic import BaseModel

# Enums are returned as literal string (i.e. including quotes)
class HashValid(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"


class CheckSibFileHashRequest(BaseModel):
    fileHash: str
    
class UtdSibFileResponse(BaseModel):
    file: str