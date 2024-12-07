# API Documentation

This document outlines the endpoints available in our API.

## Endpoints

### Health Check

```
GET /health
```

Returns the health status of the API.

**Response:**
```json
{
  "status": "healthy"
}
```

### Current Ontology Version

```
GET /current-ontology-version
```

Retrieves the current version of the ontology.

**Response:**
The response format is not specified in the provided code.

### Form Models

```
GET /form-models
```

Retrieves the form models from the ontology manager.

**Response:**
Returns a `FormSchema` object. The exact structure of `FormSchema` is not provided in the code snippet.

### API Data Models

```
GET /api-data-models
```

Retrieves the API data models.

**Response:**
Returns a list of `ModelSchema` objects. The exact structure of `ModelSchema` is not provided in the code snippet.

## Models

The API uses the following models:

- `FormSchema`: Used to generate form form models from ontology
- `ModelSchema`: Used for generate API data models from ontology

## Handlers

The API utilizes the following handler functions:

- `handle_form_schema_gen()`: Generates the form schema
- `handle_api_data_model_gen()`: Generates the API data models
