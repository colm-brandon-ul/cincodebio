from typing import List
from ontparse import OWLParser
from apigen import ApiDataModelCodeGen
from formgen import FormGen
from models import FormSchema, ModelSchema, OntologyState
from pathlib import Path
# parse new ontology.
from config import PERSISTENT_STATE_MOUNT_PATH, ONTOLOGY_STATE_FILE
import pickle

def check_if_local_state_exists() -> bool:
    """
        This function checks if the local sib state exists. I.e. the k8s application has been deployed before.

        Args:
            None

        Returns:
            bool: True if the local state exists, False otherwise
    """

    
    try:
        with open(PERSISTENT_STATE_MOUNT_PATH / ONTOLOGY_STATE_FILE, "r") as f:
            pickle.load(f)

        return True

    except FileNotFoundError:
        return False
    
def get_current_ontology_version() -> str:
    """
        This function gets the current ontology version.

        Args:
            None

        Returns:
            str: The current ontology version.
    """
    ont_state = OntologyState.load(PERSISTENT_STATE_MOUNT_PATH / ONTOLOGY_STATE_FILE)
    return ont_state.get_current_ontology()
    

def parse_new_ontology(ontology_url: str) -> str:  
    """
        This function parses a new ontology.

        Args:
            ontology_url (str): The URL of the ontology to parse.

        Returns:
            str: The name of the ontology and version.
    """
    parser = OWLParser()
    parser.load_ontology(ontology_url)
    ds_version, cdb_version, ds_ontology_name = parser.get_version_info()
    # serialize the parser object for future use.
    parser.save(PERSISTENT_STATE_MOUNT_PATH / f"{ds_ontology_name}-{ds_version}-{cdb_version}.pkl")

    return f"{ds_ontology_name}-{ds_version}-{cdb_version}"


# generate model file(s).
def handle_api_data_model_gen() -> List[ModelSchema]:
    """
        This function generates the data models for the service api from the ontology.

        Args:
            None
        
        Returns:
            List[ModelSchema]: A list of the generated data models.
    """

    # load the ontology state and the parser object.
    ont_state = OntologyState.load(PERSISTENT_STATE_MOUNT_PATH / ONTOLOGY_STATE_FILE)
    parser = OWLParser.load(PERSISTENT_STATE_MOUNT_PATH / f'{ont_state.get_current_ontology()}.pkl')
    return [ModelSchema.model_validate(model) for model in ApiDataModelCodeGen(parser).get_datamodels()]

def handle_form_schema_gen() -> FormSchema:
    """
        This function generates the data upload form schema from the ontology.

        Args:
            None
        
        Returns:
            FormSchema: The generated form schema.
    """
    # load the ontology state and the parser object.
    ont_state = OntologyState.load(PERSISTENT_STATE_MOUNT_PATH / ONTOLOGY_STATE_FILE)
    parser = OWLParser.load(PERSISTENT_STATE_MOUNT_PATH / f'{ont_state.get_current_ontology()}.pkl')
    return FormSchema.model_validate(FormGen(parser).get_form_schema())


