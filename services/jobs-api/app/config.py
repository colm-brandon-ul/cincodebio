import os
EXECUTION_ADDRESS = f"{os.environ.get('EXECUTION_API_SERVICE_HOST')}:{os.environ.get('EXECUTION_API_SERVICE_PORT')}" # jobsapi
MONGODB_HOST = os.environ.get("MONGODB_SERVICE_HOST")
MONGODB_PORT = os.environ.get("MONGODB_SERVICE_PORT")
# Database Table and Collection ENV variables
JOBS_DB = os.environ.get('JOBS_DB')
JOBS_COLLECTION = os.environ.get('JOBS_COLLECTION')