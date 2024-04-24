sib_map = {'inputs': {'AceWSI': {'whole_slide_image:WholeSlideImage': 'Data'}, 'CropCoresTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'rois:ROIs': 'WorkflowParameters'}, 'SegArrayTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters'}, 'CreateMissileObjectDTMA': {'dearrayed_tissue_micro_array_missile_fcs:DearrayedTissueMicroArrayMissileFCS': 'Data', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}, 'AceDTMA': {'dearrayed_tissue_micro_array:DearrayedTissueMicroArray': 'Data'}, 'CreateMissileObjectWSI': {'whole_slide_image_missile_fcs:WholeSlideImageMissileFCS': 'Data', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}, 'InitWSI': {}, 'EditPredictedRoisTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters', 'predicted_rois:PredictedROIs': 'WorkflowParameters'}, 'ManualDearrayTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters'}, 'InitTMA': {}}, 
'outputs': {'AceWSI': {'whole_slide_image:WholeSlideImage': 'Data'}, 'CropCoresTMA': {'dearrayed_tissue_micro_array:DearrayedTissueMicroArray': 'Data'}, 'SegArrayTMA': {'predicted_rois:PredictedROIs': 'WorkflowParameters'}, 'CreateMissileObjectDTMA': {'missile_metadata:MissileMetadata': 'Data', 'missile_counts:MissileExpressionCounts': 'Data', 'missile_spatial_data:MissileExpressionSpatialData': 'Data'}, 'AceDTMA': {'dearrayed_tissue_micro_array:DearrayedTissueMicroArray': 'Data'}, 'CreateMissileObjectWSI': {'missile_metadata:MissileMetadata': 'Data', 'missile_counts:MissileExpressionCounts': 'Data', 'missile_spatial_data:MissileExpressionSpatialData': 'Data'}, 'InitWSI': {'whole_slide_image:WholeSlideImage': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters', 'nuclear_markers:NuclearMarkers': 'WorkflowParameters', 'membrane_markers:MembraneMarkers': 'WorkflowParameters', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}, 'EditPredictedRoisTMA': {'rois:ROIs': 'WorkflowParameters'}, 'ManualDearrayTMA': {'rois:ROIs': 'WorkflowParameters'}, 'InitTMA': {'tissue_micro_array:TissueMicroArray': 'Data', 'nuclear_stain:NuclearStain': 'WorkflowParameters', 'nuclear_markers:NuclearMarkers': 'WorkflowParameters', 'membrane_markers:MembraneMarkers': 'WorkflowParameters', 'protein_channel_markers:ProteinChannelMarkers': 'WorkflowParameters'}}, 
'concepts': {'AceWSI': 'TechnicalVarianceCorrection', 'CropCoresTMA': 'DeArray', 'SegArrayTMA': 'DeArray', 'CreateMissileObjectDTMA': 'DataTransformation', 'AceDTMA': 'TechnicalVarianceCorrection', 'CreateMissileObjectWSI': 'DataTransformation', 'InitWSI': 'Start', 'EditPredictedRoisTMA': 'DeArray', 'ManualDearrayTMA': 'DeArray', 'InitTMA': 'Start'}}

test_wf = """HippoFlow _Nm3M0P5IEe6GW8J3C84YnA {
  TaskSIB _Zop_IQGHEe-VG6OBafcrYg at 250,70 size 240,220 {
  	libraryComponentUID "_71fc05b6_c395_4144_a78f_53ceaed17f92"
  	name "InitTMA"
  	label "InitTMA"
  	SIBLabel _ZotpgQGHEe-VG6OBafcrYg at 2,10 size 236,50 {
  		label "InitTMA"
  	}
  	OutputPort _Zou3oQGHEe-VG6OBafcrYg at 2,60 size 236,30 {
  		typeName "TissueMicroArray"
  		name "tissue_micro_array"
  		isList false
  		-DataFlow-> _cFOvQQGHEe-VG6OBafcrYg via (200,145) (200,415)  {
  			id _cqbHAQGHEe-VG6OBafcrYg
  		}
  		-DataFlow-> _gDgisQGHEe-VG6OBafcrYg via (170,145) (170,655)  {
  			id _ks8zAQGHEe-VG6OBafcrYg
  		}
  	}
  	OutputPort _ZowFwQGHEe-VG6OBafcrYg at 2,90 size 236,30 {
  		typeName "NuclearStain"
  		name "nuclear_stain"
  		isList false
  		-DataFlow-> _cFQkcQGHEe-VG6OBafcrYg via (180,175) (180,445)  {
  			id _dAUegQGHEe-VG6OBafcrYg
  		}
  		-DataFlow-> _gDhw0QGHEe-VG6OBafcrYg via (150,175) (150,685)  {
  			id _lVidAQGHEe-VG6OBafcrYg
  		}
  	}
  	OutputPort _ZoxT4QGHEe-VG6OBafcrYg at 2,120 size 236,30 {
  		typeName "NuclearMarkers"
  		name "nuclear_markers"
  		isList false
  	}
  	OutputPort _ZozJEQGHEe-VG6OBafcrYg at 2,150 size 236,30 {
  		typeName "MembraneMarkers"
  		name "membrane_markers"
  		isList false
  	}
  	OutputPort _Zo1lUQGHEe-VG6OBafcrYg at 2,180 size 236,30 {
  		typeName "ProteinChannelMarkers"
  		name "protein_channel_markers"
  		isList false
  	}
  	-ControlFlow-> _cFM6EQGHEe-VG6OBafcrYg  decorate "" at (0,0) decorate "Text" at (0,0) {
  		id _93d0EQIeEe-VG6OBafcrYg
  		label "success"
  	}
  }
  ServiceSIB _cFM6EQGHEe-VG6OBafcrYg at 220,390 size 240,160 {
  	libraryComponentUID "_f3f5c104_4879_47a0_af99_499d2eabf8fa"
  	name "SegArrayTMA"
  	label "SegArrayTMA"
  	InputPort _cFOvQQGHEe-VG6OBafcrYg at 2,10 size 236,30 {
  		typeName "TissueMicroArray"
  		name "tissue_micro_array"
  		isList false
  	}
  	InputPort _cFQkcQGHEe-VG6OBafcrYg at 2,40 size 236,30 {
  		typeName "NuclearStain"
  		name "nuclear_stain"
  		isList false
  	}
  	SIBLabel _cFSZoQGHEe-VG6OBafcrYg at 2,70 size 236,50 {
  		label "SegArrayTMA"
  	}
  	OutputPort _cFSZowGHEe-VG6OBafcrYg at 2,120 size 236,30 {
  		typeName "PredictedROIs"
  		name "predicted_rois"
  		isList false
  		-DataFlow-> _gDjmAQGHEe-VG6OBafcrYg via (190,525) (190,715)  {
  			id _hR6PgQGHEe-VG6OBafcrYg
  		}
  	}
  	-ControlFlow-> _gDetgQGHEe-VG6OBafcrYg  decorate "" at (0,0) decorate "Text" at (0,0) {
  		id _-qIAEQIeEe-VG6OBafcrYg
  		label "success"
  	}
  }
  TaskSIB _gDetgQGHEe-VG6OBafcrYg at 220,630 size 240,190 {
  	libraryComponentUID "_647a4bc7_574c_4420_a43d_bde1e38dbf49"
  	name "EditPredictedRoisTMA"
  	label "EditPredictedRoisTMA"
  	InputPort _gDgisQGHEe-VG6OBafcrYg at 2,10 size 236,30 {
  		typeName "TissueMicroArray"
  		name "tissue_micro_array"
  		isList false
  	}
  	InputPort _gDhw0QGHEe-VG6OBafcrYg at 2,40 size 236,30 {
  		typeName "NuclearStain"
  		name "nuclear_stain"
  		isList false
  	}
  	InputPort _gDjmAQGHEe-VG6OBafcrYg at 2,70 size 236,30 {
  		typeName "PredictedROIs"
  		name "predicted_rois"
  		isList false
  	}
  	SIBLabel _gDk0IQGHEe-VG6OBafcrYg at 2,100 size 236,50 {
  		label "EditPredictedRoisTMA"
  	}
  	OutputPort _gDmCQQGHEe-VG6OBafcrYg at 2,150 size 236,30 {
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