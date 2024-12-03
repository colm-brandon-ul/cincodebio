from fastapi import FastAPI, Security, Depends, HTTPException, status
from fastapi.security import APIKeyHeader, HTTPAuthorizationCredentials, HTTPBearer
from datetime import datetime, timedelta
from pydantic import BaseModel
import jwt

# Configuration 
SECRET_KEY = "your-secret-key"  # In production, use a strong, environment-sourced secret
ALGORITHM = "HS256"
API_KEY = "sample_api_key_123"  # Replace with a secure API key in production
TOKEN_EXPIRE_MINUTES = 30

app = FastAPI(title="Authentication Demo")

# API Key Authentication Dependency
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

# JWT Bearer Token Authentication
jwt_bearer = HTTPBearer()

def validate_api_key(api_key: str = Security(api_key_header)):
    if api_key != API_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="Could not validate API Key"
        )
    return api_key

# JWT Token Generation
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

# Request Model for Token
class TokenRequest(BaseModel):
    username: str

# Routes
@app.post("/get-token")
async def get_token(
    token_request: TokenRequest, 
    _: str = Depends(validate_api_key)
):
    """
    Generate a JWT token after validating API Key
    Requires valid API Key in X-API-Key header
    """
    access_token = create_access_token(
        data={"sub": token_request.username}
    )
    return {
        "access_token": access_token, 
        "token_type": "bearer"
    }

@app.get("/protected-route")
async def protected_route(credentials: HTTPAuthorizationCredentials = Depends(jwt_bearer)):
    """
    A protected route that validates the JWT token
    Expects Authorization: Bearer <token> header
    """
    token = credentials.credentials
    try:
        # Decode and validate token
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
        
        return {"message": f"Hello {username}, you have access!"}
    
    except jwt.JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )

# Requirements for running this app:
# pip install fastapi python-jose[cryptography] python-multipart