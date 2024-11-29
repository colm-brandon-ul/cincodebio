from typing import Dict, List, Tuple
import requests
import logging
import json
from models import FormSchema
# from config import 
from config import SIB_MANAGER_SERVICE_HOST, ONTOLOGY_MANAGER_SERVICE_HOST

def get_form_details() -> dict:
    """
        This function retrieves the form details from the ontology manager service.
    """

    response = requests.get(f'http://{ONTOLOGY_MANAGER_SERVICE_HOST}/form-models')
    logging.warning(f"Response: {response.content}")

    if response.status_code == 200:
        data = response.json()
        return data
    else:
        return {}


def get_sib_details() -> Tuple[List, List, List]:
    """
        This function retrieves the latest, installed, and rest SIBs from the SIB Manager service.
    """
    health = get_health(f'http://{SIB_MANAGER_SERVICE_HOST}/sib-manager-state')
    if health["status"] == "unhealthy":
        return [], [], []

    response = requests.get(f'http://{SIB_MANAGER_SERVICE_HOST}/sib-manager-state')

    if response.status_code == 200:
        data = response.json()
        return data["latest"], data["installed"], data["rest"]
    else:
        return [], [], []
    


def get_health(url: str) -> Dict:
    """
        This function checks the health of a service by sending an HTTP GET request to the service's health endpoint.
        If the service is healthy, the function returns the response from the service.
        If the service is unhealthy, the function returns a status of "unhealthy".
    """
    try:
        response = requests.get(url)
        response.raise_for_status()
    except requests.exceptions.HTTPError as http_err:
        logging.warning(f"HTTP error occurred: {http_err}")
        return {"status": "unhealthy"}
    except requests.exceptions.ConnectionError as conn_err:
        logging.warning(f"Connection error occurred: {conn_err}")
        return {"status": "unhealthy"}
    except requests.exceptions.Timeout as timeout_err:
        logging.warning(f"Timeout error occurred: {timeout_err}")
        return {"status": "unhealthy"}
    except requests.exceptions.RequestException as req_err:
        logging.warning(f"An error occurred: {req_err}")
        return {"status": "unhealthy"}
    
    return response.json()