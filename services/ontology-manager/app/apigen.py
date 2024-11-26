from ontparse import OWLParser
import rdflib
import enum
from jinja2 import Environment, FileSystemLoader
import logging
from utils import Serializable

class DataModelType(str, enum.Enum):
    DataStructure = 'DataStructure'
    Primitive = 'Primitive'
    AtomicFile = 'AtomicFile'
    ClassWithAttributes = 'ClassWithAttributes'

class ApiDataModelCodeGen(Serializable):
    def __init__(self,ontology_path, parser=None, template_path = './', only_descendants_of = 'http://www.cincodebio.org/cdbontology#Data'):
        """
        
        Args:
        ontology_path (str): Path to the ontology file.
        parser (OWLParser, optional): An instance of the OWLParser class. Defaults to None.
        template_path (str, optional): Path to the directory containing the Jinja2 template. Defaults to './'.
        only_descendants_of (str, optional): The URI of the class that all data models must be descendants of. Defaults to 'http://www.cincodebio.org/cdbontology#Data'.
        """
        if parser and ontology_path == None:
            self.parser = parser
        else:
            self.parser = OWLParser()
            self.parser.load_ontology(ontology_path,only_descendants_of)

        # self.env = Environment(loader=FileSystemLoader(template_path))
        # self.template = self.env.get_template('api_data_model_template.py.j2')
        self.file_class = rdflib.URIRef('http://www.cincodebio.org/cdbontology#File')
        self.data_structure_class = rdflib.URIRef('http://www.cincodebio.org/cdbontology#DataStructure')
        self.primitive_class = rdflib.URIRef('http://www.cincodebio.org/cdbontology#Primitive')
        self.map2type = {
            'HashMap' : 'Dict',
            'List' : 'List',
            'Set' : 'Set',
            'String' : 'str',
            'Integer' : 'int',
            'Float' : 'float',
            'Double' : 'float',
        }

    def strip_namespace(self,uri):
        return uri.split('#')[-1]
    
    def serialize_type(self, py_type):
        type_map = {
            str: 'str',
            int: 'int',
            float: 'float',
            bool: 'bool',
            list: 'List',
            dict: 'Dict',
            set: 'Set',
            tuple: 'Tuple',
            None: 'NoneType'
        }
        return type_map.get(py_type, str(py_type))
    
    def get_datamodels(self):
        pn = self.parser.get_primary_namespace()
        dataModels = []
        # iterate over the topologically sorted nodes
        for node in self.parser.topo_sort_nodes_inheritance_and_attributes_graph:
            # check if node is a descendant of the primary namespace and not cdbontology
            if node.startswith(str(pn)):
                temp = {}
                temp.setdefault('name',self.strip_namespace(node))
                # get node details from nx graph
                node_details = self.parser.inheritance_only_graph.__dict__.get('_node').get(node)
                temp.setdefault('docs',node_details.get('docs'))
                # check if is a data structure or a primitive type, else file or normal class
                is_file = any(self.parser.is_descendant_of(rdflib.URIRef(sc),self.file_class) for sc in node_details.get('super_class_edges'))
                is_data_structure = any(self.parser.is_descendant_of(rdflib.URIRef(sc),self.data_structure_class) for sc in node_details.get('super_class_edges'))
                is_primitive = any(self.parser.is_descendant_of(rdflib.URIRef(sc),self.primitive_class) for sc in node_details.get('super_class_edges'))
                # if not a file, data structure or primitive type, then it is a class with attributes
                is_class_with_attributes = not any([is_file,is_data_structure,is_primitive])
                # if is a class with attributes, then add attributes key to temp
                if is_class_with_attributes:
                    temp.setdefault('attributes',[])

                # if node has attributes, then iterate over them
                if 'attributes' in node_details.keys():
                    for attribute in node_details['attributes']:
                        for k,v in attribute.items():
                            # if attribute value is a list, then iterate over it, 
                            if type(v) == list:
                                for i in v:
                                    if is_data_structure:
                                        temp.setdefault('typeParameters',[]).append(self.map2type.get(self.strip_namespace(i),self.strip_namespace(i)))
                                    else:
                                        raise ValueError('Only DataStruct value should be a list')
                            elif type(v) == dict:
                                local_temp = {}
                                # iterate over the key value pairs of the attribute
                                for k1,v1 in v.items():
                                    if is_data_structure:
                                        raise ValueError('DataStruct Attribute value must be a list')
                                    elif is_file:
                                        # need to handle Schema properties here..
                                        ...
                                    else:
                                        if type(v1) == type:
                                            local_temp[self.strip_namespace(k1).strip()] = self.serialize_type(v1).strip()
                                        else:
                                            local_temp[self.strip_namespace(k1).strip()] = self.strip_namespace(v1).strip()
                                # temporary fix for now -> need to handle schema properties
                                if is_class_with_attributes:    
                                    temp.get('attributes').append(local_temp)

                            else:
                                raise ValueError('Attribute value must be a list or dict')

                    # print()
                
                # check if is a data structure or a primitive type, else file or normal class
                if is_file:
                    temp.setdefault('type', DataModelType.AtomicFile.value)
                elif is_data_structure:
                    temp.setdefault('type', DataModelType.DataStructure.value)
                    # filter out super classes that are not data structures
                    ds_sc = [sc for sc in node_details.get('super_class_edges') if self.parser.is_descendant_of(rdflib.URIRef(sc),self.data_structure_class)]
                    assert len(ds_sc) == 1, 'Data Structure must have exactly one super class that is a data structure'
                    temp.setdefault('inheritance',self.map2type.get(self.strip_namespace(ds_sc[0])))
                    # print(temp)
                elif is_primitive:
                    temp.setdefault('type', DataModelType.Primitive.value)
                    # filter out super classes that are not primitives
                    p_sc = [sc for sc in node_details.get('super_class_edges') if self.parser.is_descendant_of(rdflib.URIRef(sc),self.primitive_class)]
                    assert len(p_sc) == 1, 'Primitive must have exactly one super class that is a primitive'
                    temp.setdefault('primitiveType',self.map2type.get(self.strip_namespace(p_sc[0])))
                
                elif is_class_with_attributes:
                    temp.setdefault('type', DataModelType.ClassWithAttributes.value)
                    # print(node)
                else:
                    # print(node)
                    raise ValueError('Unknown data model type')
                
                dataModels.append(temp)

        return dataModels

    def generate_api(self):
        dms = self.get_datamodels()
        self.template.stream(dataModels=dms).dump('test_models.py')
        

if __name__ == '__main__':
    api_gen = ApiDataModelCodeGen('https://colm-brandon-ul.github.io/cellmaps/ontology/v0.0.1/cellmaps.owl')
    import pprint
    print(pprint.pformat(api_gen.get_datamodels()))

    # Generate API
