import jinja2
import requests
import json
import pickle as pkl
import random

alphabet = list("abcdefghijklmnopqrstuvwxyz")




# Set up the Jinja environment
# This is relative to the working directorty not where the python script is.
template_dir = "./templates/"
env = jinja2.Environment(loader=jinja2.FileSystemLoader(template_dir), extensions=['jinja2_strcase.StrcaseExtension'])


# returns the set of services which are valid for the system
# TO BE DONE: add a check for ontology compatibility
# TO BE DONE: ensure that the API requests work for gh or dockerhub registries
def get_service_list(registry_url):
    # Make a GET request to the registry API to get the list of repositories
    response = requests.get(f"{registry_url}/v2/_catalog")
    repositories = response.json()["repositories"]
    
    final_labels = []
    # Iterate over each repository and get the tags and labels for each image
    for repository in repositories:
        # Make a GET request to the registry API to get the list of tags for the repository
        response = requests.get(f"{registry_url}/v2/{repository}/tags/list")
        tags = response.json()["tags"]

        
        # Iterate over each tag and get the labels for the image
        # How do we handle images which have multiple tags?
        for tag in tags:
            # Make a GET request to the registry API to get the manifest for the image
            headers = {'Accept': 'application/vnd.docker.distribution.manifest.v2+json'}
            response = requests.get(f"{registry_url}/v2/{repository}/manifests/{tag}", headers=headers)
            manifest = response.json()

            # if f'{repository}:{tag}' == 'job1image2:registry':

            # Get the digest for the image configuration
            config_digest = manifest['config']['digest']

            # Make a GET request to the registry API to get the image configuration
            response = requests.get(f"{registry_url}/v2/{repository}/blobs/{config_digest}")
            config = response.json()

            # Now you should be able to get the labels from the config
            try:
                # if there are labels in the config, add them to the list of labels
                labels = config['config']['Labels']
                # check if the labels are the ones we want
                if 'cincodebio.ontology_version' in labels.keys() and 'cincodebio.schema' in labels.keys():
                    
                    # TO BE DONE; insert a ontology compatibility check here
                    
                    final_labels.append(
                        {
                            'image': f"{repository}:{tag}",
                            **labels
                        }
                    )
            except:
                ...
    return final_labels
                


if __name__ == "__main__":
    # Print the list of templates available
    template_list = env.list_templates()
    print("List of templates available:")
    for template in template_list:
        print(template)
    
    # env.get_template("service-api-main-template.j2")
        
    # Call the function with the registry URL
    registry_url = "http://192.168.64.2:32000"
    print(get_service_list(registry_url))


    # Get the labels from the service file to the docker image
    
    'cincodebio.schema' # DPS Data model version
    'cincodebio.ontology_version'   # Ontology version
    'image' # docker image to run

    # need to add image to this
        
    model =  pkl.load(open('all_services.pkl', 'rb'))

    final_models = []

    for mod in model:
        final_models.append({
            'image': f'{"".join(random.choices(alphabet, k=random.randint(3,10)))}:{"".join(random.choices(alphabet, k=random.randint(3,10)))}',
            'cincodebio.ontology_version' : 'cellmaps~0.1.0',
            'cincodebio.schema' : mod,
        })
        


    with open('__init__.py', 'w') as f:
        f.write('')
        
    with open('output.py', 'w') as f:
        f.write(env.get_template("service-api-main-template.py.j2").render(
            services = final_models
        ))


    with open('models.py', 'w') as f:
        f.write(env.get_template("service-api-models-template.py.j2").render(
            services = final_models
        ))

        




