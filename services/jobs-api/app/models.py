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


class JobStatus(str, Enum):
    submitted = 'submitted'
    accepted = 'accepted'
    awaiting_interaction = 'awaiting_interaction'
    interaction_accepted = 'interaction_accepted'
    processing = 'processing'
    completed = 'completed'
    failed = "failed"

# Perhaps need to add timestamps for createdAt / updatedAt?

class JobState(BaseModel):
    id: PyObjectId = Field(alias="_id")
    workflow: str
    service_name : str # service name
    job_status: JobStatus
    data: typing.Optional[dict]
    frontend: typing.Optional[str]
    url: typing.Optional[str]
    root_prefix: typing.Optional[str]

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {ObjectId: str}


class UpdateJobState(BaseModel):
    job_status: JobStatus
    data: typing.Optional[dict]
    frontend: typing.Optional[str]
    url: typing.Optional[str]
    root_prefix: typing.Optional[str]

class CreateJobState(BaseModel):
    workflow: str
    service_name : str # service name
    job_status: JobStatus = Field(default=JobStatus.submitted)


