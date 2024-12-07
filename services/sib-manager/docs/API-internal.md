# API Documentation

This document outlines the endpoints and functionality of the API.

## Endpoints

### Health Check

```
GET /health
```

This endpoint performs a health check on the API.

**Response:**
```json
{
  "status": "healthy"
}
```

### Get SIB Map

```
GET /get-sib-map
```

This endpoint retrieves the SIB (Service Information Block) map.

**Response:**
The response is a JSON object containing the SIB map, which is read from the file specified by `SIB_MAP_FILE` in the persistent state mount path.

### SIB Manager State

```
GET /sib-manager-state
```

This endpoint retrieves the state of the SIB Manager, including information about the latest, installed, and other SIBs.

**Response:**
```json
{
  "latest": ["sib1", "sib2", ...],
  "installed": ["sib3", "sib4", ...],
  "rest": ["sib5", "sib6", ...]
}
```

- `latest`: An alphabetically sorted list of service names from the latest SIBs.
- `installed`: An alphabetically sorted list of service names from the installed SIBs.
- `rest`: An alphabetically sorted list of service names from other SIBs.
