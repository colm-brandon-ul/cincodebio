# Minio Data Management API

## Overview

This API provides a set of endpoints for managing data storage and retrieval using Minio, an object storage server. It offers functionalities for checking prefixes, generating presigned URLs for uploads, adding tags to objects, and retrieving data as zip files.

## External Endpoints

### 1. Check Prefix

**Endpoint:** `/check-prefix`
**Method:** GET

Checks if a given prefix exists in the Minio bucket.

**Query Parameters:**
- `prefix` (string): The prefix to check.

**Returns:**
- Boolean: `true` if the prefix does not exist, `false` if it exists.

### 2. Get Presigned Upload URL

**Endpoint:** `/get-presigned-upload-url`
**Method:** GET

Generates a presigned URL for uploading an object to the Minio bucket.

**Query Parameters:**
- `prefix` (string): The prefix for the object name.
- `object_name` (string): The name of the object to be uploaded.
- `content_type` (string): The content type of the object.

**Returns:**
- String: The presigned URL for uploading the object.

### 3. Add Tags

**Endpoint:** `/add-tags`
**Method:** GET

Adds tags to an object in the Minio bucket.

**Query Parameters:**
- `prefix` (string): The prefix of the object's path.
- `object_name` (string): The name of the object.
- `experimental_tag` (string): The experimental tag to be added.
- `file_tag` (string): The file-specific tag to be added.

**Returns:**
- JSON object with a success message.

### 4. Get Job Data as Zip

**Endpoint:** `/get-job-data-as-zip/{job_id}`
**Method:** GET

Retrieves job data as a zip file.

**Path Parameters:**
- `job_id` (string): The ID of the job.

**Returns:**
- Streaming response of the zip file.

### 5. Get Workflow Data as Zip

**Endpoint:** `/get-workflow-data-as-zip/{workflow_id}`
**Method:** GET

Retrieves workflow data as a zip file.

**Path Parameters:**
- `workflow_id` (string): The ID of the workflow.

**Returns:**
- Streaming response of the zip file.

## Key Features

1. **Prefix Management**: Allows checking for the existence of prefixes in the Minio bucket.
2. **Secure Uploads**: Generates presigned URLs for secure object uploads.
3. **Object Tagging**: Supports adding custom tags to objects for better organization and retrieval.
4. **Data Retrieval**: Provides endpoints to download job and workflow data as zip files.
5. **Integration with Minio Console API**: Utilizes Minio Console API for efficient zip file generation and download.

This API facilitates data management operations, making it easier to handle uploads, downloads, and organization of data in a Minio-based storage system.