## API Documentation

This API provides internal endpoints for managing workflows, handling job callbacks, and retrieving workflow information. Here's a detailed description of the available endpoints:

### Health Check

```
GET /health
```

Checks the health status of the API.

**Response:**
- Status Code: 200 (OK)
- Content: JSON object with the status

```json
{
  "status": "healthy"
}
```

### Handle Callbacks

```
POST /control/callback/{workflow_id}
```

Handles callbacks from the Job Management Service for various job states.

**Parameters:**
- `workflow_id` (path parameter): The unique identifier of the workflow.

**Request Body:**
- Content-Type: `application/json`
- Schema: `JobState` object

**Behavior:**
- Updates the database and log files based on the job status:
  - `completed`: Updates the database and log file
  - `awaiting_interaction`: Updates the database
  - `submitted`: Adds the job state to the workflow in the database
  - `accepted`: Updates the job status in the database
  - `interaction_accepted`: Updates the job status in the database
  - `processing`: Updates the job status in the database
  - `failed`: Not implemented (TODO)

### Update Workflow State

```
POST /control/update-workflow/{workflow_id}
```

Updates the state of a specific workflow.

**Parameters:**
- `workflow_id` (path parameter): The unique identifier of the workflow to update.

**Request Body:**
- Content-Type: `application/json`
- Schema: `UpdateWorkflow` object

### Get Workflow by ID

```
GET /get-worfklow/{workflow_id}
```

Retrieves a specific workflow by its ID.

**Parameters:**
- `workflow_id` (path parameter): The unique identifier of the workflow to retrieve.

**Response:**
- Content-Type: `application/json`
- Schema: `Workflow` object

## Models

### JobState

Represents the state of a job within a workflow.

**Properties:**
- `id`: Unique identifier of the job
- `job_status`: Current status of the job (e.g., "completed", "awaiting_interaction", "submitted", etc.)

### JobStatus

Enum representing possible job statuses.

### UpdateWorkflow

Represents the data structure for updating a workflow.

### Workflow

Represents a complete workflow object.
