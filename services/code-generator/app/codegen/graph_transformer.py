import json
from enum import Enum
import networkx as nx
from typing import List, Tuple, Any, Dict
import logging

class EdgeType(Enum):
    """Enumeration representing different types of edges."""
    ControlFlow = 1
    DataFlow = 2

class JsonParentType(str,Enum):
    """Enumeration representing different types of parent keys in the JSON data structure."""
    system_parameters  = 'system_parameters'
    service_parameters = 'service_parameters'
    workflow_parameters = 'workflow_parameters'
    data = 'data'

parent_map = {
    "SystemParameters": JsonParentType.system_parameters.value,
    "ServiceParameters": JsonParentType.service_parameters.value,
    "WorkflowParameters": JsonParentType.workflow_parameters.value,
    "Data": JsonParentType.data.value
}



class ComputationalGraphTransformer:
    """Class to transform the parsed hippoflow model into a computational graph suitable for code generation."""
    def __init__(self) -> None:
        pass

    @classmethod
    def sib_2_nx_node_and_edges(cls,sib: Dict, map: Dict) -> Tuple[Tuple[str,Dict], List[Tuple[str, str, Dict]]]:
        """
        Converts a SIB  dictionary into a node and edges representation for a graph.

        Args:
            sib (dict): The System Interface Block dictionary.
            map (dict): The mapping dictionary for subport identifiers.

        Returns:
            tuple: A tuple containing the node and edges representation of the SIB.
        """

        # define the input port map and output port map, which are dictionaries of port_identifier: port_properties
        ipm = {s['port_identifier']: s['port_properties'] for s in sib['ports'] if s['port_type'] == 'InputPort'}
        opm = {s['port_identifier']: s['port_properties'] for s in sib['ports'] if s['port_type'] == 'OutputPort'}

        # Define the node, with the identifier, type, name, value, input port map and output port map
        node = (sib['identifier'], dict(type=sib['type'], name=sib['properties']['name'], value=sib['properties']['label'], input_port_map=ipm, output_port_map=opm))

        # Edge list for set of edges (outgoing) associated with the SIB
        edges = []

        # iterate of ports
        for port in sib['ports']:
            # Only interested in OutputPorts and ControlFlow ports
            if port['port_type'] == 'OutputPort':
                # If there are dataflow edges 
                if port['dataflow']:
                    # iterate over each esge
                    for df in port['dataflow']:
                        # add the edge to the edge list, format source, target, edge_properties: dict (including edge_type to differenciate between control and data flow edges)
                        edges.append((
                            sib['identifier'], 
                            map[df['subport_identifier']], 
                            dict(edge_type=EdgeType.DataFlow, 
                                    data_type=port['port_properties']['typeName'], 
                                    name=port['port_properties']['name'], 
                                    is_list=port['port_properties']['isList'], 
                                    source_ip=port['port_identifier'], 
                                    target_ip=df['subport_identifier'],
                                    source_sib_name=sib['properties']['name'],
                                    source_sib_type=sib['properties']['label'])))
                        
                        # add the source_sib_name for resolving parentkeys in the json data structure
                        
            elif port['port_type'] == 'ControlFlow':
                # Simple fn that check if the branch condition is empty, if so replaces with 'success' (default control case)
                f1 = lambda x: x if x != '' else 'success'
                # same as abobe with dataflow edges (properaties are the simpler, only edge type and branch condition)
                edges.append((
                    sib['identifier'], 
                    port['port_identifier'], 
                    dict(edge_type=EdgeType.ControlFlow,
                            branch_condition=f1(port['port_properties']['cflabel']))))

        # return the node and the edge list for the SIB
        return node, edges
    
    @classmethod
    def get_port_2_sib_map(cls, hf: Dict) -> Dict:
        """
        Returns a dictionary mapping input port identifiers to their corresponding SIB identifiers.
        
        Args:
            hf (dict): The input dictionary containing information about siblings and ports.
            
        Returns:
            dict: A dictionary mapping input port identifiers to their corresponding SIB identifiers.
        """
        port_2_sib = {}
        for sib in hf['sibs']:
            sib_id = sib['identifier']

            for port in sib['ports']:
                if port['port_type'] == 'InputPort':
                    port_2_sib[port['port_identifier']] = sib_id

        return port_2_sib
    
    @classmethod
    def flow_2_nx_graph(cls,hpd: Dict) -> Tuple[nx.classes.multidigraph.MultiDiGraph, str]:
        """
        Converts a workflow represented as a dictionary into a directed acylic multigraph in NetworkX.

        Args:
            hpd (Dict): The workflow represented as a dictionary.

        Returns:
            Tuple[nx.classes.multidigraph.MultiDiGraph, str]: A tuple containing the directed multigraph
            representing the workflow and the root node of the graph.
        """
    
        # Get the mapping of input port identifiers to their corresponding SIB identifiers
        port2sib = ComputationalGraphTransformer.get_port_2_sib_map(hpd)
        nodes, edges = [], []

        # iterate over all SIBS and get nodes and edges
        for sib in hpd['sibs']:
            n, e = ComputationalGraphTransformer.sib_2_nx_node_and_edges(sib=sib,map=port2sib)
            nodes.append(n)
            edges.extend(e)

        # create the directed multigraph in networkx
        dg = nx.MultiDiGraph()
        dg.add_nodes_from(nodes)
        dg.add_edges_from(edges)

        
        # Check if the graph has cycles
        cycles = list(nx.simple_cycles(dg))
        # If there are cycles, raise an exception
        if cycles:
            raise Exception (f"Workflow has cycles: {cycles}. A workflow must be acyclic.")
        
        order = list(nx.topological_sort(dg))
        root = order[0]

        return dg, root
    

    @classmethod
    def get_comp_graph_datastructure(cls,dg, root, sib_map, branch_depth=0):
        logging.warning(f"Branch Depth: {branch_depth}")
        SPACER = "    "
        # current node in comp graph
        current_node = dg.nodes[root]

        graph = {
            'bd' : branch_depth,
            'sib' : root,
            'name' : current_node['name'],
            'concept' : sib_map['concepts'][current_node['name']],
            'children' : []
        }

        # get all the edges in & out
        out_edges = dg.out_edges(root,data=True)
        in_edges = dg.in_edges(root,data=True)

        # separate control flow and data flow edges
        cf_out_edges = [(s,t,d) for s,t,d in out_edges if d['edge_type'] == EdgeType.ControlFlow]
        df_in_edges = [(s,t,d) for s,t,d in in_edges if d['edge_type'] == EdgeType.DataFlow]
        df_out_edges = [(s,t,d) for s,t,d in out_edges if d['edge_type'] == EdgeType.DataFlow]

        # internal parameters (in the context of forms being rendered or similar, this informs the tool build which form fields to not render as they're not used)
        df_out_sources = [d['source_ip'] for s,t,d in df_out_edges]
        df_bools = {v['name']: k in df_out_sources for k,v in current_node['output_port_map'].items() }
        # here the data/workflow_parameters/service_parameters keys could be added

        # ,"parent_type": current_node['input_port_map'][d['target_ip']]['typeName']
        fn_inputs = {
            current_node['input_port_map'][d['target_ip']]['name'] : 
            {'source_sib' : s , 'source_key' : d["name"],
             "source_parent_key": parent_map[sib_map['outputs'][d['source_sib_name']][f"{d['name']}:{d['data_type']}"]],
             "parent_key": parent_map[sib_map['inputs'][current_node['name']][f"{current_node['input_port_map'][d['target_ip']]['name']}:{current_node['input_port_map'][d['target_ip']]['typeName']}"]]}
                     for s,t,d in df_in_edges}       
        

        graph['data'] = {
            'dataflow' : df_bools,
            'data' : fn_inputs
        }
        # print(SPACER*branch_depth, f"{current_node['name']} - \n{SPACER*(branch_depth+1)}dataflow bools {df_bools}, \n{SPACER*(branch_depth+1)}fn input f{fn_inputs}, \n{SPACER*(branch_depth+1)}fn output {root}\n")
        logging.warning(f"CF EDGES {cf_out_edges}")
        # there is no branch, simply recurse
        if len(cf_out_edges) == 1:
            graph['children'].append((cf_out_edges[0][2]['branch_condition'],ComputationalGraphTransformer.get_comp_graph_datastructure(dg, cf_out_edges[0][1],sib_map, branch_depth)))
        
        # there is a branch
        # loop over candidates and recurse for each
        else:
            for cf in cf_out_edges:
                # print(SPACER*branch_depth,f"branch condition: {cf[0]}['control'] == {cf[2]['branch_condition']}")
                graph['children'].append((cf[2]['branch_condition'], ComputationalGraphTransformer.get_comp_graph_datastructure(dg, cf[1],sib_map, branch_depth+1)))


        return graph
    
    

    @staticmethod
    def transform_graph(model_dict: Dict, concept_map: Dict) -> Dict:
        # convert the parsed model into a nx multograph
        DG, root_node = ComputationalGraphTransformer.flow_2_nx_graph(model_dict)
        logging.warning(f"DG : {DG.__dict__}")
        

        # convert the nx multigraph into a computational graph data structure for code generation

        cg = ComputationalGraphTransformer.get_comp_graph_datastructure(DG, root_node, concept_map)


        return cg

