## API Documentation

This API provides endpoints for managing workflows, submitting models, and retrieving workflow states. Here's a detailed description of the available endpoints:

### Kill Workflow

```
GET /kill-worflow/{workflow_id}
```

Terminates a specific workflow.

**Parameters:**
- `workflow_id` (path parameter): The unique identifier of the workflow to be terminated.

### Submit Model

```
POST /model/submit
```

Submits a model for processing and creates a new workflow.

**Parameters:**
- `model` (file): The model file to be uploaded.
- `v2` (query parameter, optional): Boolean flag for version 2 processing.

**Request Body:**
- Content-Type: `multipart/form-data`

**Response:**
- Status Code: 202 (Accepted)
- Content: JSON object containing the URL for tracking the workflow

```json
{
  "url": "https://example.com/app/workflows/{uuid}"
}
```

### Get All Workflows

```
GET /get-workflows
```

Retrieves all workflow objects from the database.

**Response:**
- Content-Type: `application/json`
- Body: List of `WorkflowState` objects

### Workflow State WebSocket

```
WebSocket /state/ws/{workflow_id}
```

Establishes a WebSocket connection to receive real-time updates on the state of a specific workflow.

**Parameters:**
- `workflow_id` (path parameter): The unique identifier of the workflow to monitor.

**WebSocket Communication:**
- The server sends JSON-encoded `WorkflowState` objects to the client.
- The connection is maintained until the workflow status becomes "completed" or the client disconnects.

## Models

### Workflow

Represents a workflow in the system.

**Properties:**
- `status`: Current status of the workflow (e.g., "submitted")
- `state`: List of workflow states

### WorkflowState

Represents the state of a workflow at a given point in time.

### WorkflowStatus

Enum representing possible workflow statuses (e.g., "completed").

