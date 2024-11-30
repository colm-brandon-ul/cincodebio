from typing import List, Dict
from pydantic import BaseModel, ConfigDict, Field, RootModel

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
    
