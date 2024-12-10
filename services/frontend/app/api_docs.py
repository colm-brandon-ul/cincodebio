import logging
from typing import Dict
from fastapi import APIRouter
from fastapi.openapi.docs import get_swagger_ui_html
import os
import requests
from requests.exceptions import Timeout, RequestException
import re



router = APIRouter()


def refactor_paths(openapi: dict, service_name: str):
    """
        Refactor the paths in the openapi.json to include the ext path (from k8s ingress)

        Args:
            openapi (dict): The openapi.json to refactor
            service_name (str): The name of the service to refactor the paths for
        
        Returns:    
            dict: The openapi.json with the refactored paths
    """

    ext_path = os.getenv(f"{service_name.replace('-', '_').upper()}_EXT_INGRESS_PATH")
    new_paths = {}
    for path, methods in openapi.get("paths", {}).items():
        if path.startswith('/ext/'):
            print(path, methods)
            new_paths[f'{ext_path}{path}'] = methods
        else:
            new_paths[path] = methods
    openapi["paths"] = new_paths
    return openapi

def get_utd_service_doc(service_name) -> Dict:
    """
        Get the openapi.json from the service and refactor the paths to include the ext path

        Args:
            service_name (str): The name of the service to get the openapi.json from
            
        Returns:
            Dict: A dictionary containing the openapi.json of the service

    """
    ptrn = re.compile(rf'{service_name.replace('-','_'.upper())}(?:_[a-zA-Z0-9]+)*_SERVICE_HOST$')
    service = {k:v for k,v in os.environ.items() if re.match(ptrn, k)}
    
    try:
        v = list(service.values()).pop()
        res = requests.get(f"http://{v}/openapi.json", timeout=3)
        if res.status_code == 200:

            return refactor_paths(res.json(), service_name)
    except Timeout:
        logging.error(f"Timeout connecting to service: {service_name}")
        return None
    except RequestException as e:
        logging.error(f"Error connecting to service {service_name}: {str(e)}")
        return None

    except KeyError:
        logging.warning(f"Service {service_name} not found in environment variables")


@router.get("/docs")
async def get_api_docs():
    return get_swagger_ui_html(openapi_url="/app/openapi.json", title="docs")


@router.get("/{service}/openapi.json")
async def get_openapi_json(service: str):
    try:
        return get_utd_service_doc(service)
    except Exception as e:
        return {"error": str(e)}


@router.get("/docs/{service}")
async def get_api_docs_service(service: str):
    return get_swagger_ui_html(openapi_url=f"/app/{service}/openapi.json", title="docs")

    
    
        