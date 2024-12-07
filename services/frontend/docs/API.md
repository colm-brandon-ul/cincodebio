

# API Documentation

## Main Endpoints

### 1. Main Page
- **Route**: GET "/"
- **Description**: Renders the main page of the application.
- **Response**: HTML content

### 2. Data Manager
- **Route**: GET "/data-manager"
- **Description**: Displays the data upload portal.
- **Response**: HTML content

### 3. Get Form Details
- **Route**: GET "/data-manager/get-form-details"
- **Description**: Retrieves form details from the ontology manager.
- **Response**: JSON response with form details

### 4. SIB Manager
- **Route**: GET "/sib-manager"
- **Description**: Displays the SIB (Service Integration Bus) Manager interface.
- **Response**: HTML content with latest, installed, and rest SIBs

### 5. Workflows
- **Route**: GET "/workflows"
- **Description**: Displays all workflows.
- **Response**: HTML content

### 6. Single Workflow
- **Route**: GET "/workflows/{workflow_id}"
- **Description**: Renders the progress of a single workflow.
- **Response**: HTML content

### 7. Health Check WebSocket
- **Route**: WebSocket "/ws/healthcheck"
- **Description**: Provides real-time health status updates for different services.

## Authentication and Middleware

### Authentication Redirect
- **Route**: GET "/auth-redirect"
- **Description**: Serves an HTML page with JavaScript for authentication.

### HTTP Middleware
- **Functionality**: Redirects unauthenticated requests to the authentication page.
- **Exclusions**: Paths matching the regex `^/(app/)?(auth-redirect|static)(/.*)?$`

## Static Files

- **Route**: "/static"
- **Description**: Serves static files from the "static" directory.

# Additional Features

1. **Template Rendering**: Uses Jinja2 for HTML template rendering.
2. **WebSocket Support**: Implements a WebSocket connection manager for real-time communication.
3. **Service Mapping**: Uses a dictionary to map service names to their respective API ingress paths.
4. **Environment Variables**: Utilizes configuration variables for API paths and base directory.
