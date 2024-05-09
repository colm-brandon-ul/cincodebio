sib_map = {'concepts': {'AceWSI': 'TechnicalVarianceCorrection', 'CropCoresTMA': 'DeArray', 'SegArrayTMA': 'DeArray', 'CreateMissileObjectDTMA': 'DataTransformation', 'AceDTMA': 'TechnicalVarianceCorrection', 'CreateMissileObjectWSI': 'DataTransformation', 'InitWSI': 'Start', 'EditPredictedRoisTMA': 'DeArray', 'ManualDearrayTMA': 'DeArray', 'InitTMA': 'Start'}, 'inputs': {'AceWSI': {'whole_slide_image:WholeSlideImage': 'Data'}, 'CropCoresTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'rois:ROIs': 'WorkflowParameters'}, 'SegArrayTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters'}, 'CreateMissileObjectDTMA': {'dearrayed_tissue_micro_array_missile_fcs:DearrayedTissueMicroArrayMissileFCS': 'Data', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}, 'AceDTMA': {'dearrayed_tissue_micro_array:DearrayedTissueMicroArray': 'Data'}, 'CreateMissileObjectWSI': {'whole_slide_image_missile_fcs:WholeSlideImageMissileFCS': 'Data', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}, 'InitWSI': {}, 'EditPredictedRoisTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters', 'predicted_rois:PredictedROIs': 'WorkflowParameters'}, 'ManualDearrayTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters'}, 'InitTMA': {}}, 'outputs': {'AceWSI': {'whole_slide_image:WholeSlideImage': 'Data'}, 'CropCoresTMA': {'dearrayed_tissue_micro_array:DearrayedTissueMicroArray': 'Data'}, 'SegArrayTMA': {'predicted_rois:PredictedROIs': 'WorkflowParameters'}, 'CreateMissileObjectDTMA': {'missile_metadata:MissileMetadata': 'Data', 'missile_counts:MissileExpressionCounts': 'Data', 'missile_spatial_data:MissileExpressionSpatialData': 'Data'}, 'AceDTMA': {'dearrayed_tissue_micro_array:DearrayedTissueMicroArray': 'Data'}, 'CreateMissileObjectWSI': {'missile_metadata:MissileMetadata': 'Data', 'missile_counts:MissileExpressionCounts': 'Data', 'missile_spatial_data:MissileExpressionSpatialData': 'Data'}, 'InitWSI': {'whole_slide_image:WholeSlideImage': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters', 'nuclear_markers:NuclearMarkers': 'WorkflowParameters', 'membrane_markers:MembraneMarkers': 'WorkflowParameters', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}, 'EditPredictedRoisTMA': {'rois:ROIs': 'WorkflowParameters'}, 'ManualDearrayTMA': {'rois:ROIs': 'WorkflowParameters'}, 'InitTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters', 'nuclear_markers:NuclearMarkers': 'WorkflowParameters', 'membrane_markers:MembraneMarkers': 'WorkflowParameters', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}}}

test_wf = """HippoFlow _JCx7AA1ZEe-bt9bPK9Z6oQ {
  TaskSIB _ev7SwQ3vEe-bt9bPK9Z6oQ at 60,180 size 240,220 {
  	libraryComponentUID "_b0088fee_75aa_4965_9586_d1da0be1a14a"
  	name "InitTMA"
  	label "InitTMA"
  	parameter [  ]
  	SIBLabel _ev-WEQ3vEe-bt9bPK9Z6oQ at 2,10 size 236,50 {
  		label "InitTMA"
  	}
  	
  	OutputPort _ewAyUQ3vEe-bt9bPK9Z6oQ at 2,60 size 236,30 {
  		typeName "TissueMicroArray"
  		name "tissue_micro_array"
  		isList false
  		-DataFlow-> _e7g3sQ3vEe-bt9bPK9Z6oQ via (40,255) (40,225)  {
  			id _gbQMIQ3vEe-bt9bPK9Z6oQ
  		}
  	}
  	
  	OutputPort _ewCngQ3vEe-bt9bPK9Z6oQ at 2,90 size 236,30 {
  		typeName "NuclearStain"
  		name "nuclear_stain"
  		isList false
  		-DataFlow-> _e7kiEQ3vEe-bt9bPK9Z6oQ via (20,285) (20,255)  {
  			id _g0KbYQ3vEe-bt9bPK9Z6oQ
  		}
  	}
  	
  	OutputPort _ewIHEQ3vEe-bt9bPK9Z6oQ at 2,120 size 236,30 {
  		typeName "NuclearMarkers"
  		name "nuclear_markers"
  		isList false
  	}
  	
  	OutputPort _ewLKYQ3vEe-bt9bPK9Z6oQ at 2,150 size 236,30 {
  		typeName "MembraneMarkers"
  		name "membrane_markers"
  		isList false
  	}
  	
  	OutputPort _ewMYgQ3vEe-bt9bPK9Z6oQ at 2,180 size 236,30 {
  		typeName "ProteinChannelMarkers"
  		name "protein_channel_markers"
  		isList false
  	}
  	-ControlFlow-> _e7dNUQ3vEe-bt9bPK9Z6oQ  decorate "" at (0,0) decorate "Text" at (0,0) {
  		id _fpRVkQ3vEe-bt9bPK9Z6oQ
  		label "success"
  	}
  }
  
  TaskSIB _e7dNUQ3vEe-bt9bPK9Z6oQ at 430,200 size 240,160 {
  	libraryComponentUID "_57f1386a_1ffb_4739_8872_42caa30d865c"
  	name "ManualDearrayTMA"
  	label "ManualDearrayTMA"
  	parameter [  ]
  	InputPort _e7g3sQ3vEe-bt9bPK9Z6oQ at 2,10 size 236,30 {
  		typeName "TissueMicroArray"
  		name "tissue_micro_array"
  		isList false
  	}
  	
  	InputPort _e7kiEQ3vEe-bt9bPK9Z6oQ at 2,40 size 236,30 {
  		typeName "NuclearStain"
  		name "nuclear_stain"
  		isList false
  	}
  	
  	SIBLabel _e7m-UQ3vEe-bt9bPK9Z6oQ at 2,70 size 236,50 {
  		label "ManualDearrayTMA"
  	}
  	
  	OutputPort _e7oMcQ3vEe-bt9bPK9Z6oQ at 2,120 size 236,30 {
  		typeName "ROIs"
  		name "rois"
  		isList false
  	}
  }
}
"""

from codegen import main


def test_generate():
    code = main.HippoFlowCodegenrator.generate(test_wf, '12345678','http://localhost:8080/', sib_map)
    print(code)
    
if	__name__ == "__main__":
	test_generate()