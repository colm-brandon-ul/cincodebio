import hashlib
import re
from typing import Dict, List, Tuple

import jinja2
import pathlib
from config import (PERSISTENT_STATE_MOUNT_PATH,UTD_SIB_FILE)

OS_REGEX = re.compile(r'\((.*?)\;')
EXCLUDED_LABELS = ['id','label_id']
SCALING_FACTOR = 1.5
LABEL_FONT = 8 / SCALING_FACTOR
PORT_FONT = 5 / SCALING_FACTOR

def estimate_length(*args, fontsize_scale = 8) -> int:
    """
    Estimate the length of a string by concatenating the string representations of the arguments.

    Args:
        *args: A variable number of arguments.

    Returns:
        int: The estimated length of the string.
    """
    return len(' '.join(args))*fontsize_scale

def check_if_windows(user_agent: str) -> bool:
    """
    Check if the user agent string indicates a Windows operating system.

    Args:
        user_agent: A string representing the user agent.

    Returns:
        A boolean value indicating whether the user agent string indicates a Windows OS.
    """
    match = re.search(OS_REGEX, user_agent)
    if match:
        os = match.group(1)
        if "windows" in os.lower():
            return True
    return False

def compute_local_hash() -> tuple[str, str]:
    """
    Compute the SHA-256 hash of a the locally stored sib fiel and return the hash values.
    Computes two hash values, one with and one without a newline character at the end of the file (as the local IDE may add it).

    Returns:
        A tuple of two strings representing the SHA-256 hash values.
    """
    # read the file
    state_path = pathlib.Path(PERSISTENT_STATE_MOUNT_PATH)
    with open(state_path / UTD_SIB_FILE, 'rb') as f:
        og_str = f.read()
    
    # some OS's / IDE may add a newline at the end of the file
    
    encoded_str = og_str + b"\n"    
    
    sha_256 = hashlib.sha256()
    sha_256.update(og_str)
    hex_dig = sha_256.hexdigest()
    
    sha_256_nl = hashlib.sha256()
    sha_256_nl.update(encoded_str)
    hex_dig_nl = sha_256_nl.hexdigest()
    
    return hex_dig, hex_dig_nl


def convert_newlines(input_file: pathlib.Path) -> str:
    """
    Convert newlines in a file to the appropriate format, i.e. CRLF for Windows.

    Args:
        input_file: A string representing the path to the input file.

    Returns:
        A string with converted newlines.
    """
    with open(input_file, 'r') as in_file:
        lines = in_file.read().split('\n')
    output_string = ""
    for line in lines:
        output_string += "%s\n" % line
    return output_string


def _get_cinco_entity_id(*args) -> str:
    """
    Generate a unique id for a Cinco entity.

    Args:
        *args: A variable number of arguments.

    Returns:
        str: The unique id for the Cinco entity.
    
    """
    hash_object = hashlib.md5(" ".join([str(a) for a in args]).encode())
    
    # turn the hash into a uuid (with dashes)
    return f"{hash_object.hexdigest()}"

def make_sib(type: str, name: str, inputs: list, outputs: list, branches: list, context: dict) -> Dict:
    """
    Create a SIB JSON object from the specified parameters.

    Args:
        type (str): The type of the SIB. (automated or interactive)
        name (str): The name of the SIB.
        inputs (list): The list of input ports.
        outputs (list): The list of output ports.
        branches (list): The list of branches.
        context (dict): The context dictionary (for storing the length of the strings in the SIB).

    Returns:
        Dict: The SIB JSON object.
    
    """
    fs = estimate_length(name,fontsize_scale=PORT_FONT)
    if context.get('length', 0) < fs:
        context['length'] = fs
        

    return {
            "name" : name,
            "label" : name,
            "inputs" : [make_data_port(i[0],i[1], context, type, name, name,'input') for i in inputs],
            "label_id" : _get_cinco_entity_id(type,name,name,'label'),
            "label_x" : 0,
            "label_y" : 0,
            "label_w" : 100,
            "label_h" : 100,
            "outputs" : [make_data_port(o[0],o[1], context, name, name,'output') for o in outputs],
            "branches" : [make_branch(b,type,name,name,'branch') for b in branches],
            "type" : type,
            "id" : _get_cinco_entity_id(type,name,name),
            "x" : 0,
            "y" : 0,
            "w" : context.get('length', 100),
            "h" : 100
        }



def make_branch(name: str, *args) -> Dict:
    """
        Create a cinco branch JSON object from the specified name.

        Args:
            name (str): The name of the branch.
            *args: Used to generate the id for the branch
        
        Returns:
            Dict: The branch JSON object.
    
    """
    return {
        "id" : _get_cinco_entity_id(name,*args),
        "x" : 0,
        "y" : 0,
        "w" : 100,
        "h" : 100,
        "name" : name
    }

def make_data_port(name: str, type: str, context: dict, *args, isList: bool=False) -> Dict:
    """
        Create a cinco data port (input or output) JSON object from the specified name and type.

        Args:
            name (str): The name of the data port.
            type (str): The type of the data port.
            context (dict): The context dictionary (for storing the length of the strings in the data port).
            *args: Used to generate the id for the data port
            isList (bool): Whether the data port is a list. (currently not used)

        
        Returns:
            Dict: The data port JSON object.
    
    """

    fs = estimate_length(f'{name} : {type}',fontsize_scale=LABEL_FONT)

    if context.get('length', 0) < fs:
        context['length'] = fs
        
    
    return {
        "id" : _get_cinco_entity_id(name,type,*args),
        "x" : 0,
        "y" : 0,
        "w" : 100,
        "h" : 100,
        "name" : name,
        "type" : type,
        "isList" : "true" if isList else "false"
    }

def copy_dict_exclude_keys(d: dict, keys_to_exclude: list) -> dict:
    """
    Copy a dictionary excluding specified keys. This is done as id's are generated from uuids and will be different

    Args:
        d (dict): The dictionary to copy.
        keys_to_exclude (list): The list of keys to exclude.

    Returns:
        dict: The copied dictionary with excluded keys.

    """
    new_dict = {}
    for k, v in d.items():
        if k not in keys_to_exclude:
            if isinstance(v, dict):
                new_dict[k] = copy_dict_exclude_keys(v, keys_to_exclude)
            if isinstance(v, list):
                new_dict[k] = [copy_dict_exclude_keys(i, keys_to_exclude) if isinstance(i, dict) else i for i in v]
            else:
                new_dict[k] = v
    return new_dict


def cincodebio_schema_to_sibfile_format(lsibs: List[Dict], include_services_params = False) -> Tuple[Dict, Dict, Dict, List]:
    """
    Convert CincoDeBio schema (from the Docker Image label) to the expected format for the SIB file format.
    Also returns mappings for inputs, outputs, and abstract concepts.

    Returns:
        A tuple containing the mappings for input, output, and abstract concepts, as well as the list of SIB schemas.
    """
    # to be used by the workflow code generator for resolving paths and also correctly formatting json requests / and retrieiving data from responses
    sibInputMappings,sibOutputMappings,sibAbstractMappings = {},{},{}
    context = {}
    
    # these are the sib schemas that will be used to generate the sib file
    all_cinco_sib_schemas = []

    # iterate through the list of sibs
    for sib in lsibs:
        # get the abstract concept, service name, and service type from cincodebio.schema
        scon = sib['cincodebio.schema']['abstract_concept']
        sname = sib['cincodebio.schema']['service_name']
        stype= sib['cincodebio.schema']['service_type']
        # add the abstract concept to the abstract mappings (for use in the workflow code generator)
        sibAbstractMappings[sname] = scon
        sibInputMappings[sname] = {}
        sibOutputMappings[sname] = {}

        # get the input and output keys based on the service type
        if  stype == 'automated':
            input_key = 'process_input'
            output_key = 'process_output'
        else:
            input_key = 'prepare_template_input'
            output_key = 'process_output'

        # extract the input, output and control flow branch fields from the cincodebio.schema
        # and format them into the expected sib file format (for sib file code generator)
        sib_inputs = []
        sib_outputs = []
        branches = []
        if 'Data' in sib['cincodebio.schema'][input_key].keys():
            for f in sib['cincodebio.schema'][input_key]['Data']['FIELDS']:
                sib_inputs.append((f['name'], f['type'], f['default_value'], f['metadata'], f['optional']))
                sibInputMappings[sname][f"{f['name']}:{f['type']}"] = 'Data'

        if 'WorkflowParameters'in sib['cincodebio.schema'][input_key].keys():
            for f in sib['cincodebio.schema'][input_key]['WorkflowParameters']['FIELDS']:
                sib_inputs.append((f['name'], f['type'], f['default_value'], f['metadata'], f['optional']))
                sibInputMappings[sname][f"{f['name']}:{f['type']}"] = 'WorkflowParameters'
        
        # the modelling language does not support service parameters yet - it is a future feature 
        if include_services_params and 'ServiceParameters'in sib['cincodebio.schema'][input_key].keys():
            for f in sib['cincodebio.schema'][input_key]['ServiceParameters']['FIELDS']:
                sib_inputs.append((f['name'], f['type'], f['default_value'], f['metadata'], f['optional']))



        if 'Data' in sib['cincodebio.schema'][output_key].keys():
            for f in sib['cincodebio.schema'][output_key]['Data']['FIELDS']:
                sib_outputs.append((f['name'], f['type'], f['default_value'], f['metadata'], f['optional']))
                sibOutputMappings[sname][f"{f['name']}:{f['type']}"] = 'Data'

        if 'WorkflowParameters'in sib['cincodebio.schema'][output_key].keys():
            for f in sib['cincodebio.schema'][output_key]['WorkflowParameters']['FIELDS']:
                sib_outputs.append((f['name'], f['type'], f['default_value'], f['metadata'], f['optional']))
                sibOutputMappings[sname][f"{f['name']}:{f['type']}"] = 'WorkflowParameters'

        if 'Control'in sib['cincodebio.schema'][output_key].keys():
            for f in sib['cincodebio.schema'][output_key]['Control']['FIELDS']:
                branches.append(f['name'])
        context['length'] = 0
        all_cinco_sib_schemas.append(make_sib(
            stype,
            sname,
            sib_inputs,
            sib_outputs,
            branches,
            context
        ))

    return sibInputMappings, sibOutputMappings, sibAbstractMappings, all_cinco_sib_schemas


# check what's changed;
def resolve_sib_library_changes(current_sib_library: List, new_sib_library: List) -> List:
    """
    Resolves changes between the current SIB library and the new SIB library. Only updating the SIBs that have changed.

    Args:
        current_sib_library (List): The current SIB library.
        new_sib_library (List): The new SIB library.

    Returns:
        List: The resolved SIB library, containing the updated SIBs.
    """
    resolved_sib_set = []
    # remove id and label_id from the comparison (as they are generated from uuids and will be different each time)
    current_service_lib_without_ids = [copy_dict_exclude_keys(sib,EXCLUDED_LABELS) for sib in current_sib_library]
    # iterate through the new sib library and check if the sib is in the current library
    for sib in new_sib_library:
        # remove id and label_id from the comparison (as they are generated from uuids and will be different each time)
        temp_sib = copy_dict_exclude_keys(sib,EXCLUDED_LABELS)

        try :
            # get the index of the sib in the current library
            index = current_service_lib_without_ids.index(temp_sib)
            # if the sib is in the current library, add it to the resolved sib set
            resolved_sib_set.append(current_sib_library[index])
        except ValueError:
            # if the sib is not in the current library, add it to the resolved sib set
            resolved_sib_set.append(sib)
    
    return resolved_sib_set


def get_new_ime_sib_library(current_sib_library: List, new_sib_library: List) -> Dict:
    return {
    "id" : _get_cinco_entity_id(),
    "services": resolve_sib_library_changes(current_sib_library, new_sib_library)
    }


def formatSibMap(sib_ab_map2: Dict, sib_i_map2: Dict, sib_o_map2: Dict) -> Dict:
    """
    Format the mappings for abstract concepts, inputs, and outputs into a dictionary.

    Args:
        sib_ab_map2: The mapping for abstract concepts.
        sib_i_map2: The mapping for inputs.
        sib_o_map2: The mapping for outputs.

    Returns:
        Dict: The formatted mappings.
    """
    return {
    "concepts" :sib_ab_map2,
    "inputs" : sib_i_map2,
    "outputs" : sib_o_map2
    }




def code_gen(template_env: jinja2.Environment, sib_library: Dict) -> Tuple[str, str]:
    """
    Generate code for lib.sibs file for the IME.

    Args:
        template_env (jinja2.Environment): The Jinja2 template environment.
        service_models (List): A list of service models.

    Returns:
        Tuple[str, str]: The generated code for the lib.sibs file for the IME (Eclipse), IME (CincoCloud) .
    """

    # perhaps rather than the tag I should use the digest (as the tag can be updated)


    # use the v2 template for cinco cloud
    libs_dot_sibs_v2 = template_env.get_template("cinco-cloud-template.sibs.j2").render(
        siblibrary=sib_library
    )

    # use the v1 template for cinco desktop
    libs_dot_sibs_v1 = template_env.get_template("template.sib.j2").render(
    siblibrary=sib_library
    )


    return libs_dot_sibs_v1, libs_dot_sibs_v2