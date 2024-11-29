from codegen.graph_transformer import ComputationalGraphTransformer
from codegen.parser import HippoFlowParser
from codegen.parsev2 import HippoFlowParserV2

import os
from jinja2 import Template
import json
import logging


class HippoFlowCodegenrator:
    def __init__(self):
        ...

    @staticmethod
    def generate(model: str, workflow_id: str, cdb_external_url: str, sib_mapping: dict, v2=False):
        """
        Generate code based on the given model and workflow ID.
        
        Args:
            model (str): The model to generate code for.
            workflow_id (str): The ID of the workflow.
            cdb_external_url (str): The URL via which cdb can be accessed externally.
            sib_mapping (dict): A dictionary mapping SIBs to its correct concepts and i/o values to the correct json strcuture (i.e.).
        """

        # Parse the model - returns a dictionary of all the parsed data
        if v2:
            parser_model = HippoFlowParserV2.transform(json.loads(model))
        else:
            parsed_model = HippoFlowParser.parse_model_file(model)


        logging.warning(f"Model: \n \n {parsed_model}")

        # Transform the parsed model into a computational graph
        graph = ComputationalGraphTransformer.transform_graph(
            model_dict=parsed_model,
            concept_map=sib_mapping)
        
        logging.warning(f"Graph: \n \n {graph}") 

        current_file_path = os.path.abspath(__file__)
        current_directory = os.path.dirname(current_file_path)

        # Generate code
        with open(current_directory + '/templates/workflow_program.py.j2', 'r') as f:
            template = Template(f.read(),extensions=['jinja2_strcase.StrcaseExtension'])

            code = template.render(
                workflow_id=workflow_id,
                cdb_external_url=cdb_external_url,
                computational_graph=graph
            )
        
        return code


if __name__ == "__main__":
    
    with open('test-data/sib_map.json', 'r') as f:
        sib_mapping = json.load(f)


    with open('test-data/sib_map.json', 'r') as f:
        code  = HippoFlowCodegenrator.generate(f.read(), '12345678', 'http://localhost:8080/', sib_mapping=sib_mapping, v2=True)


    with open(os.getcwd() + '/test_output_workflow_program.py', 'w') as f:
        f.write(code)

    
