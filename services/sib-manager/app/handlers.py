from typing import Dict, List
from config import (STATIC_CODE_DIR,PERSISTENT_STATE_MOUNT_PATH,LATEST_SIBS,
                  OTHER_SIBS,INSTALLED_SIBS, JINJA_ENV, CURRENT_SIBS_IME_JSON, 
                  SIB_MAP_FILE, UTD_SIB_FILE,UTD_SIB_FILE_V2, SERVICE_API_NAME, 
                  ONTOLOGY_MANAGER_SERVICE_HOST, CINCO_CLOUD_SIBS_PATH)
import utils
import k8s_interface
import cinco_interface

import pathlib
import json
import logging
import requests
import time

def health_check_with_timeout(url, timeout):
    start_time = time.time()
    
    while time.time() - start_time < timeout:
        try:
            response = requests.get(url)
            
            if response.status_code == 200:
                try:
                    resJson = response.json()
                except requests.exceptions.JSONDecodeError:
                    resJson = None

                return True, resJson
        except requests.exceptions.RequestException:
            logging.info(f"Failed to connect to {url}")

    return False, None

def get_api_data_models() -> List[Dict]:
    """
        This function retrieves the data models from the ontology manager and generates the data model code.

        Args:
            None

        Returns:
            None
    """
    try:
        url = f'http://{ONTOLOGY_MANAGER_SERVICE_HOST}/api-data-models'
        response = requests.get(url)
        if response.status_code == 200:
            return response.json()
    except requests.exceptions.RequestException:
        raise Exception("Failed to retrieve data models from the ontology manager")


def update_code_gen_maps(new_sib_maps: dict) -> bool:
    """
        Writes the new SIB maps to the local state directory.

        Args:
            new_sib_maps (dict): The new sib maps to update the code gen maps with

        Returns:
            bool: True if the update is successful, False otherwise
    """
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    logging.warning('New SIB Maps: {}'.format(new_sib_maps))

    try:
        with open(state_path / SIB_MAP_FILE, "w") as f:
            json.dump(new_sib_maps,f)
        return True
        
    except FileNotFoundError:
        return False
    
    


def initial_build_service_api(dh_namespace: str) -> bool:
    """
        This function is called when cdb is first deployed.

        It will:
            1. Retrieve the set of sibs available from DH
            2. Write them to local state - latest, installed, other
            3. Generate the code for the service-api
            4. Create the docker context
            5. Submit the kaniko job to build the service api image
            6. Trigger rolling updates

        Args:
            dh_namespace (str): The namespace where the sibs are stored in DockerHub

        Returns:
            None
    """
    static_path = pathlib.Path(STATIC_CODE_DIR)
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    cc_sib_state_path = pathlib.Path(CINCO_CLOUD_SIBS_PATH)
    
    cc_sib_state_path.mkdir(parents=True, exist_ok=True)
    # Retrieve the set of sibs available from DH
    logging.warning("Retrieving the set of sibs available from DH")
    latest, rest = utils.get_valid_images_from_namespace(dh_namespace)
    data_models = get_api_data_models()

    logging.warning("Latest SIBs: {}".format(latest))
    # WRITE THEM TO LOCAL STATE - LATEST, INSTALLED, OTHER
        # Initially, we will assume that all latest sibs are installed
    with open(state_path / LATEST_SIBS, "w") as f:
        json.dump(latest,f)

    with open(state_path / INSTALLED_SIBS, "w") as f:
        json.dump(latest,f)

    with open(state_path / OTHER_SIBS, "w") as f:
        json.dump(rest,f)

    logging.warning("Wrote the sibs to local state")

    logging.warning("Generating the code for the service-api")
    # Generate the code for the service-api
    api_code, model_code = utils.code_gen(
        template_env=JINJA_ENV,
        service_models=latest,
        data_models= data_models
    )

    # Need to create the docker context
    # Read the Dockerfile, k8s jobs and requirements.txt from static_code dir
    with open(static_path / 'Dockerfile.txt', 'r') as f:
        dfile = f.read()
    
    with open(static_path / 'k8sjobs.py', 'r') as f:
        k8s_jobs_content = f.read()

    with open(static_path / 'requirements.txt', 'r') as f:
        requirements_content = f.read()

    with open(static_path / 'utils.py', 'r') as f:
        utils_content = f.read()

    # Prepare the build context for kaniko build
    logging.warning("Preparing the build context for kaniko build")
    if k8s_interface.prepare_build_context(
        pfile_content=api_code,
        mfile_content=model_code,
        docker_image_content=dfile,
        k8s_jobs_content= k8s_jobs_content,
        requiremnts_txt_content=requirements_content,
        utils_content = utils_content
    ):
        logging.warning("Successfully prepared the build context for kaniko build")
        logging.warning("Submitting the kaniko job to build the service api image")
        # Submit the kaniko job to build the service api image image
        kaniko_job_name = k8s_interface.submit_kaniko_build(
            image_name=SERVICE_API_NAME
        )
        

        if k8s_interface.get_kaniko_build_status(kaniko_job_name):
            # Successfully built the service api image and pushed the image to the local registry
            # Trigger rolling updates - currently assuming default namespace
            logging.warning("Successfully built the service api image")
            logging.warning("Triggering rolling updates")
            k8s_interface.submit_rolling_update(
                image_name=SERVICE_API_NAME,
                service_api_deployment_name=SERVICE_API_NAME
            )

            # If the service api image was successfully built, update the sib maps and code gen schema

            logging.warning("Updating the sib maps and code gen schema")
            # from the new set of installed sibs, generate the new sib maps and code gen schema
            sib_i_map, sib_o_map, sib_ab_map, utd_sib_schemas = cinco_interface.cincodebio_schema_to_sibfile_format(latest)
            # resolve differences between the new and old sib schemas -> no existing IME schema will be present (pass in empty list)
            new_ime_sib_library_schema = cinco_interface.get_new_ime_sib_library([],utd_sib_schemas)
            new_lib_dot_sibs ,new_lib_dot_sibs_v2 = cinco_interface.code_gen(JINJA_ENV,new_ime_sib_library_schema)
            logging.warning('Writing the new lib.sibs to the state code dir')
            # Write the new lib.sibs to the static code dir
            with open(state_path / UTD_SIB_FILE, "w") as f:
                f.write(new_lib_dot_sibs)

            with open(cc_sib_state_path / UTD_SIB_FILE_V2, "w") as f:
                f.write(new_lib_dot_sibs_v2)

            # Write the new sib schema to the current sib schema file
            with open(state_path / CURRENT_SIBS_IME_JSON, "w") as f:
                json.dump(utd_sib_schemas,f)

            
            if update_code_gen_maps(cinco_interface.formatSibMap(sib_ab_map2=sib_ab_map, sib_i_map2=sib_i_map, sib_o_map2=sib_o_map, )):
                return True
            else:
                return False



        else:
            logging.error("Failed to build the service api image")
            return False

           
    else:
        logging.error("Failed to create the docker context")
        return False



def check_if_local_state_exists() -> bool:
    """
        This function checks if the local sib state exists. I.e. the k8s application has been deployed before.

        Args:
            None

        Returns:
            bool: True if the local state exists, False otherwise
    """

    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    cc_sib_state_path = pathlib.Path(CINCO_CLOUD_SIBS_PATH)
    try:
        with open(state_path / LATEST_SIBS, "r") as f:
            json.load(f)

        with open(state_path / OTHER_SIBS, "r") as f:
            json.load(f)

        with open(state_path / INSTALLED_SIBS, "r") as f:
            json.load(f)

        with open(state_path / CURRENT_SIBS_IME_JSON, "r") as f:
            json.load(f)
        
        with open(state_path / UTD_SIB_FILE, "r") as f:
            f.read()

        with open(cc_sib_state_path / UTD_SIB_FILE_V2, "r") as f:
            f.read()

        return True

    except FileNotFoundError:
        return False


def resolve_to_be_installed_sibs(new_installed_list: List) -> List:
    """
        This function resolves the installed SIBs from the set of available (latest and other) SIBs and returns a list of the full service schema for those SIBs.

        Args:
            new_installed_list (List): The list of to be installed SIBs (service names only)
        
        Returns:
            List: The list of to be installed SIBs (full service schema format (image, cincodebio.schema, cincodebio.ontology_version, etc..))

    """

    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / LATEST_SIBS, "r") as f:
        # opens the list of latest sibs
        latest_sibs = json.load(f)

    with open(state_path / OTHER_SIBS, "r") as f:
        # opens the list of latest sibs
        other_sibs = json.load(f)

    sib_latest_tbi = [sib for sib in latest_sibs if sib['cincodebio.schema']['service_name'] in new_installed_list]
    sib_rest_tbi = [sib for sib in other_sibs if sib['cincodebio.schema']['service_name'] in new_installed_list]

    all_sibs_tbi = sib_latest_tbi + sib_rest_tbi

    return all_sibs_tbi


# There's alot of redundancy in the code below w.r.t initial_build_service_api. I think we can refactor them into a single function (or similar)
def update_service_api_and_sibs(to_be_installed_sibs: List) -> bool:
    """
    Updates the service API and SIBs by generating code, building Docker images, and updating schemas and maps.

    Returns:
        bool: True if the update is successful, False otherwise.
    """
    
    static_path = pathlib.Path(STATIC_CODE_DIR)
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    cc_sib_state_path = pathlib.Path(CINCO_CLOUD_SIBS_PATH)

    data_models = get_api_data_models()

    # with open(state_path / INSTALLED_SIBS, "r") as f:
    #     # opens the list of installed sibs
    #     installed_sibs = json.load(f)

    # Generate the code for the service-api
    api_code, model_code = utils.code_gen(
        template_env=JINJA_ENV,
        service_models=to_be_installed_sibs,
        data_models= data_models
    )

    # Read the Dockerfile, k8s jobs and requirements.txt from static_code dir
    with open(static_path / 'Dockerfile.txt', 'r') as f:
        dfile = f.read()
    
    with open(static_path / 'k8sjobs.py', 'r') as f:
        k8s_jobs_content = f.read()

    with open(static_path / 'requirements.txt', 'r') as f:
        requirements_content = f.read()

    with open(static_path / 'utils.py', 'r') as f:
        utils_content = f.read()

    # Prepare the build context for kaniko build
    if k8s_interface.prepare_build_context(
        pfile_content=api_code,
        mfile_content=model_code,
        docker_image_content=dfile,
        k8s_jobs_content= k8s_jobs_content,
        requiremnts_txt_content=requirements_content,
        utils_content = utils_content
    ):

        # Submit the kaniko job to build the service api image image
        kaniko_job_name = k8s_interface.submit_kaniko_build(
            image_name=SERVICE_API_NAME
        )
        
        if k8s_interface.get_kaniko_build_status(kaniko_job_name):
            # Successfully built the service api image and pushed the image to the local registry
            # Trigger rolling updates - currently assuming default namespace
            k8s_interface.submit_rolling_update(
                image_name=SERVICE_API_NAME,
                service_api_deployment_name=SERVICE_API_NAME
            )
            
            # If the service api image was successfully built, update the sib maps and code gen schema

            # from the new set of installed sibs, generate the new sib maps and code gen schema
            sib_i_map, sib_o_map, sib_ab_map, utd_sib_schemas = cinco_interface.cincodebio_schema_to_sibfile_format(to_be_installed_sibs)

            # Read the schema of the last ime sib library that was generated (from file)
            with open(state_path / CURRENT_SIBS_IME_JSON, "r") as f:
                current_ime_sib_schema = json.load(f)

            # resolve differences between the new and old sib schemas
            logging.warning("Current IME SIB Schema: {}".format(current_ime_sib_schema))
            new_ime_sib_library_schema = cinco_interface.get_new_ime_sib_library(current_ime_sib_schema,utd_sib_schemas)

            new_lib_dot_sibs_v1, new_lib_dot_sibs_v2 = cinco_interface.code_gen(
                JINJA_ENV,
                new_ime_sib_library_schema)

            # Write the new lib.sibs to the static code dir
            with open(state_path / UTD_SIB_FILE, "w") as f:
                f.write(new_lib_dot_sibs_v1)

            with open(cc_sib_state_path / UTD_SIB_FILE_V2, "w") as f:
                f.write(new_lib_dot_sibs_v2)


            # Write the new sib schema to the current sib schema file
            with open(state_path / CURRENT_SIBS_IME_JSON, "w") as f:
                json.dump(new_ime_sib_library_schema["services"],f)

            # update the installed sibs json file
            with open(state_path / INSTALLED_SIBS, "w") as f:
                json.dump(to_be_installed_sibs,f)

            
            if update_code_gen_maps(cinco_interface.formatSibMap(sib_ab_map2=sib_ab_map, sib_i_map2=sib_i_map, sib_o_map2=sib_o_map)):
                return True
            else:
                return False

        else:
            logging.error("Failed to build the service api image")
            return False

           
    else:
        logging.error("Failed to create the docker context")
        return False


    


    
if __name__ == "__main__":
    initial_build_service_api(dh_namespace="sccecellmaps")