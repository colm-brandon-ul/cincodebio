# Creating a Domain Specific Ontology for CincoDeBio: A Comprehensive Guide

## Overview

The CincoDeBio core ontology provides a flexible framework for defining domain-specific ontologies through a structured, extensible approach. This guide outlines the key principles and best practices for extending the core ontology.

## CincoDeBio Core Ontology: Fundamental Concepts

### Core Ontological Concepts

The CincoDeBio ontology is built around three fundamental concepts that provide a comprehensive framework for representing biological research processes:

#### 1. Experiment Concept

**Purpose:** Defines the data and context associated with a biological experiment.

**Key Characteristics:**
- Captures the complete experimental context
- Maps experimental inputs, outputs, and metadata
- Provides a structured representation of scientific research processes

#### 2. Data Concept

**Purpose:** Maps file types, primitives, and data structures to domain-specific data types.

**Key Characteristics:**
- Standardizes data representation across different biological domains
- Provides a flexible mapping for various data formats
- Enables consistent data type interpretation

**Types of Mappings:**
- Primitive Data Types
  - Numerical types
  - String representations
  - Boolean values
- File Types
  - CSV
  - JSON
  - Image formats
  - Genomic data formats
- Complex Data Structures
  - Nested objects
  - Arrays
  - Key-value pairs

#### 3. Service Concept

**Purpose:** Defines input/output models that describe specific process types within the biological domain.

**Key Characteristics:**
- Represents computational or analytical processes
- Provides a standardized description of service interfaces
- Enables clear definition of input requirements and output expectations

**Example Service Types:**
- Data Processing Services
  - Normalization
  - Filtering
  - Transformation
- Computational Analysis Services
  - Sequence alignment
  - Gene expression analysis
  - Protein structure prediction
- Visualization Services
  - Plotting
  - Graphical representation of data

### Interrelationship of Concepts

These three concepts are interconnected:
- **Experiment** defines the context and parameters
- **Data** provides the structured representation of information
- **ServiceConcept** describes the computational processes applied to that data.

### Design Principles

1. **Flexibility:** Allows for extension and customization
2. **Standardization:** Provides consistent representation across different biological research domains
3. **Interoperability:** Enables communication between different systems and tools

### Implementation Considerations

When extending the ontology:
- Ensure clear mapping between these core concepts
- Maintain semantic consistency
- Use well-defined interfaces between different components

## Classes and Subclasses

The core ontology establishes a hierarchical class structure that serves as the foundation for domain-specific extensions. 

**Example of Subclass Hierarchy:**
- `Tabular` is a subclass of `File`
- `CSV` is a subclass of `Tabular`

## Properties

Properties define relationships and attributes associated with classes:
### Object Properties

#### 1. hasKey
- **Domain:** HashMap
- **Range:** Primitive
- **Description:** Relates a map to its keys
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasKey`

#### 2. hasValue
- **Domain:** HashMap
- **Range:** Data
- **Description:** Relates a map to its values
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasValue`

#### 3. listContains
- **Domain:** List
- **Range:** Data
- **Description:** Relates a list to its elements
- **Full URI:** `http://www.cincodebio.org/cdbontology#listContains`

#### 4. hasModelSpecification
- **Domain:** ServiceConcept
- **Description:** Used for creating service/process concepts
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasModelSpecification`

#### 5. hasInput
- **Domain:** hasModelSpecification
- **Range:** Data
- **Description:** Defining input for process concept model
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasInput`

#### 6. hasOutput
- **Domain:** hasModelSpecification
- **Range:** Data
- **Description:** Defining output for process concept model
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasOutput`

#### 7. hasFile
- **Domain:** Experiment
- **Range:** File
- **Description:** For adding files to an experiment
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasFile`

### Datatype Properties

#### 1. attributeName
- **Domain:** hasAttribute
- **Range:** String
- **Description:** Attaching a name for an attribute to a class
- **Full URI:** `http://www.cincodebio.org/cdbontology#attributeName`

#### 2. hasSchemaColumnType
- **Domain:** Thing
- **Range:** Resource
- **Description:** Adding schema column types
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasSchemaColumnType`

#### 3. schemaColumnName
- **Domain:** hasSchemaColumnType
- **Range:** String
- **Description:** Attaching a name for a schema column
- **Full URI:** `http://www.cincodebio.org/cdbontology#schemaColumnName`

#### 4. schemaColumnConstraint
- **Domain:** hasSchemaColumnType
- **Range:** String
- **Description:** Attaching a constraint to a schema column
- **Full URI:** `http://www.cincodebio.org/cdbontology#schemaColumnConstraint`

#### 5. hasFileExtension
- **Domain:** File
- **Range:** String
- **Description:** Represents the file extension of a file
- **Full URI:** `http://www.cincodebio.org/cdbontology#hasFileExtension`

#### 6. fileName
- **Domain:** hasFile
- **Range:** String
- **Description:** Attaching a name for a file
- **Full URI:** `http://www.cincodebio.org/cdbontology#fileName`

### Additional Observations

- Most properties are designed to support the three core concepts: Experiment, Data, and ServiceConcept
- Properties provide mechanisms for:
  - Defining data structures (hasKey, hasValue, listContains)
  - Describing service inputs and outputs
  - Managing file and attribute metadata
  - Creating flexible schema definitions


## Extending the Ontology

### Importing the Core Ontology

To begin extending the ontology, import the core CincoDeBio ontology:

```xml
<owl:Ontology rdf:about="your-new-ontology-url">
    <owl:imports rdf:resource="https://colm-brandon-ul.github.io/cincodebio/ontology/v0.0.1/cincodebio.owl" />
    <!-- Additional ontology metadata -->
</owl:Ontology>
```

### Defining New Classes and Properties

#### Creating Subclasses

Extend existing core classes with domain-specific subclasses:

```xml
<owl:Class rdf:about="http://www.yourdomain.org/ontology#CellSegmentation">
    <rdfs:subClassOf rdf:resource="http://www.cincodebio.org/cdbontology#ServiceConcept" />
    <!-- Additional subclass details -->
</owl:Class>
```

## Documenting Your Ontology

### Annotations

Provide comprehensive annotations to enhance clarity:
```xml
<rdfs:comment>This class describes a specific domain concept.</rdfs:comment>
<rdfs:label>DomainClassLabel</rdfs:label>
```

### Versioning and Metadata
Maintain clear version tracking:
```xml
<owl:Ontology>
    <owl:versionInfo rdf:datatype="http://www.w3.org/2001/XMLSchema#string">0.0.21/owl:versionInfo>
</owl:Ontology>
```

## Best Practices

1. **Consistency**
   - Maintain uniform naming conventions across classes and properties
   - Use clear, descriptive names that reflect the purpose of each element

2. **Reusability**
   - Leverage existing core ontology classes and properties
   - Minimize redundancy by extending rather than duplicating

3. **Validation**
   - Utilize ontology validation tools
   - Check for:
     - Logical consistency
     - Correctness of class and property definitions
     - Potential semantic errors

## Conclusion

By following these guidelines, developers can create robust, domain-specific ontologies that build upon the CincoDeBio core ontology, ensuring flexibility, extensibility, and semantic clarity.

---

*Version: 0.0.1*  
*Last Updated: November 2024*