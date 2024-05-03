from pydantic import BaseModel, Field, EmailStr
import typing 
from enum import Enum
from bson import ObjectId


class PyObjectId(ObjectId):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid objectid")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class WorkflowStatus(str, Enum):
    submitted = 'submitted'
    accepted = 'accepted'
    processing = 'processing'
    completed = 'completed'
    aborted = 'aborted'
    failed = 'failed'

class JobStatus(str, Enum):
    submitted = 'submitted'
    accepted = 'accepted'
    awaiting_interaction = 'awaiting_interaction'
    interaction_accepted = 'interaction_accepted'
    processing = 'processing'
    completed = 'completed'
    failed = "failed"

class JobState(BaseModel):
    id: PyObjectId = Field(alias="_id")
    workflow: str
    job_status: JobStatus
    service_name : str # service name
    data: typing.Optional[dict]
    frontend: typing.Optional[str]
    url: typing.Optional[str]

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class WorkflowState(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner: str = "public"
    status: WorkflowStatus

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}

class Workflow(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    owner: str = "public"
    status: WorkflowStatus
    state: typing.List[JobState]
    
    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}
        
class UpdateWorkflow(BaseModel):
    owner: typing.Optional[str]
    status: typing.Optional[WorkflowStatus]
    state: typing.Optional[typing.List[JobState]]
    
    