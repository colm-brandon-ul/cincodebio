import os
import logging
# Creates the logs directory
def create_logs_directory(WORKFLOW_LOG_PATH: str):
# If the workflow logs directory doesn't exist, create it
    if not os.path.exists(WORKFLOW_LOG_PATH):
        # Create a new directory because it does not exist
        os.makedirs(WORKFLOW_LOG_PATH, exist_ok=True)
        logging.info("Created Workflow Log Path")

# Creates the Workflow Log file and writes it to the logs directory
def create_workflow_log_file(WORKFLOW_LOG_PATH: str, uuid: str):
    try:
        f = open(f"{WORKFLOW_LOG_PATH}/{uuid}.txt", "x")
        f.write("Log File Created\n")
        f.close()
        logging.info(f"Created Log File for Workflow: {uuid}")      
    except FileExistsError:
        # Shouldn't be possible?
        pass
    except Exception as e:
        logging.warning(str(e))

def update_workflow_log_file(WORKFLOW_LOG_PATH: str, workflow_id: str, job_id: str):
    with open(f"{WORKFLOW_LOG_PATH}/{workflow_id}.txt", "a") as f:
        f.write(f'{job_id}\n')