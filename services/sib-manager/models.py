# Quite similar to helm!

from enum import Enum
from pydantic import BaseModel, Field,root_validator, RootModel
from typing import List, Any, Union, Optional
from fastapi.responses import HTMLResponse


class JobStatus(str, Enum):
    submitted = 'submitted'
    accepted = 'accepted'
    awaiting_interaction = 'awaiting_interaction'
    interaction_accepted = 'interaction_accepted'
    processing = 'processing'
    completed = 'completed'
    failed = "failed"

# Data Models for the Data/Workflow Parameters

class TmaSymbolicLink(RootModel[str]):
    ...

class TmaProteinChannel(BaseModel):
    url: TmaSymbolicLink

class TissueMicroArray(BaseModel):
    channels: dict[str,TmaProteinChannel]

class TissueCoreSymbolicLink(RootModel[str]):
    ...

class TissueCoreProteinChannel(BaseModel):
    url: TissueCoreSymbolicLink

class TissueCore(BaseModel):
    channels: dict[str, TissueCoreProteinChannel]
    ...

class DearrayedTissueMicroArray(BaseModel):
    cores : dict[str, TissueCore]

# Workflow Parameters Models
class NuclearStain(RootModel[str]):
    ...

class NuclearMarker(RootModel[str]):
    ...

class MembraneMarker(RootModel[str]):
    ...

# System Parameter Models
class ProteinChannelMarker(RootModel[str]):
    ...

class ROI(BaseModel):
    x1: float
    y1: float
    x2 : float
    y2: float
    img_w: float
    img_h: float

class PredictedROIs(BaseModel):
    confidence_value : float
    rois: List[ROI]

class TissueCoreCellSegmentationMaskSymbolicLink(RootModel[str]):
    ...

class TissueCoreSegmentationMask(BaseModel):
    url: TissueCoreCellSegmentationMaskSymbolicLink

class TissueCoreCellSegmentationMasks(BaseModel):
    nucleus_mask: TissueCoreSegmentationMask
    membrane_mask: TissueCoreSegmentationMask

class DearrayedTissueMicroArrayCellSegmentationMask(BaseModel):
    cores: dict[str, TissueCoreCellSegmentationMasks]

class TissueCoreFcsFileSymbolicLink(RootModel[str]):
    ...

class TissueCoreFcsFile(BaseModel):
    url: TissueCoreFcsFileSymbolicLink


class DearrayedTissueMicroArrayMissileFCS(BaseModel):
    cores: dict[str, TissueCoreFcsFile]


class WsiSymbolicLink(RootModel[str]):
    ...

class WsiProteinChannel(BaseModel):
    url: WsiSymbolicLink

class WholeSlideImage(BaseModel):
    channels: dict[str,WsiProteinChannel]

class WholeSlideImageCellSegmentationMaskSymbolicLink(RootModel[str]):
    ...

class WholeSlideImageSegmentationMask(BaseModel):
    url: WholeSlideImageCellSegmentationMaskSymbolicLink

class WholeSlideImageCellSegmentationMask(BaseModel):
    nucleus_mask: WholeSlideImageSegmentationMask
    membrane_mask: WholeSlideImageSegmentationMask

class WholeSlideImageFcsFileSymbolicLink(RootModel[str]):
    ...

class WholeSlideImageMissileFCS(BaseModel):
    url: WholeSlideImageFcsFileSymbolicLink

class ROIs (RootModel[List[ROI]]):
	...

class NuclearMarkers (RootModel[List[NuclearMarker]]):
	...

class MembraneMarkers (RootModel[List[MembraneMarker]]):
	...

class ProteinChannelMarkers (RootModel[List[ProteinChannelMarker]]):
	...

# Data Models for the Dataprocess Services (Input/Output)

class XtracitWSI_Input_Request(BaseModel):   
	class XtracitWSI_Input_Request_SystemParameters(BaseModel):   
		class XtracitWSI_Input_Request_DataFlow(BaseModel):  
			whole_slide_image_missile_fcs: bool 
		data_flow: XtracitWSI_Input_Request_DataFlow  
	class XtracitWSI_Input_Request_Data(BaseModel):  
		whole_slide_image: WholeSlideImage
		whole_slide_image_cell_segmentation_mask: WholeSlideImageCellSegmentationMask  
	class XtracitWSI_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_markers: NuclearMarkers
		protein_channel_markers: ProteinChannelMarkers 
	system_parameters: XtracitWSI_Input_Request_SystemParameters
	workflow_parameters: XtracitWSI_Input_Request_WorkflowParameters
	data: XtracitWSI_Input_Request_Data
class XtracitWSI_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class XtracitWSI_Output_Response(BaseModel):   
	class XtracitWSI_Output_Response_Control(str, Enum):  
		success='success'  
	class XtracitWSI_Output_Response_Data(BaseModel):  
		whole_slide_image_missile_fcs: WholeSlideImageMissileFCS 
	data: XtracitWSI_Output_Response_Data
	control: XtracitWSI_Output_Response_Control = XtracitWSI_Output_Response_Control.success


class CellSegDTMA_Input_Request(BaseModel):   
	class CellSegDTMA_Input_Request_SystemParameters(BaseModel):   
		class CellSegDTMA_Input_Request_DataFlow(BaseModel):  
			dearrayed_tissue_micro_array_cell_segmentation_masks: bool 
		data_flow: CellSegDTMA_Input_Request_DataFlow  
	class CellSegDTMA_Input_Request_Data(BaseModel):  
		dearrayed_tissue_micro_array: DearrayedTissueMicroArray  
	class CellSegDTMA_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain  
	class CellSegDTMA_Input_Request_ServiceParameters(BaseModel):   
		class CellSegDTMA_Input_Request_GrowMethod(str, Enum):  
			Sequential='Sequential' 
		grow_method: CellSegDTMA_Input_Request_GrowMethod = CellSegDTMA_Input_Request_GrowMethod.Sequential 
	service_parameters: CellSegDTMA_Input_Request_ServiceParameters
	system_parameters: CellSegDTMA_Input_Request_SystemParameters
	workflow_parameters: CellSegDTMA_Input_Request_WorkflowParameters
	data: CellSegDTMA_Input_Request_Data
class CellSegDTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class CellSegDTMA_Output_Response(BaseModel):   
	class CellSegDTMA_Output_Response_Control(str, Enum):  
		success='success'  
	class CellSegDTMA_Output_Response_Data(BaseModel):  
		dearrayed_tissue_micro_array_cell_segmentation_masks: DearrayedTissueMicroArrayCellSegmentationMask 
	data: CellSegDTMA_Output_Response_Data
	control: CellSegDTMA_Output_Response_Control = CellSegDTMA_Output_Response_Control.success


class CellSegWSI_Input_Request(BaseModel):   
	class CellSegWSI_Input_Request_SystemParameters(BaseModel):   
		class CellSegWSI_Input_Request_DataFlow(BaseModel):  
			whole_slide_image_cell_segmentation_masks: bool 
		data_flow: CellSegWSI_Input_Request_DataFlow  
	class CellSegWSI_Input_Request_Data(BaseModel):  
		whole_slide_image: WholeSlideImage  
	class CellSegWSI_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain  
	class CellSegWSI_Input_Request_ServiceParameters(BaseModel):   
		class CellSegWSI_Input_Request_GrowMethod(str, Enum):  
			Sequential='Sequential' 
		grow_method: CellSegWSI_Input_Request_GrowMethod = CellSegWSI_Input_Request_GrowMethod.Sequential 
	service_parameters: CellSegWSI_Input_Request_ServiceParameters
	system_parameters: CellSegWSI_Input_Request_SystemParameters
	workflow_parameters: CellSegWSI_Input_Request_WorkflowParameters
	data: CellSegWSI_Input_Request_Data
class CellSegWSI_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class CellSegWSI_Output_Response(BaseModel):   
	class CellSegWSI_Output_Response_Control(str, Enum):  
		success='success'  
	class CellSegWSI_Output_Response_Data(BaseModel):  
		whole_slide_image_cell_segmentation_masks: WholeSlideImageCellSegmentationMask 
	data: CellSegWSI_Output_Response_Data
	control: CellSegWSI_Output_Response_Control = CellSegWSI_Output_Response_Control.success


class CropCoresTMA_Input_Request(BaseModel):   
	class CropCoresTMA_Input_Request_SystemParameters(BaseModel):   
		class CropCoresTMA_Input_Request_DataFlow(BaseModel):  
			dearrayed_tissue_micro_array: bool 
		data_flow: CropCoresTMA_Input_Request_DataFlow  
	class CropCoresTMA_Input_Request_WorkflowParameters(BaseModel):  
		rois: ROIs  
	class CropCoresTMA_Input_Request_Data(BaseModel):  
		tissue_micro_array: TissueMicroArray 
	system_parameters: CropCoresTMA_Input_Request_SystemParameters
	workflow_parameters: CropCoresTMA_Input_Request_WorkflowParameters
	data: CropCoresTMA_Input_Request_Data
class CropCoresTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class CropCoresTMA_Output_Response(BaseModel):   
	class CropCoresTMA_Output_Response_Control(str, Enum):  
		success='success'  
	class CropCoresTMA_Output_Response_Data(BaseModel):  
		dearrayed_tissue_micro_array: DearrayedTissueMicroArray 
	data: CropCoresTMA_Output_Response_Data
	control: CropCoresTMA_Output_Response_Control = CropCoresTMA_Output_Response_Control.success


class InitTMA_Input_Request(BaseModel):   
	class InitTMA_Input_Request_SystemParameters(BaseModel):   
		class InitTMA_Input_Request_DataFlow(BaseModel):  
			tissue_micro_array: bool
			nuclear_stain: bool
			nuclear_markers: bool
			membrane_markers: bool
			protein_channel_markers: bool 
		data_flow: InitTMA_Input_Request_DataFlow 
	system_parameters: InitTMA_Input_Request_SystemParameters
class InitTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None
class InitTMA_FrontEnd_Response(HTMLResponse):
    ...

class InitTMA_InteractionInput_Request(BaseModel):   
	class InitTMA_InteractionInput_Request_WorkflowParameters(BaseModel):  
		experiment_data_id: str
		nuclear_stain: Optional[NuclearStain] = None
		nuclear_markers: Optional[NuclearMarkers] = None
		membrane_markers: Optional[MembraneMarkers] = None
		protein_channel_markers: ProteinChannelMarkers 
	workflow_parameters: InitTMA_InteractionInput_Request_WorkflowParameters
class InitTMA_InteractionInput_Response(BaseModel):
    url: str

class InitTMA_Output_Response(BaseModel):   
	class InitTMA_Output_Response_WorkflowParameters(BaseModel):  
		nuclear_stain: Optional[NuclearStain] = None
		nuclear_markers: Optional[NuclearMarkers] = None
		membrane_markers: Optional[MembraneMarkers] = None
		protein_channel_markers: ProteinChannelMarkers  
	class InitTMA_Output_Response_Data(BaseModel):  
		tissue_micro_array: TissueMicroArray  
	class InitTMA_Output_Response_Control(str, Enum):  
		success='success' 
	data: InitTMA_Output_Response_Data
	workflow_parameters: InitTMA_Output_Response_WorkflowParameters
	control: InitTMA_Output_Response_Control = InitTMA_Output_Response_Control.success


class EditPredictedRoisTMA_Input_Request(BaseModel):   
	class EditPredictedRoisTMA_Input_Request_SystemParameters(BaseModel):   
		class EditPredictedRoisTMA_Input_Request_DataFlow(BaseModel):  
			rois: bool 
		data_flow: EditPredictedRoisTMA_Input_Request_DataFlow  
	class EditPredictedRoisTMA_Input_Request_Data(BaseModel):  
		tissue_micro_array: TissueMicroArray  
	class EditPredictedRoisTMA_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain
		predicted_rois: PredictedROIs 
	workflow_parameters: EditPredictedRoisTMA_Input_Request_WorkflowParameters
	data: EditPredictedRoisTMA_Input_Request_Data
	system_parameters: EditPredictedRoisTMA_Input_Request_SystemParameters
class EditPredictedRoisTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None
class EditPredictedRoisTMA_FrontEnd_Response(HTMLResponse):
    ...

class EditPredictedRoisTMA_InteractionInput_Request(BaseModel):   
	class EditPredictedRoisTMA_InteractionInput_Request_WorkflowParameters(BaseModel):  
		rois: ROIs 
	workflow_parameters: EditPredictedRoisTMA_InteractionInput_Request_WorkflowParameters
class EditPredictedRoisTMA_InteractionInput_Response(BaseModel):
    url: str

class EditPredictedRoisTMA_Output_Response(BaseModel):   
	class EditPredictedRoisTMA_Output_Response_WorkflowParameters(BaseModel):  
		rois: ROIs  
	class EditPredictedRoisTMA_Output_Response_Control(str, Enum):  
		success='success' 
	workflow_parameters: EditPredictedRoisTMA_Output_Response_WorkflowParameters
	control: EditPredictedRoisTMA_Output_Response_Control = EditPredictedRoisTMA_Output_Response_Control.success


class XtracitDTMA_Input_Request(BaseModel):   
	class XtracitDTMA_Input_Request_SystemParameters(BaseModel):   
		class XtracitDTMA_Input_Request_DataFlow(BaseModel):  
			dearrayed_tissue_micro_array_missile_fcs: bool 
		data_flow: XtracitDTMA_Input_Request_DataFlow  
	class XtracitDTMA_Input_Request_Data(BaseModel):  
		dearrayed_tissue_micro_array: DearrayedTissueMicroArray
		dearrayed_tissue_micro_array_cell_segmentation_masks: DearrayedTissueMicroArrayCellSegmentationMask  
	class XtracitDTMA_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_markers: NuclearMarkers
		protein_channel_markers: ProteinChannelMarkers 
	system_parameters: XtracitDTMA_Input_Request_SystemParameters
	workflow_parameters: XtracitDTMA_Input_Request_WorkflowParameters
	data: XtracitDTMA_Input_Request_Data
class XtracitDTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class XtracitDTMA_Output_Response(BaseModel):   
	class XtracitDTMA_Output_Response_Control(str, Enum):  
		success='success'  
	class XtracitDTMA_Output_Response_Data(BaseModel):  
		dearrayed_tissue_micro_array_missile_fcs: DearrayedTissueMicroArrayMissileFCS 
	data: XtracitDTMA_Output_Response_Data
	control: XtracitDTMA_Output_Response_Control = XtracitDTMA_Output_Response_Control.success


class AceDTMA_Input_Request(BaseModel):   
	class AceDTMA_Input_Request_SystemParameters(BaseModel):   
		class AceDTMA_Input_Request_DataFlow(BaseModel):  
			dearrayed_tissue_micro_array: bool 
		data_flow: AceDTMA_Input_Request_DataFlow  
	class AceDTMA_Input_Request_Data(BaseModel):  
		dearrayed_tissue_micro_array: DearrayedTissueMicroArray 
	system_parameters: AceDTMA_Input_Request_SystemParameters
	data: AceDTMA_Input_Request_Data
class AceDTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class AceDTMA_Output_Response(BaseModel):   
	class AceDTMA_Output_Response_Control(str, Enum):  
		success='success'  
	class AceDTMA_Output_Response_Data(BaseModel):  
		dearrayed_tissue_micro_array: DearrayedTissueMicroArray 
	data: AceDTMA_Output_Response_Data
	control: AceDTMA_Output_Response_Control = AceDTMA_Output_Response_Control.success


class SegArrayTMA_Input_Request(BaseModel):   
	class SegArrayTMA_Input_Request_SystemParameters(BaseModel):   
		class SegArrayTMA_Input_Request_DataFlow(BaseModel):  
			predicted_rois: bool 
		data_flow: SegArrayTMA_Input_Request_DataFlow  
	class SegArrayTMA_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain  
	class SegArrayTMA_Input_Request_Data(BaseModel):  
		tissue_micro_array: TissueMicroArray 
	system_parameters: SegArrayTMA_Input_Request_SystemParameters
	workflow_parameters: SegArrayTMA_Input_Request_WorkflowParameters
	data: SegArrayTMA_Input_Request_Data
class SegArrayTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class SegArrayTMA_Output_Response(BaseModel):   
	class SegArrayTMA_Output_Response_WorkflowParameters(BaseModel):  
		predicted_rois: PredictedROIs  
	class SegArrayTMA_Output_Response_Control(str, Enum):  
		success='success' 
	workflow_parameters: SegArrayTMA_Output_Response_WorkflowParameters
	control: SegArrayTMA_Output_Response_Control = SegArrayTMA_Output_Response_Control.success


class ManualDearrayTMA_Input_Request(BaseModel):   
	class ManualDearrayTMA_Input_Request_SystemParameters(BaseModel):   
		class ManualDearrayTMA_Input_Request_DataFlow(BaseModel):  
			rois: ROIs 
		data_flow: ManualDearrayTMA_Input_Request_DataFlow  
	class ManualDearrayTMA_Input_Request_Data(BaseModel):  
		tissue_micro_array: TissueMicroArray  
	class ManualDearrayTMA_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain 
	workflow_parameters: ManualDearrayTMA_Input_Request_WorkflowParameters
	data: ManualDearrayTMA_Input_Request_Data
	system_parameters: ManualDearrayTMA_Input_Request_SystemParameters
class ManualDearrayTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None
class ManualDearrayTMA_FrontEnd_Response(HTMLResponse):
    ...

class ManualDearrayTMA_InteractionInput_Request(BaseModel):   
	class ManualDearrayTMA_InteractionInput_Request_WorkflowParameters(BaseModel):  
		rois: ROIs 
	workflow_parameters: ManualDearrayTMA_InteractionInput_Request_WorkflowParameters
class ManualDearrayTMA_InteractionInput_Response(BaseModel):
    url: str

class ManualDearrayTMA_Output_Response(BaseModel):   
	class ManualDearrayTMA_Output_Response_WorkflowParameters(BaseModel):  
		rois: ROIs  
	class ManualDearrayTMA_Output_Response_Control(str, Enum):  
		success='success' 
	workflow_parameters: ManualDearrayTMA_Output_Response_WorkflowParameters
	control: ManualDearrayTMA_Output_Response_Control = ManualDearrayTMA_Output_Response_Control.success


class AceWSI_Input_Request(BaseModel):   
	class AceWSI_Input_Request_SystemParameters(BaseModel):   
		class AceWSI_Input_Request_DataFlow(BaseModel):  
			whole_slide_image: bool 
		data_flow: AceWSI_Input_Request_DataFlow  
	class AceWSI_Input_Request_Data(BaseModel):  
		whole_slide_image: WholeSlideImage 
	system_parameters: AceWSI_Input_Request_SystemParameters
	data: AceWSI_Input_Request_Data
class AceWSI_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class AceWSI_Output_Response(BaseModel):   
	class AceWSI_Output_Response_Control(str, Enum):  
		success='success'  
	class AceWSI_Output_Response_Data(BaseModel):  
		whole_slide_image: WholeSlideImage 
	data: AceWSI_Output_Response_Data
	control: AceWSI_Output_Response_Control = AceWSI_Output_Response_Control.success


class DeepcellWSI_Input_Request(BaseModel):   
	class DeepcellWSI_Input_Request_SystemParameters(BaseModel):   
		class DeepcellWSI_Input_Request_DataFlow(BaseModel):  
			whole_slide_image_cell_segmentation_masks: bool 
		data_flow: DeepcellWSI_Input_Request_DataFlow  
	class DeepcellWSI_Input_Request_Data(BaseModel):  
		whole_slide_image: WholeSlideImage  
	class DeepcellWSI_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain
		membrane_markers: MembraneMarkers 
	system_parameters: DeepcellWSI_Input_Request_SystemParameters
	workflow_parameters: DeepcellWSI_Input_Request_WorkflowParameters
	data: DeepcellWSI_Input_Request_Data
class DeepcellWSI_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class DeepcellWSI_Output_Response(BaseModel):   
	class DeepcellWSI_Output_Response_Control(str, Enum):  
		success='success'  
	class DeepcellWSI_Output_Response_Data(BaseModel):  
		whole_slide_image_cell_segmentation_masks: WholeSlideImageCellSegmentationMask 
	data: DeepcellWSI_Output_Response_Data
	control: DeepcellWSI_Output_Response_Control = DeepcellWSI_Output_Response_Control.success


class InitWSI_Input_Request(BaseModel):   
	class InitWSI_Input_Request_SystemParameters(BaseModel):   
		class InitWSI_Input_Request_DataFlow(BaseModel):  
			whole_slide_image: bool
			nuclear_stain: bool
			nuclear_markers: bool
			membrane_markers: bool
			protein_channel_markers: bool 
		data_flow: InitWSI_Input_Request_DataFlow 
	system_parameters: InitWSI_Input_Request_SystemParameters
class InitWSI_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None
class InitWSI_FrontEnd_Response(HTMLResponse):
    ...

class InitWSI_InteractionInput_Request(BaseModel):   
	class InitWSI_InteractionInput_Request_WorkflowParameters(BaseModel):  
		experiment_data_id: str
		nuclear_stain: Optional[NuclearStain] = None
		nuclear_markers: Optional[NuclearMarkers] = None
		membrane_markers: Optional[MembraneMarkers] = None 
	workflow_parameters: InitWSI_InteractionInput_Request_WorkflowParameters
class InitWSI_InteractionInput_Response(BaseModel):
    url: str

class InitWSI_Output_Response(BaseModel):   
	class InitWSI_Output_Response_WorkflowParameters(BaseModel):  
		nuclear_stain: Optional[NuclearStain] = None
		nuclear_markers: Optional[NuclearMarkers] = None
		membrane_markers: Optional[MembraneMarkers] = None
		protein_channel_markers: ProteinChannelMarkers  
	class InitWSI_Output_Response_Data(BaseModel):  
		whole_slide_image: WholeSlideImage  
	class InitWSI_Output_Response_Control(str, Enum):  
		success='success' 
	data: InitWSI_Output_Response_Data
	workflow_parameters: InitWSI_Output_Response_WorkflowParameters
	control: InitWSI_Output_Response_Control = InitWSI_Output_Response_Control.success


class DeepcellDTMA_Input_Request(BaseModel):   
	class DeepcellDTMA_Input_Request_SystemParameters(BaseModel):   
		class DeepcellDTMA_Input_Request_DataFlow(BaseModel):  
			dearrayed_tissue_micro_array_cell_segmentation_masks: bool 
		data_flow: DeepcellDTMA_Input_Request_DataFlow  
	class DeepcellDTMA_Input_Request_Data(BaseModel):  
		dearrayed_tissue_micro_array: DearrayedTissueMicroArray  
	class DeepcellDTMA_Input_Request_WorkflowParameters(BaseModel):  
		nuclear_stain: NuclearStain
		membrane_markers: MembraneMarkers 
	system_parameters: DeepcellDTMA_Input_Request_SystemParameters
	workflow_parameters: DeepcellDTMA_Input_Request_WorkflowParameters
	data: DeepcellDTMA_Input_Request_Data
class DeepcellDTMA_Input_Response(BaseModel):
    id: str
    workflow: str
    job_status: JobStatus
    data: Optional[dict] = None
    frontend: Optional[str] = None
    url: Optional[str] = None

class DeepcellDTMA_Output_Response(BaseModel):   
	class DeepcellDTMA_Output_Response_Control(str, Enum):  
		success='success'  
	class DeepcellDTMA_Output_Response_Data(BaseModel):  
		dearrayed_tissue_micro_array_cell_segmentation_masks: DearrayedTissueMicroArrayCellSegmentationMask 
	data: DeepcellDTMA_Output_Response_Data
	control: DeepcellDTMA_Output_Response_Control = DeepcellDTMA_Output_Response_Control.success




