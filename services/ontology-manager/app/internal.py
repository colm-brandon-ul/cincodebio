from fastapi import APIRouter, HTTPException
from typing import List
from models import FormSchema, ModelSchema
from handlers import handle_form_schema_gen, handle_api_data_model_gen

router = APIRouter()

@router.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}

@router.get("/current-ontology-version")
async def get_current_ontology_version():
    ...

@router.get("/form-models", response_model=FormSchema)
async def root():
    # Get the form models from the ontology manager
    return handle_form_schema_gen()


@router.get("/api-data-models", response_model=List[ModelSchema])
async def get_api_data_models():
    return handle_api_data_model_gen()