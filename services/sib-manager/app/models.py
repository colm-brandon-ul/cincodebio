from enum import Enum
from typing import Dict, List
from pydantic import BaseModel

# Enums are returned as literal string (i.e. including quotes)
class HashValid(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"

class CheckSibFileHashRequest(BaseModel):
    fileHash: str

class CheckSibFilesHashesRequest(BaseModel):
    fileHashes : Dict[str,str]

class CheckSibFilesHashesResponse(BaseModel):
    hashesValid: Dict[str,HashValid]
    
class UtdSibFileResponse(BaseModel):
    file: str

class UtdSibFilesRequest(BaseModel):
    file_ids: List[str]

class UtdSibFilesResponse(BaseModel):
    files: Dict[str, str]