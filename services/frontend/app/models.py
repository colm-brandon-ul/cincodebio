from typing import List, Dict, Optional
from pydantic import BaseModel, ConfigDict, Field, RootModel
from dataclasses import dataclass
from typing import List
from datetime import datetime
from datetime import timezone
import uuid

@dataclass
class JWTPayload:
    iss: str
    sub: str
    iat: int
    exp: int
    groups: List[str]
    jti: uuid.UUID

    @property
    def user_id(self) -> str:
        """Get user id"""
        return self.sub
    
    @property
    def is_expired(self) -> bool:
        """Check if token is expired"""
        return datetime.fromtimestamp(self.exp,timezone.utc) < datetime.now(tz=timezone.utc)
    
    @property
    def issued_at(self) -> datetime:
        """Get token issue time"""
        return datetime.fromtimestamp(self.iat,timezone.utc)
    
    @property
    def expires_at(self) -> datetime:
        """Get token expiration time"""
        return datetime.fromtimestamp(self.exp,timezone.utc)
    
    def has_group(self, group: str) -> bool:
        """Check if user belongs to group"""
        return group in self.groups


class FileDetails(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    file_extensions: List[str] = Field(..., description="List of file extensions")
    type: str = Field(..., description="File type")

class File(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    files: List[FileDetails] = Field(..., description="List of file details")
    name: str = Field(..., description="Name of the configuration item")

class FormSchema(RootModel):
    model_config = ConfigDict(from_attributes=True)
    root: Dict[str, List[File]]

    def __getitem__(self, key):
        return self.root[key]
    

class TokenValidationRequest(BaseModel):
    token: str

class TokenValidationResponse(BaseModel):
    valid: bool
    payload: Optional[dict] = None
    error: Optional[str] = None