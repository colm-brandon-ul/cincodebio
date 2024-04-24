code = """import time, os, requests, json
WORKFLOW_LOG_PATH = os.getenv('WORKFLOW_LOG_PATH')
WORKFLOW_ID = '6628f6bd3544c25ec984303c'
# Keyword for killing the workflow
KILL_WORFLOW = 'KWORKFLOW'
TIMEOUT = 60


# Global Environment variables - same across all workflow programs
SERVICE_API = os.environ.get('SERVICE_API_SERVICE_HOST')
WORKFLOW_LOG_PATH = os.environ.get('WORKFLOW_LOGS_PATH')
EXECUTION_API_SOCKET_ADDRESS = os.environ.get('EXECUTION_API_SERVICE_HOST')

# specific to each workflow program
CDB_EXTERNAL_URL = 'http://192.168.64.2/'
# Does this depend on automated or interactive?
HEADERS = {
    "cdb-workflow-id": WORKFLOW_ID,
    "cdb-external-url": CDB_EXTERNAL_URL 
    }

# --- Shared API handling functions ---
def monitor_logs_6628f6bd3544c25ec984303c(
        job_id: str) -> bool:


    continue_wf = True
    # Get logs
    while True:
        # Get logs file
        f = open(f"{WORKFLOW_LOG_PATH}/{WORKFLOW_ID}.txt", "r")

        if job_id in f.readlines()[-1]:
        # The execution API has written to the logs that the job with that id has been completed
            f.close()
            break

        elif KILL_WORFLOW in f.readlines()[-1]:
            # The execution API has written to the logs that the job with that id has been killed
            f.close()
            continue_wf = False
            break

        
        f.close()
        # Wait for 1 second 
        time.sleep(1)

    return continue_wf

def submit_job_6628f6bd3544c25ec984303c(url: str, headers: dict, data: dict) -> str:

    while True:
        res = requests.post(
            url=url,
            headers=headers,
            json=data,
            timeout=TIMEOUT
        )

        # rolling update case
        if res.status_code in [502, 503, 504]:
            # wait for 1 second and try again
            time.sleep(1)
            continue

        else:
            # raise an error if the request was not successful
            res.raise_for_status()
            # else break loop
            break
    
    # return the job id
    return json.loads(res.content)['id']



def get_results_6628f6bd3544c25ec984303c(url: str) -> dict:


    while True:
        res = requests.get(
            url=url,
            timeout=TIMEOUT
        )

        # rolling update case
        if res.status_code in [502, 503, 504]:
            # wait for 1 second and try again
            time.sleep(1)
            continue

        else:
            # raise an error if the request was not successful
            res.raise_for_status()
            # else break loop
            break
    
    return json.loads(res.content)
# --- --- --- --- --- --- --- --- --- ---
# --- Workflow specific functions ---





sib_api_submit_endpoint = f'http://{SERVICE_API}/start/init-tma'
job_id__Zop_IQGHEe_VG6OBafcrYg = submit_job_6628f6bd3544c25ec984303c(
    url = sib_api_submit_endpoint,
    headers = HEADERS,
    data ={ 'system_parameters': {'dataflow': {'tissue_micro_array': True, 'nuclear_stain': True, 'nuclear_markers': False, 'membrane_markers': False, 'protein_channel_markers': False} }}) # this is what needs to be populated
# Monitor logs
continue_wf = monitor_logs_6628f6bd3544c25ec984303c(job_id=job_id__Zop_IQGHEe_VG6OBafcrYg)
if not continue_wf: exit() ; # Kill the workflow
# Get results

sib_api_result_endpoint = f'http://{SERVICE_API}/start/init-tma/{job_id__Zop_IQGHEe_VG6OBafcrYg}'
# will throw exception if not successful
sib_id__Zop_IQGHEe_VG6OBafcrYg =  get_results_6628f6bd3544c25ec984303c(url=sib_api_result_endpoint)




sib_api_submit_endpoint = f'http://{SERVICE_API}/de-array/seg-array-tma'
job_id__cFM6EQGHEe_VG6OBafcrYg = submit_job_6628f6bd3544c25ec984303c(
    url = sib_api_submit_endpoint,
    headers = HEADERS,
    data ={ 'system_parameters': {'dataflow': {'predicted_rois': True} },
            'data': {
                'tissue_micro_array': sib_id__Zop_IQGHEe_VG6OBafcrYg['data']['tissue_micro_array'], },
            'workflow_parameters': {
                'nuclear_stain': sib_id__Zop_IQGHEe_VG6OBafcrYg['workflow_parameters']['nuclear_stain'], }}) # this is what needs to be populated
# Monitor logs
continue_wf = monitor_logs_6628f6bd3544c25ec984303c(job_id=job_id__cFM6EQGHEe_VG6OBafcrYg)
if not continue_wf: exit() ; # Kill the workflow
# Get results

sib_api_result_endpoint = f'http://{SERVICE_API}/de-array/seg-array-tma/{job_id__cFM6EQGHEe_VG6OBafcrYg}'
# will throw exception if not successful
sib_id__cFM6EQGHEe_VG6OBafcrYg =  get_results_6628f6bd3544c25ec984303c(url=sib_api_result_endpoint)




sib_api_submit_endpoint = f'http://{SERVICE_API}/de-array/edit-predicted-rois-tma'
job_id__gDetgQGHEe_VG6OBafcrYg = submit_job_6628f6bd3544c25ec984303c(
    url = sib_api_submit_endpoint,
    headers = HEADERS,
    data ={ 'system_parameters': {'dataflow': {'rois': False} },
            'data': {
                'tissue_micro_array': sib_id__Zop_IQGHEe_VG6OBafcrYg['data']['tissue_micro_array'], },
            'workflow_parameters': {
                'nuclear_stain': sib_id__Zop_IQGHEe_VG6OBafcrYg['workflow_parameters']['nuclear_stain'],
                'predicted_rois': sib_id__cFM6EQGHEe_VG6OBafcrYg['workflow_parameters']['predicted_rois'], }}) # this is what needs to be populated
# Monitor logs
continue_wf = monitor_logs_6628f6bd3544c25ec984303c(job_id=job_id__gDetgQGHEe_VG6OBafcrYg)
if not continue_wf: exit() ; # Kill the workflow
# Get results

sib_api_result_endpoint = f'http://{SERVICE_API}/de-array/edit-predicted-rois-tma/{job_id__gDetgQGHEe_VG6OBafcrYg}'
# will throw exception if not successful
sib_id__gDetgQGHEe_VG6OBafcrYg =  get_results_6628f6bd3544c25ec984303c(url=sib_api_result_endpoint)"""