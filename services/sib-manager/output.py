# Quite similar to helm!

from typing import Annotated
from fastapi import FastAPI, BackgroundTasks, Header, Request
from fastapi.responses import HTMLResponse
import requests 
import json
import logging 
import time 
import random
import uuid
import os


from .models import *
from .utils import create_redirect_to_execution_env_link


app = FastAPI()


EXECUTION_ADDRESS = os.environ.get('EXECUTION_API_SOCKET_ADDRESS')
JMS_ADDRESS = os.environ.get('JMS_API_SOCKET_ADDRESS')







@app.post("/feature-extraction/xtracit-wsi", 
          response_model=XtracitWSI_Input_Response,
          response_model_exclude_none=True)
async def xtracit_wsi_submit(
    data: XtracitWSI_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.feature-extraction.xtracit-wsi.process',
        image_name = "oalowbxkyp:pgy",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return XtracitWSI_Input_Response(**job_state)



@app.get("/feature-extraction/xtracit-wsi/{job_id}", 
         response_model=XtracitWSI_Output_Response)
async def xtracit_wsi_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return XtracitWSI_Output_Response(**job_state['data'])


@app.post("/cell-segmentation/cell-seg-dtma", 
          response_model=CellSegDTMA_Input_Response,
          response_model_exclude_none=True)
async def cell_seg_dtma_submit(
    data: CellSegDTMA_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.cell-segmentation.cell-seg-dtma.process',
        image_name = "kjboradkvq:nhu",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return CellSegDTMA_Input_Response(**job_state)



@app.get("/cell-segmentation/cell-seg-dtma/{job_id}", 
         response_model=CellSegDTMA_Output_Response)
async def cell_seg_dtma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return CellSegDTMA_Output_Response(**job_state['data'])


@app.post("/cell-segmentation/cell-seg-wsi", 
          response_model=CellSegWSI_Input_Response,
          response_model_exclude_none=True)
async def cell_seg_wsi_submit(
    data: CellSegWSI_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.cell-segmentation.cell-seg-wsi.process',
        image_name = "lztx:zcynfiww",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return CellSegWSI_Input_Response(**job_state)



@app.get("/cell-segmentation/cell-seg-wsi/{job_id}", 
         response_model=CellSegWSI_Output_Response)
async def cell_seg_wsi_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return CellSegWSI_Output_Response(**job_state['data'])


@app.post("/de-array/crop-cores-tma", 
          response_model=CropCoresTMA_Input_Response,
          response_model_exclude_none=True)
async def crop_cores_tma_submit(
    data: CropCoresTMA_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.de-array.crop-cores-tma.process',
        image_name = "kakh:aqyzeiqav",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return CropCoresTMA_Input_Response(**job_state)



@app.get("/de-array/crop-cores-tma/{job_id}", 
         response_model=CropCoresTMA_Output_Response)
async def crop_cores_tma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return CropCoresTMA_Output_Response(**job_state['data'])


@app.post("/start/init-tma", 
          response_model=InitTMA_Input_Response)
async def init_tma_submit(
    data: InitTMA_Input_Request, 
    background_tasks: BackgroundTasks,
    request: Request, 
    # need to add a custom header for if the request is from the execution environment
    cdb_external_url: Annotated[Union[str, None], Header()] = None,
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None 
    ):


    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')
    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})

    # Deserialise job object
    job_state = json.loads(res.content)
    
    background_tasks.add_task(
        submit_k8s_job, 
        routing_key = 'task.start.init-tma.prepare-template',
        data= data.model_dump(),
        image_name = "bwpo:zwlst",
        # Need to replace with a non-hardcoded method for this
        base_url = cdb_external_url,
        job_id = job_state['id'])
    return InitTMA_Input_Response(**job_state)




@app.get("/start/init-tma/frontend/{job_id}", 
         response_class=InitTMA_FrontEnd_Response)
async def init_tma_frontend(job_id: str):
    
    # Get Job from DATABASE
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    
    job_state = json.loads(res.content)

    

    # Get Frontend from Job Object
    return InitTMA_FrontEnd_Response(job_state['frontend'])



@app.post("/start/init-tma/submit/{job_id}",
          response_model=InitTMA_InteractionInput_Response)
async def init_tma_submit_interaction(
    job_id: str, 
    data: InitTMA_InteractionInput_Request, 
    request: Request, 
    background_tasks: BackgroundTasks):

    logging.info('SUBMIT INTERACTION')
    logging.info(job_id)
    logging.info(data)
    
    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key = 'task.start.init-tma.process',
        data= data.model_dump(), 
        image_name = "bwpo:zwlst",
        is_interactive_submit = True,
        base_url = request.base_url,
        job_id = job_id)
    
    
    return InitTMA_InteractionInput_Response(
        **{'url': create_redirect_to_execution_env_link(
            job_id=job_id,base_url=request.base_url)})


@app.get("/start/init-tma/{job_id}", 
         response_model=InitTMA_Output_Response)
async def init_tma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)

    
    return InitTMA_Output_Response(**job_state['data'])


@app.post("/de-array/edit-predicted-rois-tma", 
          response_model=EditPredictedRoisTMA_Input_Response)
async def edit_predicted_rois_tma_submit(
    data: EditPredictedRoisTMA_Input_Request, 
    background_tasks: BackgroundTasks,
    request: Request, 
    # need to add a custom header for if the request is from the execution environment
    cdb_external_url: Annotated[Union[str, None], Header()] = None,
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None 
    ):


    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')
    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})

    # Deserialise job object
    job_state = json.loads(res.content)
    
    background_tasks.add_task(
        submit_k8s_job, 
        routing_key = 'task.de-array.edit-predicted-rois-tma.prepare-template',
        data= data.model_dump(),
        image_name = "cniqeznyb:zrh",
        # Need to replace with a non-hardcoded method for this
        base_url = cdb_external_url,
        job_id = job_state['id'])
    return EditPredictedRoisTMA_Input_Response(**job_state)




@app.get("/de-array/edit-predicted-rois-tma/frontend/{job_id}", 
         response_class=EditPredictedRoisTMA_FrontEnd_Response)
async def edit_predicted_rois_tma_frontend(job_id: str):
    
    # Get Job from DATABASE
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    
    job_state = json.loads(res.content)

    

    # Get Frontend from Job Object
    return EditPredictedRoisTMA_FrontEnd_Response(job_state['frontend'])



@app.post("/de-array/edit-predicted-rois-tma/submit/{job_id}",
          response_model=EditPredictedRoisTMA_InteractionInput_Response)
async def edit_predicted_rois_tma_submit_interaction(
    job_id: str, 
    data: EditPredictedRoisTMA_InteractionInput_Request, 
    request: Request, 
    background_tasks: BackgroundTasks):

    logging.info('SUBMIT INTERACTION')
    logging.info(job_id)
    logging.info(data)
    
    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key = 'task.de-array.edit-predicted-rois-tma.process',
        data= data.model_dump(), 
        image_name = "cniqeznyb:zrh",
        is_interactive_submit = True,
        base_url = request.base_url,
        job_id = job_id)
    
    
    return EditPredictedRoisTMA_InteractionInput_Response(
        **{'url': create_redirect_to_execution_env_link(
            job_id=job_id,base_url=request.base_url)})


@app.get("/de-array/edit-predicted-rois-tma/{job_id}", 
         response_model=EditPredictedRoisTMA_Output_Response)
async def edit_predicted_rois_tma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)

    
    return EditPredictedRoisTMA_Output_Response(**job_state['data'])


@app.post("/feature-extraction/xtracit-dtma", 
          response_model=XtracitDTMA_Input_Response,
          response_model_exclude_none=True)
async def xtracit_dtma_submit(
    data: XtracitDTMA_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.feature-extraction.xtracit-dtma.process',
        image_name = "zpn:aedothajcd",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return XtracitDTMA_Input_Response(**job_state)



@app.get("/feature-extraction/xtracit-dtma/{job_id}", 
         response_model=XtracitDTMA_Output_Response)
async def xtracit_dtma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return XtracitDTMA_Output_Response(**job_state['data'])


@app.post("/technical-variance-correction/ace-dtma", 
          response_model=AceDTMA_Input_Response,
          response_model_exclude_none=True)
async def ace_dtma_submit(
    data: AceDTMA_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.technical-variance-correction.ace-dtma.process',
        image_name = "nqqikhae:zup",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return AceDTMA_Input_Response(**job_state)



@app.get("/technical-variance-correction/ace-dtma/{job_id}", 
         response_model=AceDTMA_Output_Response)
async def ace_dtma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return AceDTMA_Output_Response(**job_state['data'])


@app.post("/de-array/seg-array-tma", 
          response_model=SegArrayTMA_Input_Response,
          response_model_exclude_none=True)
async def seg_array_tma_submit(
    data: SegArrayTMA_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.de-array.seg-array-tma.process',
        image_name = "keperoekqs:dkzp",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return SegArrayTMA_Input_Response(**job_state)



@app.get("/de-array/seg-array-tma/{job_id}", 
         response_model=SegArrayTMA_Output_Response)
async def seg_array_tma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return SegArrayTMA_Output_Response(**job_state['data'])


@app.post("/de-array/manual-dearray-tma", 
          response_model=ManualDearrayTMA_Input_Response)
async def manual_dearray_tma_submit(
    data: ManualDearrayTMA_Input_Request, 
    background_tasks: BackgroundTasks,
    request: Request, 
    # need to add a custom header for if the request is from the execution environment
    cdb_external_url: Annotated[Union[str, None], Header()] = None,
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None 
    ):


    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')
    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})

    # Deserialise job object
    job_state = json.loads(res.content)
    
    background_tasks.add_task(
        submit_k8s_job, 
        routing_key = 'task.de-array.manual-dearray-tma.prepare-template',
        data= data.model_dump(),
        image_name = "uvxft:ahcxxbpe",
        # Need to replace with a non-hardcoded method for this
        base_url = cdb_external_url,
        job_id = job_state['id'])
    return ManualDearrayTMA_Input_Response(**job_state)




@app.get("/de-array/manual-dearray-tma/frontend/{job_id}", 
         response_class=ManualDearrayTMA_FrontEnd_Response)
async def manual_dearray_tma_frontend(job_id: str):
    
    # Get Job from DATABASE
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    
    job_state = json.loads(res.content)

    

    # Get Frontend from Job Object
    return ManualDearrayTMA_FrontEnd_Response(job_state['frontend'])



@app.post("/de-array/manual-dearray-tma/submit/{job_id}",
          response_model=ManualDearrayTMA_InteractionInput_Response)
async def manual_dearray_tma_submit_interaction(
    job_id: str, 
    data: ManualDearrayTMA_InteractionInput_Request, 
    request: Request, 
    background_tasks: BackgroundTasks):

    logging.info('SUBMIT INTERACTION')
    logging.info(job_id)
    logging.info(data)
    
    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key = 'task.de-array.manual-dearray-tma.process',
        data= data.model_dump(), 
        image_name = "uvxft:ahcxxbpe",
        is_interactive_submit = True,
        base_url = request.base_url,
        job_id = job_id)
    
    
    return ManualDearrayTMA_InteractionInput_Response(
        **{'url': create_redirect_to_execution_env_link(
            job_id=job_id,base_url=request.base_url)})


@app.get("/de-array/manual-dearray-tma/{job_id}", 
         response_model=ManualDearrayTMA_Output_Response)
async def manual_dearray_tma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)

    
    return ManualDearrayTMA_Output_Response(**job_state['data'])


@app.post("/technical-variance-correction/ace-wsi", 
          response_model=AceWSI_Input_Response,
          response_model_exclude_none=True)
async def ace_wsi_submit(
    data: AceWSI_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.technical-variance-correction.ace-wsi.process',
        image_name = "uovooogtkl:uewf",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return AceWSI_Input_Response(**job_state)



@app.get("/technical-variance-correction/ace-wsi/{job_id}", 
         response_model=AceWSI_Output_Response)
async def ace_wsi_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return AceWSI_Output_Response(**job_state['data'])


@app.post("/cell-segmentation/deepcell-wsi", 
          response_model=DeepcellWSI_Input_Response,
          response_model_exclude_none=True)
async def deepcell_wsi_submit(
    data: DeepcellWSI_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.cell-segmentation.deepcell-wsi.process',
        image_name = "fqeusxiaqs:bnll",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return DeepcellWSI_Input_Response(**job_state)



@app.get("/cell-segmentation/deepcell-wsi/{job_id}", 
         response_model=DeepcellWSI_Output_Response)
async def deepcell_wsi_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return DeepcellWSI_Output_Response(**job_state['data'])


@app.post("/start/init-wsi", 
          response_model=InitWSI_Input_Response)
async def init_wsi_submit(
    data: InitWSI_Input_Request, 
    background_tasks: BackgroundTasks,
    request: Request, 
    # need to add a custom header for if the request is from the execution environment
    cdb_external_url: Annotated[Union[str, None], Header()] = None,
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None 
    ):


    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')
    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})

    # Deserialise job object
    job_state = json.loads(res.content)
    
    background_tasks.add_task(
        submit_k8s_job, 
        routing_key = 'task.start.init-wsi.prepare-template',
        data= data.model_dump(),
        image_name = "ydmtkuaisd:oehkcbzck",
        # Need to replace with a non-hardcoded method for this
        base_url = cdb_external_url,
        job_id = job_state['id'])
    return InitWSI_Input_Response(**job_state)




@app.get("/start/init-wsi/frontend/{job_id}", 
         response_class=InitWSI_FrontEnd_Response)
async def init_wsi_frontend(job_id: str):
    
    # Get Job from DATABASE
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    
    job_state = json.loads(res.content)

    

    # Get Frontend from Job Object
    return InitWSI_FrontEnd_Response(job_state['frontend'])



@app.post("/start/init-wsi/submit/{job_id}",
          response_model=InitWSI_InteractionInput_Response)
async def init_wsi_submit_interaction(
    job_id: str, 
    data: InitWSI_InteractionInput_Request, 
    request: Request, 
    background_tasks: BackgroundTasks):

    logging.info('SUBMIT INTERACTION')
    logging.info(job_id)
    logging.info(data)
    
    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key = 'task.start.init-wsi.process',
        data= data.model_dump(), 
        image_name = "ydmtkuaisd:oehkcbzck",
        is_interactive_submit = True,
        base_url = request.base_url,
        job_id = job_id)
    
    
    return InitWSI_InteractionInput_Response(
        **{'url': create_redirect_to_execution_env_link(
            job_id=job_id,base_url=request.base_url)})


@app.get("/start/init-wsi/{job_id}", 
         response_model=InitWSI_Output_Response)
async def init_wsi_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")

    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)

    
    return InitWSI_Output_Response(**job_state['data'])


@app.post("/cell-segmentation/deepcell-dtma", 
          response_model=DeepcellDTMA_Input_Response,
          response_model_exclude_none=True)
async def deepcell_dtma_submit(
    data: DeepcellDTMA_Input_Request, 
    background_tasks: BackgroundTasks, 
    request: Request,
    # need to add a custom header for if the request is from the execution environment
    cdb_workflow_id: Annotated[Union[str, None], Header()] = None
    ):
    
    # Maybe add assertions to ensure that the headers are not None

    logging.info(f'REQUEST DETAILS: {request.headers}, {request.app}, {request.path_params}, {request.query_params}, {request.url}')

    # Create job in JMS
    res = requests.post(
        f"http://{JMS_ADDRESS}/create-job/", 
        json={'workflow': cdb_workflow_id})
    
    # logging job
    logging.info(f"Status: {res.status_code}")

    # deserialise job state
    job_state = json.loads(res.content)
    
    logging.info(job_state)

    
    background_tasks.add_task(
        submit_k8s_job,
        routing_key='task.cell-segmentation.deepcell-dtma.process',
        image_name = "nte:hlelfz",
        data = data.model_dump(), 
        job_id = job_state['id'])

    
    return DeepcellDTMA_Input_Response(**job_state)



@app.get("/cell-segmentation/deepcell-dtma/{job_id}", 
         response_model=DeepcellDTMA_Output_Response)
async def deepcell_dtma_result(job_id: str):

    # Get job from JMS
    res = requests.get(
        f"http://{JMS_ADDRESS}/get-job-by-id/{job_id}")
    logging.warning(f"Status: {res.status_code}")
    
    # logging job status code
    logging.info(f"Status: {res.status_code}")

    # Deserialise the job
    job_state = json.loads(res.content)
    
    return DeepcellDTMA_Output_Response(**job_state['data'])


