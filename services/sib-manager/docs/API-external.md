## API Documentation

This API provides endpoints for managing SIB files and related operations. Below is a detailed description of each endpoint.

### SIB File Hash Checking

#### POST /check-sib-file-hash

Checks the hash of a single SIB file.

**Request Body:**
```json
{
  "fileHash": "string"
}
```

**Response:**
```json
{
  "hashValid": "VALID" | "INVALID"
}
```

#### POST /check-sib-files-hashes

Checks the hashes of multiple SIB files.

**Request Body:**
```json
{
  "fileHashes": {
    "file1.sib": "hash1",
    "file2.sib": "hash2"
  }
}
```

**Response:**
```json
{
  "hashesValid": {
    "file1.sib": "VALID" | "INVALID",
    "file2.sib": "VALID" | "INVALID"
  }
}
```

### UTD SIB File Operations

#### GET /get-utd-sib-file

Retrieves the UTD SIB file content.

**Response:**
```json
{
  "file": "string"
}
```

#### POST /get-missing-sib-files

Retrieves the content of SIB files that are not in the provided list.

**Request Body:**
```json
{
  "file_ids": ["file1.sib", "file2.sib"]
}
```

**Response:**
```json
{
  "files": {
    "file3.sib": "content3",
    "file4.sib": "content4"
  }
}
```

#### POST /get-utd-sib-files

Retrieves the content of specified SIB files.

**Request Body:**
```json
{
  "file_ids": ["file1.sib", "file2.sib"]
}
```

**Response:**
```json
{
  "files": {
    "file1.sib": "content1",
    "file2.sib": "content2"
  }
}
```

### SIB Management

#### GET /sync-sibs-with-registry

Synchronizes SIBs with the registry.

**Response:** None

#### GET /get-installed-sibs

Retrieves the list of installed SIBs.

**Response:**
```json
[
  {
    "name": "SIB1",
    "version": "1.0.0"
  },
  {
    "name": "SIB2",
    "version": "2.1.0"
  }
]
```

#### GET /get-uninstalled-sibs

Retrieves the list of available but not installed SIBs.

**Response:**
```json
[
  {
    "name": "SIB3",
    "version": "1.5.0"
  },
  {
    "name": "SIB4",
    "version": "3.0.0"
  }
]
```

#### POST /update-installed-sibs

Updates the list of installed SIBs.

**Request Body:**
```json
[
  {
    "name": "SIB1",
    "version": "1.1.0"
  },
  {
    "name": "SIB3",
    "version": "1.5.0"
  }
]
```

**Response:**
```json
{
  "status": "success" | "failure"
}
```

## Notes

- All endpoints return JSON responses.
- Some endpoints are marked as deprecated and were used for the Eclipse-based IME.
- The API uses FastAPI and includes background task processing for certain operations.
- File operations are performed on a persistent state mount path.
- Windows users may receive responses with converted newlines (CRLF) for compatibility.