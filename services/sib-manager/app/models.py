from enum import Enum
from typing import List
from pydantic import BaseModel

# Enums are returned as literal string (i.e. including quotes)
class HashValid(str, Enum):
    VALID = "VALID"
    INVALID = "INVALID"

class CheckSibFileHashRequest(BaseModel):
    fileHash: str

class CheckSibFilesHashesRequest(BaseModel):
    fileHashes : List[str]

class CheckSibFilesHashesResponse(BaseModel):
    hashesValid: List[HashValid]
    
class UtdSibFileResponse(BaseModel):
    file: str

class UtdSibFilesRequest(BaseModel):
    file_ids: List[str]

class UtdSibFilesResponse(BaseModel):
    files: List[str]