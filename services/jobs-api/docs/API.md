# Jobs API Documentation

This document describes the Jobs API, a FastAPI-based service for managing job states in a workflow system.

## Overview

The Jobs API provides endpoints for creating, updating, retrieving, and deleting job states. It uses MongoDB for data persistence and includes a callback mechanism to notify an execution service about job state changes.

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

### Create Job

```
POST /create-job/
```

Creates a new job in the system.

**Request Body:** `CreateJobState` object

**Response:** `JobState` object

### Update Job

```
PUT /update-job/{id}
```

Updates an existing job by its ID.

**Path Parameters:**
- `id`: The ID of the job to update

**Request Body:** `UpdateJobState` object

**Response:** Updated `JobState` object

### Get Job by ID

```
GET /get-job-by-id/{id}
```

Retrieves a job by its ID.

**Path Parameters:**
- `id`: The ID of the job to retrieve

**Response:** `JobState` object

### Get Jobs by Workflow ID

```
GET /get-jobs-by-workflow-id/{workflow_id}
```

Retrieves all jobs associated with a specific workflow ID.

**Path Parameters:**
- `workflow_id`: The ID of the workflow

**Response:** List of `JobState` objects

### Delete Job by ID

```
DELETE /delete-job-by-id/{id}
```

Deletes a job by its ID.

**Path Parameters:**
- `id`: The ID of the job to delete

**Response:** 
- Status code 204 if successful
- Status code 404 if job not found

## Models

The API uses the following main models:

- `CreateJobState`: Used for creating new jobs
- `UpdateJobState`: Used for updating existing jobs
- `JobState`: Represents the full state of a job


## Callback Mechanism

After creating or updating a job, the API sends a callback to an execution service. The address of this service is configured through the `EXECUTION_ADDRESS` environment variable.

## Error Handling

The API uses HTTP status codes to indicate the success or failure of requests:

- 200: Successful operation
- 204: Successful deletion
- 404: Resource not found
- 500: Internal server error

## Dependencies

The API relies on several Python libraries:

- FastAPI
- PyMongo
- Requests
- Pydantic 

## Notes

- The API uses background tasks for callbacks to ensure quick response times.
- All database operations are performed asynchronously to improve performance.