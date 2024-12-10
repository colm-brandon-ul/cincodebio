# from fastapi import FastAPI, Request
# from fastapi.responses import RedirectResponse

from typing import Optional
from fastapi import Depends, HTTPException, Security
from fastapi.security import OAuth2PasswordBearer
from fastapi import status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt


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
    try:
        payload = jwt.decode(token, PUBLIC_KEY, algorithms=['RS256'])
        return payload
    except jwt.PyJWTError as e:
        import
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {e}"
        )
    except jwt.InvalidSignatureError as eise:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token signature: {eise}"
        )
    except jwt.ExpiredSignatureError as eese:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token has expired: {eese}"
        )
    except jwt.InvalidTokenError as eite:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {eite}"
        )
    

async def validate_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> Optional[dict]:
    """
    Validate JWT token from Authorization header
    """
    try:

        import logging
        logging.warning(credentials)
        token = credentials.credentials
        logging.warning(token)  
        payload = decode_token(token)
        logging.warning(payload)
        return payload
    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )