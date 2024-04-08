# Standrad imports
from typing import Dict, List, Tuple, Union
from urllib.parse import urljoin,urlparse
import jinja2
import requests
import json
import logging
import pprint
import json
# Relative imports
from k8s_interface import get_available_architectures

# System ENV
ALLOW_EMULATION = False

# Common constants
DH_ENDPOINT = "hub.docker.com"
DH_AUTH_ENDPOINT = "auth.docker.io"
DH_API_ENDPOINT = "registry-1.docker.io"


# DOCKER HUB REGISTRY FNS
def get_dh_api_token_for_repo(namespace: str, repository: str):
    """
    Retrieves the Docker Hub API token for a given repository with pull permissions.

    Args:
        namespace (str): The namespace of the repository.
        repository (str): The name of the repository.

    Returns:
        str: The Docker Hub API token.

    Raises:
        requests.HTTPError: If the request to retrieve the token fails.
    """
    auth_response = requests.get(f"https://{DH_AUTH_ENDPOINT}/token?service=registry.docker.io&scope=repository:{namespace}/{repository}:pull")
    auth_response.raise_for_status()  # Raise exception if the request failed
    token = auth_response.json()['token']

    return token

def get_repo_from_namespace_dh(namespace: str) -> List[Dict]:
    """
    Retrieves a list of relevant repositories from a given namespace on DockerHub.
    Currently only supports public repositories.

    Args:
        namespace (str): The namespace to retrieve repositories from.

    Returns:
        List: A list of relevant repositories, each represented as a dictionary with the following keys:
            - name (str): The name of the repository.
            - namespace (str): The namespace of the repository.
            - repository_type (str): The type of the repository (e.g., 'image').

    Raises:
        requests.HTTPError: If there is an error while making the HTTP request to the Docker registry.
    """
    # Need to decide which registry to use - currently only support public docker repos

    # Get the list of repositories in the a namespace
    response = requests.get(f"https://{DH_ENDPOINT}/v2/repositories/{namespace}/?page_size=10000")
    response.raise_for_status()

    repositories = response.json()["results"]
    print(f'NUM REPOS: {len(repositories)}')

    if 'next' in response.json().keys():
        while response.json()['next'] != None:
            response = requests.get(response.json()['next'])
            response.raise_for_status()
            if response.status_code == 200:
                repositories += response.json()["results"]

            print(f'NUM REPOS: {len(repositories)}')



    relevant_repos = []
    # Filter out the non-image repositories
    for repo in repositories:
        # for some reason the images type is set to none rather than image (need to resolve this in future)
        if  repo['is_private'] == False:
            relevant_repos.append({
                'name': repo['name'],
                'namespace': namespace,
                'repository_type': repo['repository_type']
            })

    return relevant_repos

    

def get_tags_from_repo_dh(repository: Dict) -> List:
    """
    Retrieves the relevant tags from a given repository in the Docker Hub.

    Args:
        repository (dict): A dictionary containing the namespace and name of the repository.

    Returns:
        List: A list of relevant tags from the repository.

    Raises:
        requests.HTTPError: If there is an error while making the HTTP request.
    """
    # Need to decide which registry to use
    response = requests.get(
        f"https://{DH_ENDPOINT}/v2/repositories/{repository['namespace']}/{repository['name']}/tags/?page_size=10000" )
    response.raise_for_status()
    print(response.status_code)
    tags = response.json()["results"]
    print(f'NUM TAGS: {len(tags)}')

    if 'next' in response.json().keys():
            while response.json()['next'] != None:
                response = requests.get(response.json()['next'])
                print(response.status_code)
                response.raise_for_status()
                if response.status_code == 200:
                    tags += response.json()["results"]
                print(f'NUM TAGS: {len(tags)}')

    relevant_tags = []
    for tag in tags:
        # Should I filter out the v1 tags and inactive tags?
        if tag['tag_status'] == 'active' and tag['v2']:
            relevant_tags.append(tag['name'])
        
        else: print(f"Tag {tag['name']}, {tag['tag_status']} {tag['v2']} is not active or not a v2 tag")

                    
    return relevant_tags


    # Function code...
def retrieve_valid_cdb_images(
        token: str, 
        namespace: str, 
        repository: str, 
        tag: str,
        available_architectures: List[str]) -> Union[None, Dict[str, str]]:
    
    """
    Retrieves valid CDB (Cinco De Bio) images from the Docker Hub Registry V2 API based on the provided parameters.
    
    Args:
        token (str): The authentication token for accessing the Docker registry.
        namespace (str): The namespace of the Docker repository.
        repository (str): The name of the Docker repository.
        tag (str): The tag of the Docker image.
        available_architectures (List[str]): A list of available architectures in the k8s cluster to filter the images.
        
    Returns:
        Union[None, Dict[str, str]]: A dictionary containing the image details if a valid image is found,
        otherwise None.
    """

    headers = {
        'Authorization': f'Bearer {token}',
        'Accept': 'application/vnd.docker.distribution.manifest.v2+json'}

    res = requests.get(
        f'https://{DH_API_ENDPOINT}/v2/{namespace}/{repository}/manifests/{tag}', headers=headers)
    
    # ensure the request was successful
    res.raise_for_status()

    manifest = json.loads(res.content.decode('utf-8'))

    
    # Check if it is a manifest list or a manifest (single or multi-arch image) 
    if manifest['mediaType'] == 'application/vnd.docker.distribution.manifest.list.v2+json' or manifest['mediaType'] == 'application/vnd.oci.image.index.v1+json':
        logging.info(f"Found manifest list for {namespace}/{repository}:{tag}")

        # Iterate over manifests to find the one that matches the available architectures
        supported_manifest = []
        for mf in manifest['manifests']:
            if mf['platform']['architecture'] in available_architectures:
                supported_manifest.append(mf)

        if len(supported_manifest) == 0:
            logging.info(f"No supported manifest found for {namespace}/{repository}:{tag}")
            return None
        
        # As the labels are the same for all the manifests in the list, we can just return the first one
        sm = supported_manifest[0]


        # Get the manifest for the supported architecture
        res = requests.get(
            f'https://registry-1.docker.io/v2/{namespace}/{repository}/manifests/{sm["digest"]}', 
            headers={'Authorization': f'Bearer {token}',
                     'Accept': sm['mediaType']})
        
        # ensure the request was successful
        res.raise_for_status()


        digest = res.json()['config']['digest']


        blob = retrieve_blob(
            token=token,
            namespace=namespace,
            repository=repository,
            digest=digest,
            media_type=sm['mediaType']  
        )


        # Don't need to check if the architecture is supported as we already did that (from manifest list)
        labels = extract_cdb_labels(blob)

        if labels:
            return {
                'image':f'{DH_API_ENDPOINT}/{namespace}/{repository}:{tag}',
                **labels
                }
            
        else:
            return None

    # This is a single arch image
    else:
        logging.info(f"Found manifest for {namespace}/{repository}:{tag}")

       
        # The manifest for single arch images is not included in the manifest


        blob = retrieve_blob(
            token=token,
            namespace=namespace,
            repository=repository,
            digest=manifest['config']['digest'],
            media_type=manifest['config']['mediaType']
        )
        
        if blob['architecture'] in available_architectures:
            labels = extract_cdb_labels(blob)

            if labels:
                
                return {
                    'image':f'{DH_API_ENDPOINT}/{namespace}/{repository}:{tag}',
                    **labels
                }
            
            else:
                return None

        else:
            return None



def retrieve_blob(
        token: str, 
        namespace: str, 
        repository: str, 
        digest: str,
        media_type: str):
    """
    Retrieves a blob from a specified docher hub registry repository.

    Args:
        token (str): The authentication token.
        namespace (str): The namespace of the repository.
        repository (str): The name of the repository.
        digest (str): The digest of the blob.
        media_type (str): The media type of the blob.

    Returns:
        dict: The content of the retrieved blob.
    """
    
    # Set up auth and media type headers
    headers = {'Authorization': f'Bearer {token}', 
               'Accept': f'{media_type}'}

    response = requests.get(
        f"https://{DH_API_ENDPOINT}/v2/{namespace}/{repository}/blobs/{digest}", 
        headers=headers)
    
    # ensure the request was successful
    response.raise_for_status()
    
    cont = json.loads(response.content.decode('utf-8'))

    
    return cont


def extract_cdb_labels(blob: Dict[str, str]) -> Dict[str, str]:
    """
    Extracts the Cinco de Bio specific Docker labels from the given blob.

    Args:
        blob (Dict[str, str]): The blob containing the configuration.

    Returns:
        Dict[str, str]: The extracted CDB labels if they exist, otherwise None.
    """
    # check if the blob has the labels
    if 'Labels' in blob['config'].keys():
        labels = blob['config']['Labels']
    # if it doesn't return None
    else:
        return None

    # check it has the required labels (i.e. the ontology version and the schema dps schema)
    if 'cincodebio.ontology_version' in labels.keys() and 'cincodebio.schema' in labels.keys():
        
        # need to deserialize the schema (from json string to dict)
        try:
            labels['cincodebio.schema'] = json.loads(labels['cincodebio.schema'])
        except:
            # if it fails return None as the schema is not valid (probably because the json string has been stored in correctly)
            return None
        
        # return the labels
        return labels
    else:
        return None
    
    
    # Rest of the code...
def get_valid_images_from_namespace(namespace: str) -> Tuple[List,List]:
    """
    Retrieves the valid images from a given namespace.

    Args:
        namespace (str): The namespace to retrieve the images from.

    Returns:
        tuple: A tuple containing two lists. The first list contains the latest images, 
               while the second list contains the rest of the images.
    """

    # Get support archs from k8s cluster
    supported_architectures = get_available_architectures()
    repos = get_repo_from_namespace_dh(namespace=namespace)
    latest_images = []
    rest_of_images = []

    for repo in repos:
        repo['tags'] = get_tags_from_repo_dh(repo)
        for tag in repo['tags']:

           # returns a dict with the image and the labels    
           img_obj = retrieve_valid_cdb_images(
                token=get_dh_api_token_for_repo(repo['namespace'], repo['name']),
                namespace=repo['namespace'],
                repository=repo['name'],
                tag=tag,
                available_architectures=supported_architectures
            )
           
           if img_obj != None:
               if tag == 'latest':
                   latest_images.append(img_obj)
               else:
                   rest_of_images.append(img_obj)



    return latest_images, rest_of_images


def code_gen(template_env: jinja2.Environment, service_models: List) -> Tuple[str, str]:
    """
    Generate code for service API and data models.

    Args:
        template_env (jinja2.Environment): The Jinja2 template environment.
        service_models (List): A list of service models.

    Returns:
        Tuple[str, str]: A tuple containing the generated API code [index 0] and data model code [index 1].
    """

    # perhaps rather than the tag I should use the digest (as the tag can be updated)
    
    api_code = template_env.get_template("service-api-main-template.py.j2").render(
        services=service_models
    )

    data_model_code = template_env.get_template("service-api-models-template.py.j2").render(
        services=service_models
    )

    return api_code, data_model_code

