from rdflib import Graph, URIRef, Literal, term, XSD
from rdflib.namespace import RDF, RDFS, OWL
from typing import Dict, Set, Tuple
import networkx as nx
import requests
from urllib.parse import urlparse
import os
from utils import Serializable


class OWLParser(Serializable):
    """A Class for parsing and analyzing OWL/RDF ontologies."""
    
    def __init__(self):
        self.graph = Graph()
        self.inheritance_only_graph = nx.DiGraph()
        self.inheritance_and_attributes_graph = nx.DiGraph()
        self.classes: Dict[str, Set[str]] = {}
        self.properties: Dict[str, Dict] = {}
        self.individuals: Dict[str, Set[str]] = {}
        self.loaded_imports: Set[str] = set()
        self.cdb_nspace = 'http://www.cincodebio.org/cdbontology'
        self.cdb_attributes = [
            f'{self.cdb_nspace}#hasAttribute',
            f'{self.cdb_nspace}#attributeName',
            f'{self.cdb_nspace}#hasFile',
            f'{self.cdb_nspace}#hasFileExtension',
            f'{self.cdb_nspace}#fileName',
            f'{self.cdb_nspace}#hasKey',
            f'{self.cdb_nspace}#hasValue',
            f'{self.cdb_nspace}#hasInput',
            f'{self.cdb_nspace}#hasOutput',
            f'{self.cdb_nspace}#hasModelSpecification',
            f'{self.cdb_nspace}#listContains',
            f'{self.cdb_nspace}#hasSchemaColumnType',
            f'{self.cdb_nspace}#schemaColumnName',
            f'{self.cdb_nspace}#schemaColumnConstraint',
            ]
        # Mapping from XSD types to Python types
        self.xsd_to_python = {
            XSD.string: str,
            XSD.boolean: bool,
            XSD.decimal: float,
            XSD.float: float,
            XSD.double: float,
            XSD.hexBinary: bytes,
            XSD.base64Binary: bytes,
            XSD.anyURI: str,
            XSD.normalizedString: str,
            XSD.token: str,
            XSD.language: str,
            XSD.NMTOKEN: str,
            XSD.NMTOKENS: str,
            XSD.Name: str,
            XSD.NCName: str,
            XSD.ID: str,
            XSD.IDREF: str,
            XSD.IDREFS: str,
            XSD.ENTITY: str,
            XSD.ENTITIES: str,
            XSD.integer: int,
            XSD.nonPositiveInteger: int,
            XSD.negativeInteger: int,
            XSD.long: int,
            XSD.int: int,
            XSD.short: int,
            XSD.byte: int,
            XSD.nonNegativeInteger: int,
            XSD.unsignedLong: int,
            XSD.unsignedInt: int,
            XSD.unsignedShort: int,
            XSD.unsignedByte: int,
            XSD.positiveInteger: int,
        }

        self.attributes = []


    # Function to convert RDF literal to Python type using the mapping
    def rdf_literal_to_python(self,literal):
        return self.xsd_to_python.get(literal, str(literal))
    
    # Function to check if a node is a descendant of another node
    def is_descendant_of(self, descendant, node):
        if (descendant, RDFS.subClassOf, node) in self.graph:
            return True
        for subclass in self.graph.subjects(RDFS.subClassOf, node):
            if self.is_descendant_of(descendant, subclass):
                return True
        return False
        
    def _is_url(self, path: str) -> bool:
        """Check if the given path is a URL."""
        try:
            result = urlparse(path)
            return all([result.scheme, result.netloc])
        except ValueError:
            return False
            
    def _load_from_url(self, url: str) -> str:
        """
        Download ontology from URL and save to temporary file.
        
        Args:
            url: URL of the ontology
            
        Returns:
            Path to the downloaded file
        """
        response = requests.get(url)
        if response.status_code == 200:
            # Create a temporary file with appropriate extension
            file_extension = '.owl'  # default extension
            if 'content-type' in response.headers:
                content_type = response.headers['content-type'].lower()
                if 'turtle' in content_type:
                    file_extension = '.ttl'
                elif 'n-triples' in content_type:
                    file_extension = '.nt'
                elif 'n3' in content_type:
                    file_extension = '.n3'
            
            tmp_file = f"temp_ontology_{hash(url)}{file_extension}"
            with open(tmp_file, 'wb') as f:
                f.write(response.content)
            return tmp_file
        else:
            raise Exception(f"Failed to download ontology from {url}. Status code: {response.status_code}")
            
    def _handle_imports(self) -> None:
        """
        Handle owl:imports statements in the ontology.
        Recursively loads all imported ontologies.
        """
        for ontology in self.graph.subjects(RDF.type, OWL.Ontology):
            for imported in self.graph.objects(ontology, OWL.imports):

                import_url = str(imported)
                
                if import_url not in self.loaded_imports:
                    self.loaded_imports.add(import_url)
                    
                    try:
                        if self._is_url(import_url):
                            tmp_file = self._load_from_url(import_url)
                            self.graph.parse(tmp_file)
                            # Clean up temporary file
                            os.remove(tmp_file)
                        else:
                            self.graph.parse(import_url)
                            
                        # Recursively handle imports in the imported ontology
                        self._handle_imports()
                    except Exception as e:
                        print(f"Warning: Failed to load imported ontology {import_url}: {str(e)}")
    
    def load_ontology(self, file_path: str, descendents_of: str = None) -> None:
        """
        Load an OWL/RDF ontology from a file or URL.
        
        Args:
            file_path: Path or URL to the OWL/RDF file
        """
        try:
            if self._is_url(file_path):
                tmp_file = self._load_from_url(file_path)
                self.graph.parse(tmp_file)
                os.remove(tmp_file)
            else:
                self.graph.parse(file_path)
                
            # Handle imports before processing the ontology
            self._handle_imports()
            self._extract_classes(URIRef(descendents_of) if descendents_of else None)
            self._build_network()
            
        except Exception as e:
            raise Exception(f"Failed to load ontology: {str(e)}")
        
    def _extract_classes(self, dnode = None) -> None:
        """
            Extract all classes, their attributes and their inheritence relationships from the ontology.

            Args:
                dnode: URI of the class to extract. If provided, only extract descendants of this class. (works as a filter)

            returns:
                None
        """

        for class_uri in self.graph.subjects(RDF.type, OWL.Class):

            if dnode and not self.is_descendant_of(class_uri, dnode):
                continue

            self.classes[str(class_uri)] = self.node_details(class_uri)
    


    def node_details(self,class_uri):
        """
            Extract all details of a class node from the ontology.

            Args:
                class_uri: URI of the class node
        
        """

        nd = {
            'super_class_edges': [],
        }

        def set_nested_value(d, keys, value):

            def serialise_key(key):
                if isinstance(key, URIRef):
                    # check if BNode
                    if isinstance(key, term.BNode):
                        return key
                    else:
                        return str(key)
                return key


            for key in keys[:-1]:
                d = d.setdefault(serialise_key(key), {})
            # this should check if the key already exists
            if serialise_key(keys[-1]) in d.keys():
                if isinstance(d[serialise_key(keys[-1])], list):
                    d[str(keys[-1])].append(value)
                else:
                    d[serialise_key(keys[-1])] = [d[serialise_key(keys[-1])], value]
            else:
                d[serialise_key(keys[-1])] = value


        def check_predicates(_class_uri, indent=0, parent_pred=[]):
            """
                Recursively check all predicates of a class node.
                
                Args:
                    _class_uri: URI of the class node
                    indent: Indentation level for printing
                    parent_pred: List of parent predicates (also includes BNodes)
                
                Returns:
                    None
            """
            # iterate over all predicates and objects of the class
            for p,o in self.graph.predicate_objects(_class_uri):
                # check if the predicate is a subclass
                if p == RDFS.subClassOf:
                    # if the object is a BNode, it is a nested class
                    if isinstance(o, term.BNode):
                        temp = parent_pred.copy()
                        temp.append(o)
                        check_predicates(o,indent+1, parent_pred=temp)
                    # if the object is a URIRef, it is a superclass
                    else:
                        nd['super_class_edges'].append(str(o))
                # check if the predicate is an attribute defined in the CDB ontology
                elif str(p) in self.cdb_attributes:
                    # if the object is a BNode, it is a nested attribute
                    if isinstance(o, term.BNode):
                        temp = parent_pred.copy()
                        temp.append(o)
                        temp.append(str(p))
                        check_predicates(o,indent+1, parent_pred=temp)
                    # if the object is a URIRef or Literal, it is a simple attribute
                    elif isinstance(o, URIRef):
                        # Maybe need to handle this better?
                        t = ['attributes',*parent_pred]
                        t.append(str(p))
                        set_nested_value(nd, t, str(o))
                    # if the object is a Literal, it is a simple attribute
                    elif isinstance(o, Literal):
                        t = ['attributes',*parent_pred]
                        t.append(str(p))
                        set_nested_value(nd, t, str(o))
                    # raise error as we don't know what to do with this object
                    else:
                        raise Exception('Unknown type', p, o)
                # check if the predicate is a label or comment
                elif p == RDFS.label:
                    nd['label'] = str(o)
                # check if the predicate is a comment
                elif p == RDFS.comment:
                    nd['comment'] = str(o)
                # check if the predicate is a type
                elif p == RDF.type:
                    # if the object is a URIRef, it is a type for an attribute
                    if o != OWL.Class and o != OWL.NamedIndividual and o != OWL.Restriction:
                        t = ['attributes',*parent_pred]
                        t.append('type')
                        set_nested_value(nd, t, self.rdf_literal_to_python(o))
                    else:
                        ...
                # check if the predicate is an onProperty
                elif p == OWL.onProperty:
                    # if the object is a URIRef, it is a type for an attribute
                    if o != OWL.Class:
                        t = ['attributes',*parent_pred]
                        t.append('onProperty')
                        set_nested_value(nd, t, self.rdf_literal_to_python(o))
                    # ... unknown type
                    else:
                        print('-', parent_pred, p, o)

                # check if the predicate is a someValuesFrom
                elif p == OWL.allValuesFrom:
                    # if the object is a URIRef, it is a type for an attribute
                    if o != OWL.Class:
                        t = ['attributes',*parent_pred]
                        t.append('allValuesFrom')
                        set_nested_value(nd, t, self.rdf_literal_to_python(o))
                    # ... unknown type
                    else:
                        print('-', parent_pred, p, o)
                # unknown predicate
                elif p == OWL.disjointWith:
                    nd.setdefault('disjointWith', [])
                    nd['disjointWith'].append(str(o))

                elif p == OWL.unionOf:
                    # this should be a list of classes
                    nd.setdefault('unionOf', [])
                    nd['unionOf'].append(str(o))
                else: 
                    print('-Unknown type', p, o)
        check_predicates(class_uri)
        if 'attributes' in nd.keys():
            nd['attributes'] = self._refactor_attributes(nd['attributes'])
        return nd
    
    

    def _refactor_attributes(self,attributes):
        """
        Refactor the attributes of a class to a nested
        dictionary structure.
        """
        # Function to check if a URI is a property or a class
        def check_uri_type(uri):
            uri_ref = URIRef(uri)
            # Check if the URI is a property
            if (uri_ref, RDF.type, RDF.Property) in self.graph or (uri_ref, RDF.type, OWL.ObjectProperty) in self.graph or (uri_ref, RDF.type, OWL.DatatypeProperty) in self.graph:
                return RDF.Property
            # Check if the URI is a class
            elif (uri_ref, RDF.type, RDFS.Class) in self.graph or (uri_ref, RDF.type, OWL.Class) in self.graph:
                return RDFS.Class
            else:
                raise Exception(f"Unknown type for URI: {uri}")


        def restructure_dictionary(input_dict):
            restructured = []

            for key, value in input_dict.items():
                if isinstance(key,term.BNode) and isinstance(value, dict):
                    if len(value.keys()) > 1:
                        tl = list(value.values())
                        tl.sort(key=lambda x: check_uri_type(x))

                        restructured.append({
                            tl[0] : tl[1:]
                        })                         
                    else: 
                        for inner_key, inner_value in value.items():
                            restructured.append({
                                inner_key: inner_value
                            })
                else:
                    restructured.append({
                        key: value
                    })
            return restructured
        
        return restructure_dictionary(attributes)
    
    def _build_network(self) -> None:
        # change_ns = lambda k:  k.replace('http://www.cincodebio.org/cdbontology#','cdb:').replace('http://www.cellmaps.org/cellmapsontology#','cm:')
        def change_ns(k):
            return k
        nodes = []
        edges = []
        attri_edges = []

        for k,v in self.classes.items():
            # add node with attributes
            nodes.append((change_ns(k),v))
            for sc in v['super_class_edges']:
                edges.append((change_ns(sc),change_ns(k), {'edge_type': 'superClassOf'}))
            atr = v.get('attributes',None)
            if type(atr) == list:
                for a in atr:
                    for k_,v_ in a.items():
                        # need to make this more general
                        if k_ in ['http://www.cincodebio.org/cdbontology#hasKey', 'http://www.cincodebio.org/cdbontology#hasValue','http://www.cincodebio.org/cdbontology#hasAttribute']:
                            if type(v_) == list:
                                [attri_edges.append((change_ns(k),change_ns(_v),{'edge_type': k_})) for _v in v_]
                            elif type(v_) == dict:
                                # filter out python types
                                if type(v_['type']) != type:
                                    attri_edges.append((change_ns(k),change_ns(v_['type']),{'edge_type': k_}))
                                    ...
                                else:
                                    # primitive type(s)
                                    # print(v_)
                                    ...
                        else:
                            # need to handle hasModelSpecification (as this can have a nested structure)
            
                            # print(k_,v_)
                            ...


        
        self.inheritance_only_graph.add_nodes_from(nodes)
        self.inheritance_only_graph.add_edges_from(edges)

        self.inheritance_and_attributes_graph.add_nodes_from(nodes)
        self.inheritance_and_attributes_graph.add_edges_from(edges)
        self.inheritance_and_attributes_graph.add_edges_from(attri_edges)
        # sorted
        self.topo_sort_nodes_inheritance_and_attributes_graph = list(nx.topological_sort(self.inheritance_and_attributes_graph))
        self.topo_sort_nodes_inheritance_and_attributes_graph.reverse()
    
    
    def get_primary_namespace(self):
        return dict(list(self.graph.namespaces())).get('')
    
    def visualize(self, gt: bool = False, output_file: str = 'ontology.png') -> None:
        """
        Visualize the ontology using NetworkX and save to a file.
        
        Args:
            output_file: Path to save the visualization
        """

        if gt:
            nx_graph = self.inheritance_and_attributes_graph
        else:
            nx_graph = self.inheritance_only_graph


        
        try:
            import matplotlib.pyplot as plt

            # perhaps should remove graphviz dependency
            pos = nx.nx_agraph.graphviz_layout(nx_graph, prog='dot', args='-Gnodesep=1000 -Goverlap=false -Gsplines=true')
            plt.figure(figsize=(96, 64))
            nx.draw(nx_graph, pos, node_size=3000, node_color='lightblue',font_size=6)
            for node, (x, y) in pos.items():
                plt.text(x, y, node, fontsize=16, ha='center', va='center', rotation=45)

            plt.savefig('cellmaps-ontology.png')
        except Exception as e:
            print(e)

    def get_version_info(self) -> Tuple[str,str,str]:
        query = """
        PREFIX owl: <http://www.w3.org/2002/07/owl#>
        PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
        SELECT ?s ?version ?label
        WHERE {
            ?s a owl:Ontology .
            OPTIONAL { ?s owl:versionInfo ?version }
            OPTIONAL { ?s rdfs:label ?label }
        }
        """
        # Execute the query
        results = self.graph.query(query)
        
        ds = None
        cdb = None
        # Collect results
        results = list(results)

        assert len(results) == 2, 'There should be exactly two version info properties in the ontology'


        for row in results:
            if 'cincodebio' in str(row.label):
                cdb = str(row.version)

            else:
                ds_ontology_name = str(row.label)
                ds = str(row.version)
            
        assert ds is not None and cdb is not None, 'Both version info properties must be present in the ontology'
        
        return ds,cdb, ds_ontology_name


if __name__ == '__main__':
    parser = OWLParser()
    parser.load_ontology('https://colm-brandon-ul.github.io/cellmaps/ontology/v0.0.1/cellmaps.owl')