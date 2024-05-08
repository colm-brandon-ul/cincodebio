import pathlib
import platform
import json
from typing import Dict

from lark import Lark, Transformer


class HippoFlowTransformer(Transformer):
    def hippoflow(self, items):
        identifier, sibs = items[0], items[1:]
        return {"HippoFlow": identifier, "sibs": sibs}

    def tasksib(self, items):
        identifier, *rest = items
        index = None
        properties = {}
        ports = []
        
        # Separate out index, properties, and ports from rest
        for item in rest:
            if type(item) is int:
                index = item
            elif type(item) is dict:
                properties.update(item)
            elif type(item) is list:
                ports = item
        
        return {"type": "TaskSIB", "identifier": identifier, "index": index, "properties": properties, "ports": ports}

    def servicesib(self, items):
        identifier, *rest = items
        index = None
        properties = {}
        ports = []
        
        # Separate out index, properties, and ports from rest
        for item in rest:
            if type(item) is int:
                index = item
            elif type(item) is dict:
                properties.update(item)
            elif type(item) is list:
                ports = item
        
        return {"type": "ServiceSIB", "identifier": identifier, "index": index, "properties": properties, "ports": ports}

    def property(self, items):
        return {k: v for d in items for k, v in d.items()}

    def ports(self, items):
        return items

    def inputport(self, items):
        identifier, properties = items
        return {"port_type": "InputPort", "port_identifier": identifier, "port_properties": properties}

    def siblabel(self, items):
        identifier, portlabel = items
        return {"port_type": "SIBLabel", "port_identifier": identifier, "port_properties": str(portlabel)[1:-1]}

    def outputport(self, items):
        identifier, properties = items[0], items[1]
        dataflow = items[2:] if len(items) > 2 else None  # Dataflow is optional
        return {"port_type": "OutputPort", "port_identifier": identifier, "port_properties": properties, "dataflow": dataflow}

    def controlflow(self, items):
        identifier, cfproperties = items[0], items[3]
        return {"port_type": "ControlFlow", "port_identifier": identifier, "port_properties": cfproperties}

    def cfproperties(self, items):
        return {k: v for d in items for k, v in d.items()}

    def cfid(self, items):
        return {"cfid": str(items[0])}

    def cflabel(self, items):
        return {"cflabel": str(items[0])[1:-1]}

    def portproperties(self, items):
        return {k: v for d in items for k, v in d.items()}

    def uidproperty(self, items):
        return {"libraryComponentUID": str(items[0])[1:-1]}  # Remove quotes
    
    def nameproperty(self, items):
        return {"name": str(items[0])[1:-1]}  # Remove quotes
    
    def labelproperty(self, items):
        return {"label": str(items[0])[1:-1]}  # Remove quotes

    def parameterproperty(self, items):
        # to be implemented - currently returns empty list
        if len(items) == 0:
            return {"parameter" : []}
        return {"parameter": []}

    def porttypenameproperty(self, items):
        return {"typeName": str(items[0])[1:-1]}

    def portnameproperty(self, items):
        return {"name": str(items[0])[1:-1]}

    def portislistproperty(self, items):
        return {"isList": True if str(items[0]) == "true" else False}

    def dataflow(self, items):
        identifier, dfid = items
        return {"subport_type": "DataFlow", "subport_identifier": identifier, "dfid": dfid}

    def dfid(self, items):
        return str(items[0])

    def identifier(self, items):
        return str(items[0])

    def index(self, items):
        return int(items[0])

    # This method will collect all the children into a list
    def _default(self, data, children, meta):
        return children
    



def read_input_file(file_path):
    txt = pathlib.Path(file_path).read_text()
    return txt

def read_json(file_path):
    with open(file_path, 'r') as file:
        hippo_dict = json.load(file)
    return hippo_dict

def save_to_json(hippo_dict, file_path):
    with open(file_path, 'w') as fp:
        json.dump(hippo_dict, fp, indent=4)





class HippoFlowParser:
    def __init__(self) -> None:
        pass
    
    @classmethod
    def _get_grammar(cls) -> str:
        # grammar = """
        # hippoflow: "HippoFlow" identifier "{" (tasksib | servicesib)+ "}"
        # tasksib: "TaskSIB" identifier "at" _COORDINATE "size" _COORDINATE [index] "{" property* ports "}"
        # servicesib: "ServiceSIB" identifier "at" _COORDINATE "size" _COORDINATE [index] "{" property* ports "}"
        # property: uidproperty~1 nameproperty~1 labelproperty~1
        # ports: inputport* siblabel~1 outputport* controlflow*

        # uidproperty: "libraryComponentUID" ESCAPED_STRING
        # nameproperty: "name" ESCAPED_STRING
        # labelproperty: "label" ESCAPED_STRING
        # inputport: "InputPort" identifier "at" _COORDINATE "size" _COORDINATE "{" portproperties "}"
        # portproperties: porttypenameproperty~1 portnameproperty~1 portislistproperty~1
        # siblabel: "SIBLabel" identifier "at" _COORDINATE "size" _COORDINATE "{" "label" ESCAPED_STRING "}"
        # outputport: "OutputPort" identifier "at" _COORDINATE "size" _COORDINATE "{" portproperties dataflow* "}"
        # controlflow: "-ControlFlow->" identifier "decorate" ESCAPED_STRING "at" _positionpair "decorate" ESCAPED_STRING "at" _positionpair "{" cfproperties "}"

        # porttypenameproperty: "typeName" ESCAPED_STRING
        # portnameproperty: "name" ESCAPED_STRING
        # portislistproperty: "isList" BOOLEAN
        # dataflow: "-DataFlow->" identifier "via" _positionpairs "{" dfid~1 "}"
        # dfid: "id" identifier
        # cfproperties: cfid~1 cflabel~1
        # cfid: "id" identifier
        # cflabel: "label" ESCAPED_STRING

        # _positionpair: "(" _COORDINATE ")"
        # _positionpairs: _positionpair+
        # identifier: /_[a-zA-Z0-9\-\_]+/
        # _COORDINATE: /\-*\d+,\-*\d+/
        # index: "index" /\d+/
        # BOOLEAN: "true" | "false"

        # %import common.ESCAPED_STRING
        # %import common.WS
        # %ignore WS
        # """
        with open('./templates/grammar.lark', 'r') as file:
            grammar = file.read()
        return grammar
    
    @classmethod
    def _parse(cls,input_text: str, hippo_grammar: str) -> Dict:
        parser = Lark(hippo_grammar, start='hippoflow', parser='lalr')
        parse_tree = parser.parse(input_text, start='hippoflow')
        return parse_tree

    @staticmethod
    def parse_model_file(model_file: str) -> dict:
        
        parse_tree = HippoFlowParser._parse(model_file, HippoFlowParser._get_grammar())
        return HippoFlowTransformer(visit_tokens=True).transform(parse_tree)

def main():
    # Paths
    data_ = ''
    save_ = 'generated_files'
    windows_path = pathlib.Path('A:/code/hippoflow_codegen/')
    mac_path = pathlib.Path('/Users/aman/Desktop/code/hippoflow_codegen/')

    if platform.system() == 'Windows':
        data_path = windows_path.joinpath(data_)
        save_path = windows_path.joinpath(save_)
    elif platform.system() == 'Darwin':
        data_path = mac_path.joinpath(data_)
        save_path = mac_path.joinpath(save_)
    # Creating the directory if it does not exist
    if not pathlib.Path(save_path).exists():
        pathlib.Path(save_path).mkdir()
  
    input_text = read_input_file(data_path.joinpath('HippoFlow_ADG_template.txt'))
    hippo_dict = HippoFlowParser.parse_model_file(input_text)
    save_to_json(hippo_dict, save_path.joinpath('hippo_dict.json'))

if __name__ == "__main__":
    main()