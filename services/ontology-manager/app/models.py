from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, ConfigDict, Field, RootModel
from utils import Serializable

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
    

class SchemaType(str, Enum):
    CLASS_WITH_ATTRIBUTES = "ClassWithAttributes"
    PRIMITIVE = "Primitive"
    DATA_STRUCTURE = "DataStructure"
    ATOMIC_FILE = "AtomicFile"

class AttributeModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    attributeName: str
    type: str

class ModelSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    name: str
    type: SchemaType
    docs: Optional[Any] = None
    primitiveType: Optional[str] = None
    inheritance: Optional[str] = None
    typeParameters: Optional[List[str]] = None
    attributes: Optional[List[AttributeModel]] = None



class OntologyState(Serializable):
    def __init__(self, current_ontology: str, other_ontologies: List[str]):
        self.current_ontology = current_ontology
        self.other_ontologies = other_ontologies

    def get_current_ontology_version(self) -> str:
        return self.current_ontology

    def get_other_ontologies(self) -> List[str]:
        return self.other_ontologies
    
    def get_all_ontologies(self) -> List[str]:
        return [self.current_ontology] + self.other_ontologies
