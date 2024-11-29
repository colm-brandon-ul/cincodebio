from functools import lru_cache
import json
from typing import Any, Dict


class HippoFlowTransformerV2:
    TYPE_MAP = {"cincodebio:inputport": "InputPort",
                        "cincodebio:outputport" : "OutputPort",
                        "cincodebio:automatedsib" : "ServiceSIB",
                        "cincodebio:interactivesib": "TaskSIB",
                        "cincodebio:dataflow" : "DataFlow",
                        "cincodebio:controlflow": "ControlFlow",
                        "cincodebio:siblabel": "SIBLabel"}
    
    KEY_MAP = {
                ('cincodebio:cincodebiographmodel','id') : 'HippoFlow',
                ('cincodebio:cincodebiographmodel', '_containments'): 'sibs',
                ("cincodebio:automatedsib",'_containments') : 'ports',
                ("cincodebio:interactivesib",'_containments') : 'ports',
                ("cincodebio:automatedsib",'id') : 'identifier',
                ("cincodebio:interactivesib",'id') : 'identifier',
                ("cincodebio:automatedsib",'_attributes') : 'properties', 
                ("cincodebio:interactivesib",'_attributes') : 'properties', 
                ('cincodebio:outputport', 'id' ) : 'port_identifier',
                ('cincodebio:outputport', '_attributes' ) : 'port_properties',
                ('cincodebio:outputport', 'type' ) : 'port_type',    
                ('cincodebio:inputport', 'id' ) : 'port_identifier',
                ('cincodebio:inputport', '_attributes' ) : 'port_properties',
                ('cincodebio:inputport', 'type' ) : 'port_type',   
                ('cincodebio:siblabel', 'id' ) : 'port_identifier',
                ('cincodebio:siblabel', '_attributes' ) : 'port_properties',
                ('cincodebio:siblabel', 'type' ) : 'port_type', 
                ('cincodebio:dataflow', 'id' ) : 'dfid',
                ('cincodebio:dataflow', 'targetID' ) : 'subport_identifier',
                ('cincodebio:dataflow', 'type' ) : 'subport_type',    
                ('cincodebio:controlflow', 'id' ) : 'cfid',
                ('cincodebio:controlflow', 'targetID' ) : 'port_identifier',
                ('cincodebio:controlflow', 'type' ) : 'port_type',    
                ('cincodebio:controlflow', 'label' ) : 'cflabel',
            }
    keys2remove = ['documentation', '_position', '_size','instanceType', 'modelId','modelType','filePath','icon', '_routingPoints', 'validBranches']
    
    @classmethod
    @lru_cache(maxsize=256)
    def get_mapped_type(cls, original_type):
        return cls.TYPE_MAP.get(original_type, original_type)
    
    @classmethod
    @lru_cache(maxsize=512)
    def get_mapped_key(cls, context, original_key):
        return cls.KEY_MAP.get((context, original_key), original_key)
    
    # operates on the data in place
    @classmethod
    def remove_irrelevant_keys(cls,data):
        if isinstance(data, dict):
            for key in list(data.keys()):
                if key in cls.keys2remove:
                    del data[key]
            for child in data.values():
                cls.remove_irrelevant_keys(child)
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    cls.remove_irrelevant_keys(item)

    @classmethod
    def parse_edges(cls,edges, context: str = None):
        control_flow = {}
        data_flow = {}

        for data in edges:
            if isinstance(data, dict):
                
                context = data.get('type', context)

                if context == 'cincodebio:dataflow':
                    data_flow.setdefault(data.get('sourceID'),[]).append(
                        {
                        'subport_type': cls.get_mapped_type(data.get('type')),
                        'subport_identifier': data.get('targetID'),
                        'dfid': data.get('id')
                        }
                    )
                    

                elif context == 'cincodebio:controlflow':
                    control_flow.setdefault(data.get('sourceID'),[]).append(
                        {
                            'port_type': cls.get_mapped_type(data.get('type')),
                            'port_identifier': data.get('targetID'),
                            'port_properties': {
                                'cflabel': data.get('_attributes').get('label'),
                                'cfid': data.get('id')
                            }
                        }
                    )
        return control_flow, data_flow
    
    @classmethod
    def  parse_nodes(cls,data: Any, control_flow: dict ,data_flow: dict , indent=0, context: str=None) -> Any:
        if isinstance(data, dict):
            context = data.get('type', context)

            if context == 'cincodebio:outputport':
                if data.get('type', None):
                    if data.get('id') in data_flow.keys():
                        data['dataflow'] = data_flow.get(data.get('id'))
                    else:
                        data['dataflow'] = None
                ...
            elif context == 'cincodebio:inputport':
                ...
            elif context == 'cincodebio:siblabel':
                if data.get('type', None):
                    data['_attributes'] = data['_attributes']['label']
            elif context == 'cincodebio:automatedsib':
                if data.get('type', None):
                    data.setdefault('index', None)
                    data['_attributes'].setdefault('libraryComponentUID', data.get('_primeReference').get('instanceId'))
                    data.pop('_primeReference', None)
                    if data.get('id') in control_flow.keys():
                        data.get('_containments').extend(control_flow.get(data.get('id')))
            elif context == 'cincodebio:interactivesib':
                if data.get('type', None):
                    data.setdefault('index', None)
                    data['_attributes'].setdefault('libraryComponentUID', data.get('_primeReference').get('instanceId'))
                    data.pop('_primeReference', None)
                    if data.get('id') in control_flow.keys():
                        data.get('_containments').extend(control_flow.get(data.get('id')))


            elif context == 'cincodebio:cincodebiographmodel':
                data.pop('_attributes', None)
                data.pop('type', None)

        
        if isinstance(data, list):
            local = list()
            for item in data:
                if isinstance(item, dict):
                    local.append(cls.parse_nodes(item,control_flow,data_flow, indent+1, context=context))
                else:
                    local.append(cls.get_mapped_type(item))
                
            return local
            
        elif isinstance(data, dict):
            local = dict()
            for key, value in data.items():
                if isinstance(value, dict):
                    local[cls.get_mapped_key(context,key)] =  cls.parse_nodes(value,control_flow,data_flow,indent+1, context=context)
                elif isinstance(value, list):
                    local[cls.get_mapped_key(context,key)] =  cls.parse_nodes(value,control_flow,data_flow, indent+1, context=context)
                else:
                    local[cls.get_mapped_key(context,key)] = cls.get_mapped_type(value)
                
            return local
    

    @staticmethod
    def transform(data: Dict) -> Any:
        HippoFlowTransformerV2.remove_irrelevant_keys(data)
        control_flow, data_flow = HippoFlowTransformerV2.parse_edges(data.pop('_edges', None))
        return HippoFlowTransformerV2.parse_nodes(data,control_flow,data_flow)
        


if __name__ == "__main__":
    with open('/Users/colmbrandon/sib-gen-v2/workflow-gen-v2/source.json') as f:
        data = json.load(f)
    import pprint
    pprint.pprint(HippoFlowTransformerV2.transform(data))
