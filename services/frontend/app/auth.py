# from fastapi import FastAPI, Request
# from fastapi.responses import RedirectResponse

import logging
from typing import Optional
from fastapi import Depends, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from fastapi import status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from models import JWTPayload, TokenValidationRequest, TokenValidationResponse


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
security = HTTPBearer()

async def get_current_user(token: str = Depends(oauth2_scheme)):
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated"
        )
    payload = decode_token(token)
    return payload
    

def decode_token(token: str):
    from config import AUTH_PUBLIC_KEY as PUBLIC_KEY
    logging.warning(PUBLIC_KEY)
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=['RS256'])
        return payload
    except jwt.PyJWTError as e:
        logging.warning(e)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}"
        )
    except jwt.InvalidSignatureError as eise:
        logging.warning(eise)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token signature: {eise}"
        )
    except jwt.ExpiredSignatureError as eese:
        logging.warning(eese)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token has expired: {eese}"
        )
    except jwt.InvalidTokenError as eite:
        logging.warning(eite)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {eite}"
        )
    

async def validate_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Optional[JWTPayload]:
    """
    Validate JWT token from Authorization header
    """
    try:
        token = credentials.credentials
        payload = decode_token(token)
        return JWTPayload(**payload)
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
