import os
import requests
import json
SERVICE_API = os.environ.get('SERVICE_API_SERVICE_HOST')
WORKFLOW_LOG_PATH = os.environ.get('WORKFLOW_LOGS_PATH')
EXECUTION_API_SOCKET_ADDRESS = os.environ.get('EXECUTION_API_SERVICE_HOST')
# time.sleep(random.randint(1,30))
workflow_id = "WORKFLOW_ID"
experiment_data_bucket_name = 'experiment-bucket'
workflow_bucket_name = 'workflow-bucket'
# Rather than hardcoding the external URL, we can use the service name to get the external URL
CDB_EXTERNAL_URL = 'http://192.168.64.2/services-api'

logging.info(workflow_id)

# As soon as the script begins executing, this sets the workflow state to processing
res = requests.post(f"http://{EXECUTION_API_SOCKET_ADDRESS}/control/update-workflow/{workflow_id}", json={"status": "processing"})
logging.warning(res.content)


# Submit Second Job to Service
res = requests.post(f"http://{SERVICE_API}/start/init-tma", 
                    json={'system_parameters' : {
                          'data_flow': {"whole_slide_image" : True,
                           "protein_channel_markers" : True,
                           "nuclear_stain": True,
                           "nuclear_markers" : True,
                           "membrane_markers": True,}
                    },},
                    headers = {
                        "cdb-workflow-id": workflow_id,
                        "cdb-external-url": CDB_EXTERNAL_URL 
                        })

logging.warning(res.content)
job_details = json.loads(res.content)
logging.warning(job_details)

while True:
    f = open(f"{WORKFLOW_LOG_PATH}/{workflow_id}.txt", "r")
    if job_details["id"] in f.readlines()[-1]:
        # The execution API has written to the logs that the job with that id has been completed
        break

logging.info(f"Job {job_details['id']} is completed")

# Get Results
res = requests.get(f"http://{SERVICE_API}/init/init-tma/{job_details['id']}")
result_1 = json.loads(res.content)

logging.warning(result_1)

