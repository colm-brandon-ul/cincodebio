from fastapi import APIRouter

router = APIRouter()

@router.post('/add-ontology', response_model=None)
async def add_ontology(ontology_url: str):
    ...

@router.post('/set-ontology', response_model=None)
async def set_ontology(ontology_url: str):
    
    # needs to inform the sib-manager
    # needs to inform the data-manager
    ...