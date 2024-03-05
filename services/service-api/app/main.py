from fastapi import FastAPI, WebSocket, File, UploadFile, BackgroundTasks, Request
from fastapi.responses import HTMLResponse
import requests 
import json
import logging 
import os

from .k8sjobs import submit_k8s_job
from .models import *

app = FastAPI()
JMS_ADDRESS = f"{os.environ.get('JOBS_API_SERVICE_HOST')}:{os.environ.get('JOBS_API_SERVICE_PORT')}" # jobsapi


@app.get("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


# # INIT TMA
# # Submit Interactive Job
# @app.post("/init/init-tma", response_model=InitTMA_Input_Response)
# async def init_tma_interactive_submit(
#     data: InitTMA_Input_Request, request: Request, background_tasks: BackgroundTasks):
#     logging.warning(data)
#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
#     job_state = json.loads(res.content)

#     background_tasks.add_task(
#         interactive_callback_to_execution, 
#         routing_key = 'task.initialise.init-tma-1',
#         data= data.model_dump(), 
#         # Need to replace with a non-hardcoded method for this
#         base_url='http://localhost:6001/', 
#         job_state = job_state)
    
#     return InitTMA_Input_Response(**job_state)


# @app.get("/init/init-tma/frontend/{job_id}", response_class=InitTMA_FrontEnd_Response)
# async def init_tma_interactive_frontend(job_id: str):
#     # Get Job from DATABASE
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     job_state = json.loads(res.content)
#     # Get Frontend from Job Object
#     return InitTMA_FrontEnd_Response(job_state['frontend'])


# @app.post("/init/init-tma/submit/{job_id}",response_model=InitTMA_InteractionInput_Response)
# async def init_tma_interactive_submit_interaction(job_id: str, data: InitTMA_InteractionInput_Request, request: Request, background_tasks: BackgroundTasks):
#     logging.warning('SUBMIT INTERACTION')
#     logging.warning(job_id)
#     logging.warning(data)
#     background_tasks.add_task(
#         interactive_submit_interaction_callback_to_execution,
#         routing_key = 'task.initialise.init-tma-2',
#         data= data.model_dump(), 
#         job_id = job_id)
#     return InitTMA_InteractionInput_Response(**{'url': create_redirect_to_execution_env_link(job_id=job_id)})

# @app.get("/init/init-tma/{job_id}",response_model=InitTMA_Output_Response)
# async def init_tma_interactive_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return InitTMA_Output_Response(**job_state['data'])

# # INIT WSI

# # Submit Interactive Job
# @app.post("/init/init-wsi", response_model=InitWSI_Input_Response)
# async def init_wsi_interactive_submit(
#     data: InitWSI_Input_Request, request: Request, background_tasks: BackgroundTasks):
#     logging.warning(data)
#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
#     job_state = json.loads(res.content)

#     background_tasks.add_task(
#         interactive_callback_to_execution, 
#         routing_key = 'task.initialise.init-wsi-1',
#         data= data.model_dump(), 
#         base_url='http://localhost:6001/', 
#         job_state = job_state)
    
#     return InitWSI_Input_Response(**job_state)


# @app.get("/init/init-wsi/frontend/{job_id}", response_class=InitWSI_FrontEnd_Response)
# async def init_wsi_interactive_frontend(job_id: str):
#     # Get Job from DATABASE
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     job_state = json.loads(res.content)
#     # Get Frontend from Job Object
#     return InitWSI_FrontEnd_Response(job_state['frontend'])


# @app.post("/init/init-wsi/submit/{job_id}",response_model=InitWSI_InteractionInput_Response)
# async def init_wsi_interactive_submit_interaction(job_id: str, data: InitWSI_InteractionInput_Request, request: Request, background_tasks: BackgroundTasks):
#     logging.warning('SUBMIT INTERACTION')
#     logging.warning(job_id)
#     logging.warning(data)
#     background_tasks.add_task(
#         interactive_submit_interaction_callback_to_execution, 
#         routing_key = 'task.initialise.init-wsi-2',
#         data= data.model_dump(), 
#         job_id = job_id)
#     return InitWSI_InteractionInput_Response(**{'url': create_redirect_to_execution_env_link(job_id=job_id)})

# @app.get("/init/init-wsi/{job_id}",response_model=InitWSI_Output_Response)
# async def init_wsi_interactive_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return InitWSI_Output_Response(**job_state['data'])

# # Segarray TMA
# @app.post("/dearray/segarray-tma", 
#           response_model=SegArrayTMA_Input_Response,
#           response_model_exclude_none=True)
# async def segarray_tma_automated_submit(
#     data: SegArrayTMA_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.de-array.segarray-tma',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return SegArrayTMA_Input_Response(**job_state)

# @app.get("/dearray/segarray-tma/{job_id}", response_model=SegArrayTMA_Output_Response)
# async def segarray_tma_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return SegArrayTMA_Output_Response(**job_state['data'])

# # ManualDearray TMA

# # Submit Interactive Job
# @app.post("/dearray/manual-dearray-tma", response_model=ManualDearrayTMA_Input_Response)
# async def manual_dearray_tma_interactive_submit(
#     data: ManualDearrayTMA_Input_Request, request: Request, background_tasks: BackgroundTasks):
#     logging.warning(data)
#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
#     job_state = json.loads(res.content)

#     background_tasks.add_task(
#         interactive_callback_to_execution, 
#         routing_key = 'task.de-array.manual-dearray-tma-1',
#         data = data.model_dump(),
#         base_url='http://localhost:6001/', 
#         job_state = job_state)
    
#     return ManualDearrayTMA_Input_Response(**job_state)


# @app.get("/dearray/manual-dearray-tma/frontend/{job_id}", 
#          response_class=ManualDearrayTMA_FrontEnd_Response)
# async def manual_dearray_tma_interactive_frontend(job_id: str):
#     # Get Job from DATABASE
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     job_state = json.loads(res.content)
#     # Get Frontend from Job Object
#     return ManualDearrayTMA_FrontEnd_Response(job_state['frontend'])


# @app.post("/dearray/manual-dearray-tma/submit/{job_id}",
#           response_model=ManualDearrayTMA_InteractionInput_Response)
# async def manual_dearray_tma_interactive_submit_interaction(
#     job_id: str, 
#     data: ManualDearrayTMA_InteractionInput_Request, 
#     request: Request, 
#     background_tasks: BackgroundTasks):

#     logging.warning('SUBMIT INTERACTION')
#     logging.warning(job_id)
#     logging.warning(data)
#     background_tasks.add_task(
#         interactive_submit_interaction_callback_to_execution, 
#         routing_key = 'task.de-array.manual-dearray-tma-2',
#         data = data.model_dump(),
#         job_id = job_id)
#     return ManualDearrayTMA_InteractionInput_Response(**{
#         'url': create_redirect_to_execution_env_link(job_id=job_id)})

# @app.get("/dearray/manual-dearray-tma/{job_id}",
#          response_model=ManualDearrayTMA_Output_Response)
# async def manual_dearray_tma_interactive_result(job_id: str):
#     # Get job from JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return ManualDearrayTMA_Output_Response(**job_state['data'])

# # EditPredictedROIs TMA

# # Submit Interactive Job
# @app.post("/dearray/edit-predicted-rois-tma", 
#           response_model=EditPredictedROIsTMA_Input_Response)
# async def edit_predicted_rois_tma_interactive_submit(
#     data: EditPredictedROIsTMA_Input_Request, request: Request, background_tasks: BackgroundTasks):
#     logging.warning(data)
#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
#     job_state = json.loads(res.content)

#     background_tasks.add_task(
#         interactive_callback_to_execution, 
#         routing_key = 'task.de-array.edit-predicted-rois-1',
#         data = data.model_dump(),
#         base_url='http://localhost:6001/', 
#         job_state = job_state)
    
#     return EditPredictedROIsTMA_Input_Response(**job_state)


# @app.get("/dearray/edit-predicted-rois-tma/frontend/{job_id}", 
#          response_class=EditPredictedROIsTMA_FrontEnd_Response)
# async def edit_predicted_rois_tma_interactive_frontend(job_id: str):
#     # Get Job from DATABASE
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     job_state = json.loads(res.content)
#     # Get Frontend from Job Object
#     return EditPredictedROIsTMA_FrontEnd_Response(job_state['frontend'])


# @app.post("/dearray/edit-predicted-rois-tma/submit/{job_id}",
#           response_model=EditPredictedROIsTMA_InteractionInput_Response)
# async def edit_predicted_rois_tma_interactive_submit_interaction(
#     job_id: str, 
#     data: EditPredictedROIsTMA_InteractionInput_Request, 
#     request: Request, 
#     background_tasks: BackgroundTasks):

#     logging.warning('SUBMIT INTERACTION')
#     logging.warning(job_id)
#     logging.warning(data)
#     background_tasks.add_task(
#         interactive_submit_interaction_callback_to_execution, 
#         routing_key = 'task.de-array.edit-predicted-rois-2',
#         data = data.model_dump(),
#         job_id = job_id)
#     return EditPredictedROIsTMA_InteractionInput_Response(**{'url': create_redirect_to_execution_env_link(job_id=job_id)})

# @app.get("/dearray/edit-predicted-rois-tma/{job_id}",
#          response_model=EditPredictedROIsTMA_Output_Response)
# async def edit_predicted_rois_tma_interactive_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return EditPredictedROIsTMA_Output_Response(**job_state['data'])

# # Crop Cores TMA
# @app.post("/dearray/crop-cores-tma", 
#           response_model=CropCoresTMA_Input_Response,
#           response_model_exclude_none=True)
# async def crop_cores_tma_automated_submit(
#     data: CropCoresTMA_Input_Request, background_tasks: BackgroundTasks, request: Request):
#     logging.warning('CROP CORES TMA')
#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')
#     logging.warning(data.model_dump())
#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.de-array.crop-cores-tma',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return CropCoresTMA_Input_Response(**job_state)

# @app.get("/dearray/crop-cores-tma/{job_id}", 
#          response_model=CropCoresTMA_Output_Response)
# async def crop_cores_tma_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state['data'])

#     return CropCoresTMA_Output_Response(**job_state['data'])


# # ACE TMA
# @app.post("/technical-variance-correction/ace-tma", 
#           response_model=AceTMA_Input_Response,
#           response_model_exclude_none=True)
# async def ace_tma_tma_automated_submit(
#     data: AceTMA_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.technical-variance-correction.ace-tma',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return AceTMA_Input_Response(**job_state)

# @app.get("/technical-variance-correction/ace-tma/{job_id}", 
#          response_model=AceTMA_Output_Response)
# async def ace_tma_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return AceTMA_Output_Response(**job_state['data'])

# # ACE WSI
# @app.post("/technical-variance-correction/ace-wsi", 
#           response_model=AceWSI_Input_Response,
#           response_model_exclude_none=True)
# async def ace_wsi_automated_submit(
#     data: AceWSI_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.technical-variance-correction.ace-wsi',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return AceWSI_Input_Response(**job_state)

# @app.get("/technical-variance-correction/ace-wsi/{job_id}", 
#          response_model=AceWSI_Output_Response)
# async def ace_wsi_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return AceWSI_Output_Response(**job_state['data'])


# # Deepcell TMA
# @app.post("/cell-segmentation/deepcell-tma", 
#           response_model=DeepcellTMA_Input_Response,
#           response_model_exclude_none=True)
# async def deepcell_tma_automated_submit(
#     data: DeepcellTMA_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.cell-segmentation.deepcell.segment-tma',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return DeepcellTMA_Input_Response(**job_state)

# @app.get("/cell-segmentation/deepcell-tma/{job_id}", 
#          response_model=DeepcellTMA_Output_Response)
# async def deepcell_tma_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return DeepcellTMA_Output_Response(**job_state['data'])


# # Deepcell WSI
# @app.post("/cell-segmentation/deepcell-wsi", 
#           response_model=DeepcellWSI_Input_Response,
#           response_model_exclude_none=True)
# async def deepcell_wsi_automated_submit(
#     data: DeepcellWSI_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.cell-segmentation.deepcell.segment-wsi',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return DeepcellWSI_Input_Response(**job_state)

# @app.get("/cell-segmentation/deepcell-wsi/{job_id}", 
#          response_model=DeepcellWSI_Output_Response)
# async def deepcell_wsi_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return DeepcellWSI_Output_Response(**job_state['data'])


# # Tabular Extraction TMA
# @app.post("/feature-extraction/tabular-extraction-tma", 
#           response_model=TabularExtractionTMA_Input_Response,
#           response_model_exclude_none=True)
# async def tabular_extraction_tma_automated_submit(
#     data: TabularExtractionTMA_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'task.data-extraction.tabular-extraction-tma',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return TabularExtractionTMA_Input_Response(**job_state)

# @app.get("/feature-extraction/tabular-extraction-tma/{job_id}", 
#          response_model=TabularExtractionTMA_Output_Response)
# async def tabular_extraction_tma_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return TabularExtractionTMA_Output_Response(**job_state['data'])

# # Tabular Extraction WSI
# @app.post("/feature-extraction/tabular-extraction-wsi", 
#           response_model=TabularExtractionWSI_Input_Response,
#           response_model_exclude_none=True)
# async def tabular_extraction_wsi_automated_submit(
#     data: TabularExtractionWSI_Input_Request, background_tasks: BackgroundTasks, request: Request):

#     logging.warning(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

#     # Create job in JMS
#     res = requests.post(
#         f"http://{JMS_ADDRESS}/create-job/", 
#         json={'workflow': data.system_parameters.workflow_id})
    
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     logging.warning(job_state)

#     # job_state = {"id": str(uuid.uuid4()),"workflow": workflow_id,"job_status":"submitted"}
#     background_tasks.add_task(
#         callback_to_execution, 
#         routing_key = 'abc',
#         data = data.model_dump(), 
#         job_state = job_state)
    
#     return TabularExtractionWSI_Input_Response(**job_state)

# @app.get("/feature-extraction/tabular-extraction-wsi/{job_id}", 
#          response_model=TabularExtractionWSI_Output_Response)
# async def tabular_extraction_tma_automated_result(job_id: str):
#     # Create job in JMS
#     res = requests.get(
#         f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
#     logging.warning(f"Status: {res.status_code}")
#     # logging.warning(res.content)
#     job_state = json.loads(res.content)

#     return TabularExtractionWSI_Output_Response(**job_state['data'])