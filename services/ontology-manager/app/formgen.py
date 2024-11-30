from utils import Serializable

import rdflib.term
from ontparse import OWLParser
import rdflib
from typing import Dict
from rdflib import RDF, OWL

class FormGen(Serializable):
    def __init__(self,ontology_path, parser = None, template_path = './templates',only_descendants_of=rdflib.URIRef('http://www.cincodebio.org/cdbontology#Experiment')):
        if parser and not ontology_path:
            self.parser = parser
        else:
            self.parser = OWLParser()
            self.parser.load_ontology(ontology_path,only_descendants_of)
        
        self.only_descendants_of = only_descendants_of
        self.CDB = rdflib.Namespace('http://www.cincodebio.org/cdbontology#')
        self.XSD = rdflib.Namespace('http://www.w3.org/2001/XMLSchema#')

    def strip_namespace(self,uri):
        return uri.split('#')[-1]
    
    def get_form_schema(self) -> Dict:
        self.parser.get_primary_namespace()
        experiments = {}

        for node in self.parser.topo_sort_nodes_inheritance_and_attributes_graph:
            node_uri = rdflib.URIRef(node)
            if self.parser.is_descendant_of(node_uri,self.only_descendants_of):
                exp_name = self.strip_namespace(node).replace('Experiment', '').upper()
                experiments.setdefault(exp_name,[])
                # Find all hasFile predicates for this class
                for s, p, o in self.parser.graph.triples((node_uri, self.CDB.hasFile, None)):
                    # Initialize file types and name
                    file_types = []
                    file_name = None
                    # Handle file type (which might be a BNode or a Union)
                    for _, type_pred, type_obj in self.parser.graph.triples((o, RDF.type, None)):
                        # If it's a Union type with BNodes
                        if type_obj == OWL.Class:
                            # Find the unionOf predicate
                            for _, union_pred, union_obj in self.parser.graph.triples((type_obj, OWL.unionOf, None)):
                                # Traverse the RDF list
                                current = union_obj
                                while current and current != RDF.nil:
                                    # Get the first item in the list
                                    for _, first_pred, first_obj in self.parser.graph.triples((current, RDF.first, None)):
                                        file_types.append(self.strip_namespace(str(first_obj)))
                                    
                                    # Move to the next item in the list
                                    for _, rest_pred, rest_obj in self.parser.graph.triples((current, RDF.rest, None)):
                                        current = rest_obj
                        # If it's a BNode
                        elif isinstance(type_obj,rdflib.term.BNode):
                             # Find the unionOf predicate
                            for _, union_pred, union_obj in self.parser.graph.triples((type_obj, OWL.unionOf, None)):
                                # Traverse the RDF list

                                current = union_obj
                                while current and current != RDF.nil:
                                    # Get the first item in the list
                                    for _, first_pred, first_obj in self.parser.graph.triples((current, RDF.first, None)):
                                        temp = {}
                                        

                                        for _, file_type_pred, file_type_obj in self.parser.graph.triples((first_obj, self.CDB.hasFileExtension, None)):
                                            temp.setdefault('file_extensions',[]).append(self.strip_namespace(str(file_type_obj)))

                                        temp.setdefault('type',self.strip_namespace(str(first_obj)))
                                        
                                        file_types.append(temp) 
                                    # Move to the next item in the list
                                    for _, rest_pred, rest_obj in self.parser.graph.triples((current, RDF.rest, None)):
                                        current = rest_obj
                    
                    # Get the file name (ensuring it's a string)
                    for _, name_pred, name_obj in self.parser.graph.triples((o, self.CDB.fileName, None)):
                        # Check if the name is a typed literal with XSD string
                        if name_obj.datatype == self.XSD.string:
                            file_name = str(name_obj)
                    
                    # Add to file info if we found anything
                    if file_types or file_name:
                        experiments.get(exp_name).append(
                            {
                                'name' : file_name.strip(),
                                'files': file_types
                            })

        return experiments    

    

    def generate_form(self):
        pass


if __name__ == '__main__':
    fg = FormGen('/Users/colmbrandon/cdb-ontology-parser/cdb_form_gen/local_onto/cellmaps.owl')
    import pprint
    pprint.pprint(fg.get_form_schema())