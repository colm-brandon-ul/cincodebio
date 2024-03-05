from enum import Enum
from pydantic import BaseModel, Field,root_validator, RootModel
from typing import List, Any, Union, Optional
from fastapi.responses import HTMLResponse

# Structure of Data Models?

# Input Model
    # Directions (Previous Model tells the next model which data to use) - 
    # not needed because only going to pass in pointers for that service (not all)

# Output Model
    # Control /


"""
    Init TMA Service:
        Variables:
            workflow_id (system parameter)
            workflow bucket name (system parameter)
            experiment_data_bucket_name (system parameter)
            inputSelection (implicit based on which data flow outputs are used)
    
        Output: 
            parameters:
                full_slide_image_split_dir (system parameter)
                core_image_split_dir (system parameter)
                equalised_core_image_split_dir (system parameter)
                static_image_dir (system parameter)
                cell_segmentation_core_base_dir (system parameter)
                fcs_core_dir (system parameter)
                channel_markers (system parameter)
                experiment_data_id (selected by user during interaction) (essentially which TMA)
                nuclearstain* (selected by user during interaction)
                nuclearmarkers* (selected by user during interaction)
                membranemarkers* (selected by user during interaction)
            pointers:
                full_slide_split_channels (TMA)
            control:
                success (no decision made so 1 option for output)
    
    Init WSI Service:
        Variables:
            workflow_id (system parameter)
            workflow bucket name (system parameter)
            experiment_data_bucket_name (system parameter)
            inputSelection (implicit based on which data flow outputs are used)
    
        Output: 
            parameters:
                full_slide_image_split_dir (system parameter)
                equalised_image_split_dir (system parameter)
                static_image_dir (system parameter)
                cell_segmentation_base_dir (system parameter)
                fcs_dir (system parameter)
                channel_markers (system parameter)
                experiment_data_id (selected by user during interaction) (essentially which WSI)
                nuclearstain* (selected by user during interaction)
                nuclearmarkers* (selected by user during interaction)
                membranemarkers* (selected by user during interaction)
            pointers:
                full_slide_split_channels (WSI)
            control:
                success (no decision made so 1 option for output)


    SegArray TMA Service:
        Variables:
            full_slide_split_channels (TMA)
            nuclear_stain
        Tool parameters?
    
        Output: 
            parameters:
                predicted_ROIS
            control:
                success (no decision made so 1 option for output)

    Manaul Dearray TMA Service:
        Variables:
            full_slide_split_channels (TMA)
            nuclear_stain
            static_image_dir (system parameter)
            workflow_bucket_name (system parameter)
            host_url (the base url from which the browser is interacting with system) (system parameter)
        
        Output: 
            parameters:
                predicted_ROIS
            control:
                success (no decision made so 1 option for output)

    Edit Predicted ROIs TMA Service:
        Variables:
            full_slide_split_channels (TMA)
            nuclear_stain
            predicted_ROIs
            static_image_dir (system parameter)
            workflow_bucket_name (system parameter)
            host_url (the base url from which the browser is interacting with system)
        
        Output: 
            parameters:
                predicted_ROIS
            control:
                success (no decision made so 1 option for output)
    
    Validate Predicted ROIs TMA Service:
        Variables:
            full_slide_split_channels (TMA)
            nuclear_stain
            predicted_ROIs
            static_image_dir (system parameter)
            workflow_bucket_name (system parameter)
            host_url (the base url from which the browser is interacting with system)
        
        Output: 
            parameters:
                N/A
            control:
                valid | invalid

    Crop Cores TMA Service: 
        Variables:
            full_slide_split_channels (TMA)
            predicted_ROIs
            core_image_split_dir (system parameter)
            workflow_bucket_name (system parameter)
        
        Output: 
            parameters:
                core_split_channels (Dearrayed TMA)
            control:
                success (no decision made so 1 option for output)

    ACE TMA Service:
        Variables:
            core_split_channels (Dearrayed TMA)
            equalised_core_image_split_dir (system parameter)
            workflow_bucket_name (system parameter)
        
        Output: 
            parameters:
                equalised_core_split_channels (Dearrayed TMA)
            metadata:
                contrast_adjustments (Dearrayed TMA)
            control:
                success (no decision made so 1 option for output)

    ACE WSI Service:
        Variables:
            full_slide_split_channels (WSI)
            equalised_image_split_dir (system parameter)
            workflow_bucket_name (system parameter)
        
        Output: 
            parameters:
                equalised_split_channels (WSI)
            metadata:
                contrast_adjustments (WSI)
            control:
                success (no decision made so 1 option for output)

    Deepcell TMA Service: 
        Variables:
            (equalised_)core_split_channels (TMA)
            membrane_marker_s
            nuclear_stain
            cell_segmentation_core_base_dir (system parameter)
            workflow_bucket_name (system parameter)
        Algorithm Variables?
            MICRONS_PER_PIX (float)
            ERODE_WIDTH (int)
        
        Output: 
            parameters:
                cell_segmentation_masks (TMA)
            metadata:
                psuedo_membrane_markers (TMA) (Optional)
            control:
                success (no decision made so 1 option for output)

    Deepcell WSI Service: 
        Variables:
            (equalised_)split_channels (TMA)
            membrane_marker_s
            nuclear_stain
            cell_segmentation_base_dir (system parameter)
            workflow_bucket_name (system parameter)
        Algorithm Variables?
            MICRONS_PER_PIX (float)
            ERODE_WIDTH (int)
        
        Output: 
            parameters:
                cell_segmentation_masks (WSI)
            metadata:
                psuedo_membrane_markers (WSI) (Optional)
            control:
                success (no decision made so 1 option for output)


    Cellseg TMA Service: 
        Variables:
            (equalised_)core_split_channels (TMA)
            nuclear_stain
            cell_segmentation_core_base_dir (system parameter)
            workflow_bucket_name (system parameter)
        Algorithm Variables?
            Overlap (INT)
            Threshold (INT)
            Increase Factor (BOOL)
            Grow Mask (INT)
            Grow_method (Enum)
        
        Output: 
            parameters:
                cell_segmentation_masks (TMA)
            metadata:
                psuedo_membrane_markers (TMA) (Optional)
            control:
                success (no decision made so 1 option for output)

    Cellseg WSI Service: 
        Variables:
            (equalised_)split_channels (TMA)
            nuclear_stain
            cell_segmentation_base_dir (system parameter)
            workflow_bucket_name (system parameter)
        Algorithm Variables?
            Overlap (INT)
            Threshold (INT)
            Increase Factor (BOOL)
            Grow Mask (INT)
            Grow_method (Enum)
        
        Output: 
            parameters:
                cell_segmentation_masks (WSI)
            metadata:
                psuedo_membrane_markers (WSI) (Optional)
            control:
                success (no decision made so 1 option for output)

    Tabular Extraction TMA Service:
        Variables:
            (equalised_)core_split_channels (TMA)
            channel_markers
            nuclear_channels
            cell_segmentation_masks (TMA)
            
        Output: 
            parameters:
                fcs_core_files (TMA)
            control:
                success (no decision made so 1 option for output)

    Tabular Extraction WSI Service:
        Variables:
            (equalised_)split_channels (WSI)
            channel_markers
            nuclear_channels
            cell_segmentation_masks (WSI)
            
        Output: 
            parameters:
                fcs_files (WSI)
            control:
                success (no decision made so 1 option for output)

                
    data - 
    workflow paramters -
    service parameters -
"""


# Dataflow is based of Output response (workflow parameters and data)

class JobStatus(str, Enum):
    submitted = 'submitted'
    accepted = 'accepted'
    awaiting_interaction = 'awaiting_interaction'
    interaction_accepted = 'interaction_accepted'
    processing = 'processing'
    completed = 'completed'
    failed = "failed"

# Perhaps need to add timestamps for createdAt / updatedAt?

# Data Models
class TmaSymbolicLink(RootModel[str]):
    pass

class TmaProteinChannel(BaseModel):
    url: TmaSymbolicLink

class TissueMicroArray(BaseModel):
    channels: dict[str,TmaProteinChannel]

class TissueCoreSymbolicLink(RootModel[str]):
    pass

class TissueCoreProteinChannel(BaseModel):
    url: TissueCoreSymbolicLink

class TissueCore(BaseModel):
    channels: dict[str, TissueCoreProteinChannel]
    pass

class DearrayedTissueMicroArray(BaseModel):
    cores : dict[str, TissueCore]

# Workflow Parameters Models
class NuclearStain(RootModel[str]):
    pass

class NuclearMarker(RootModel[str]):
    pass

class MembraneMarker(RootModel[str]):
    pass

# System Parameter Models
class ChannelMarker(RootModel[str]):
    pass

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
    pass

class TissueCoreSegmentationMask(BaseModel):
    url: TissueCoreCellSegmentationMaskSymbolicLink

class TissueCoreCellSegmentationMasks(BaseModel):
    nucleus_mask: TissueCoreSegmentationMask
    membrane_mask: TissueCoreSegmentationMask

class DearrayedTissueMicroArrayCellSegmentationMask(BaseModel):
    cores: dict[str, TissueCoreCellSegmentationMasks]

class TissueCoreFcsFileSymbolicLink(RootModel[str]):
    pass

class TissueCoreFcsFile(BaseModel):
    url: TissueCoreFcsFileSymbolicLink


class DearrayedTissueMicroArrayFcsFiles(BaseModel):
    cores: dict[str, TissueCoreFcsFile]


class WsiSymbolicLink(RootModel[str]):
    pass

class WsiProteinChannel(BaseModel):
    url: WsiSymbolicLink

class WholeSlideImage(BaseModel):
    channels: dict[str,WsiProteinChannel]

class WholseSlideImageCellSegmentationMaskSymbolicLink(RootModel[str]):
    pass

class WholseSlideImageSegmentationMask(BaseModel):
    url: WholseSlideImageCellSegmentationMaskSymbolicLink

class WholseSlideImageCellSegmentationMask(BaseModel):
    nucleus_mask: WholseSlideImageSegmentationMask
    membrane_mask: WholseSlideImageSegmentationMask

class WholeSlideImageFcsFileSymbolicLink(RootModel[str]):
    pass

class WholeSlideImageFcsFile(BaseModel):
    url: WholeSlideImageFcsFileSymbolicLink
