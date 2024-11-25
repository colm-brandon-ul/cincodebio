from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health_check():
    # perhaps we should do some checks here
    return {"status": "healthy"}

