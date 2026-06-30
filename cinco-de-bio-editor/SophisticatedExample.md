# SophisticatedExample

This walkthrough reproduces the final end-to-end CincoDeBio demo with the Docker-only k3s installer. It assumes the user has Docker installed and running. No host minikube, kubectl, or Helm installation is required.

The example creates `SophisticatedExample.flow`, a TMA review workflow that combines interactive review steps, automated analysis services, typed data ports, control-flow edges, data-flow edges, SIB library refresh, workflow execution, and output inspection.

## Video Artifacts

After running the Playwright recording tests, the expected videos are:

- `artifacts/playwright/final-a-k3s-install-to-editor.webm`: installation through opening Theia.
- `artifacts/playwright/final-b-sophisticated-example.webm`: opening Theia, modelling, executing, and inspecting output.

The tests that create them are:

```bash
npm run test:final-install-video
npm run test:final-sophisticated-video
```

## A. Install And Open The Editor

1. Open a terminal in the repository-local project folder:

   ```bash
   cd cincodebio
   ```

2. Run the Docker-only installer:

   ```bash
   ./install.sh
   ```

3. Wait while the installer builds the all-in-one image, starts the privileged k3s container, deploys the Helm chart inside the container, and waits for core pods.

4. Continue only after the terminal prints:

   ```text
   CincoDeBio deployment complete!
   ```

5. Open the Theia editor:

   ```text
   http://localhost/editor/
   ```

6. Confirm the Theia workbench is visible and the top menu includes `File`.

## B. Create The Flow File

1. In Theia, open the command palette or run the Cinco project initializer command.

2. Click `Create Model`.

3. In `modelName`, type:

   ```text
   SophisticatedExample
   ```

4. In `modelType`, choose:

   ```text
   flow
   ```

5. Click `Confirm`.

6. Open `SophisticatedExample.flow` from the workspace if it does not open automatically.

7. Save once so the editor creates the file in `/editor/workspace`.

## C. Model Stage 1: InitTMA

1. Add one interactive SIB named `InitTMA` near the left side of the canvas.

2. Set the SIB label to `InitTMA`.

3. Confirm the SIB uses a task-style icon or interactive SIB appearance.

4. Add these output ports:

   - `tissue_micro_array` with type `TissueMicroArray`.
   - `nuclear_stain` with type `NuclearStain`.
   - `nuclear_markers` with type `NuclearMarkers`.
   - `membrane_markers` with type `MembraneMarkers`.
   - `protein_channel_markers` with type `ProteinChannelMarkers`.

5. Set the branch label to `success`.

6. Save the model.

## D. Model Stage 2: Review Entry Path

1. Add an automated SIB named `SegArrayTMA` to the right of `InitTMA`.

2. Add input ports to `SegArrayTMA`:

   - `tissue_micro_array` with type `TissueMicroArray`.
   - `nuclear_stain` with type `NuclearStain`.

3. Add an output port to `SegArrayTMA`:

   - `predicted_rois` with type `RegionsOfInterestPredictions`.

4. Add an interactive SIB named `EditPredictedRoisTMA` to the right of `SegArrayTMA`.

5. Add input ports to `EditPredictedRoisTMA`:

   - `tissue_micro_array` with type `TissueMicroArray`.
   - `nuclear_stain` with type `NuclearStain`.
   - `predicted_rois` with type `RegionsOfInterestPredictions`.

6. Add an output port to `EditPredictedRoisTMA`:

   - `rois` with type `RegionsOfInterest`.

7. Draw a control-flow edge from `InitTMA` to `SegArrayTMA` and label it `success`.

8. Draw a control-flow edge from `SegArrayTMA` to `EditPredictedRoisTMA` and label it `success`.

9. Draw data-flow edges:

   - `InitTMA.tissue_micro_array` to `SegArrayTMA.tissue_micro_array`.
   - `InitTMA.nuclear_stain` to `SegArrayTMA.nuclear_stain`.
   - `InitTMA.tissue_micro_array` to `EditPredictedRoisTMA.tissue_micro_array`.
   - `InitTMA.nuclear_stain` to `EditPredictedRoisTMA.nuclear_stain`.
   - `SegArrayTMA.predicted_rois` to `EditPredictedRoisTMA.predicted_rois`.

10. Save the model.

## E. Model Stage 3: Crop Reviewed Cores

1. Add an automated SIB named `CropCoresTMA` to the right of `EditPredictedRoisTMA`.

2. Add input ports to `CropCoresTMA`:

   - `tissue_micro_array` with type `TissueMicroArray`.
   - `rois` with type `RegionsOfInterest`.

3. Add an output port to `CropCoresTMA`:

   - `dearrayed_tissue_micro_array` with type `DearrayedTissueMicroArray`.

4. Draw a control-flow edge from `EditPredictedRoisTMA` to `CropCoresTMA` and label it `success`.

5. Draw data-flow edges:

   - `InitTMA.tissue_micro_array` to `CropCoresTMA.tissue_micro_array`.
   - `EditPredictedRoisTMA.rois` to `CropCoresTMA.rois`.

6. Save the model.

## F. Model Stage 4: Technical Correction

1. Add an automated SIB named `AceDTMA` above the main lane, to the right of `CropCoresTMA`.

2. Add input port `dearrayed_tissue_micro_array` with type `DearrayedTissueMicroArray`.

3. Add output port `dearrayed_tissue_micro_array` with type `DearrayedTissueMicroArray`.

4. Draw a control-flow edge from `CropCoresTMA` to `AceDTMA` and label it `success`.

5. Draw a data-flow edge from `CropCoresTMA.dearrayed_tissue_micro_array` to `AceDTMA.dearrayed_tissue_micro_array`.

6. Save the model.

## G. Model Stage 5: MISSILE Object Outputs

1. Add an automated SIB named `XtracitDTMA` to the right of `AceDTMA`.

2. Add input ports to `XtracitDTMA`:

   - `dearrayed_tissue_micro_array` with type `DearrayedTissueMicroArray`.
   - `nuclear_markers` with type `NuclearMarkers`.
   - `protein_channel_markers` with type `ProteinChannelMarkers`.

3. Add output port `dearrayed_tissue_micro_array_missile_fcs` with type `DearrayedTissueMicroArrayMissileFCS`.

4. Draw a control-flow edge from `AceDTMA` to `XtracitDTMA` and label it `success`.

5. Draw data-flow edges:

   - `AceDTMA.dearrayed_tissue_micro_array` to `XtracitDTMA.dearrayed_tissue_micro_array`.
   - `InitTMA.nuclear_markers` to `XtracitDTMA.nuclear_markers`.
   - `InitTMA.protein_channel_markers` to `XtracitDTMA.protein_channel_markers`.

6. Add an automated SIB named `CreateMissileObjectDTMA` to the right of `XtracitDTMA`.

7. Add input ports to `CreateMissileObjectDTMA`:

   - `dearrayed_tissue_micro_array_missile_fcs` with type `DearrayedTissueMicroArrayMissileFCS`.
   - `protein_channel_markers` with type `ProteinChannelMarkers`.

8. Add output ports to `CreateMissileObjectDTMA`:

   - `missile_metadata` with type `MissileMetadata`.
   - `missile_counts` with type `MissileExpressionCounts`.
   - `missile_spatial_data` with type `MissileExpressionSpatialData`.

9. Draw a control-flow edge from `XtracitDTMA` to `CreateMissileObjectDTMA` and label it `success`.

10. Draw data-flow edges:

   - `XtracitDTMA.dearrayed_tissue_micro_array_missile_fcs` to `CreateMissileObjectDTMA.dearrayed_tissue_micro_array_missile_fcs`.
   - `InitTMA.protein_channel_markers` to `CreateMissileObjectDTMA.protein_channel_markers`.

11. Save the model.

## H. Use Editor Features Before Execution

1. Right-click an empty part of the canvas.

2. Click `Refresh SIB Library`.

3. Wait for the refresh action to finish without an error dialog.

4. Select individual SIBs and verify the appearance differences between interactive SIBs and automated SIBs.

5. Inspect the port lists and labels for long data types, especially the Ace and Xtracit ports.

6. Pan and zoom the canvas to verify the entire workflow can be reviewed.

7. Save the final model.

## I. Execute The Model

1. Trigger the CincoDeBio generator or submit the finished model to the execution backend.

2. The execution submission endpoint is:

   ```text
   http://localhost/execution-api/ext/model/submit?v2=true
   ```

3. The submitted multipart field must be named `model` and should contain the JSON content of `SophisticatedExample.flow`.

4. A successful submission returns HTTP 202 and a JSON object with a workflow URL similar to:

   ```json
   {
     "url": "https://localhost/app/workflows/<workflow-id>"
   }
   ```

5. Open the returned URL with `http://localhost` if the local browser does not accept the generated `https://localhost` URL:

   ```text
   http://localhost/app/workflows/<workflow-id>
   ```

## J. Inspect Output

1. Confirm the workflow page opens.

2. Check the workflow status through the UI.

3. For a direct backend check, request:

   ```text
   http://localhost/execution-api/ext/get-workflows
   ```

4. Find the workflow id returned by the submission call.

5. Confirm the workflow appears with a state such as `submitted`, `accepted`, `processing`, `completed`, or `failed`.

6. If a service enters `awaiting_interaction`, open the service frontend URL shown by the workflow UI and complete the required review step.

7. If the workflow completes, inspect the generated files through the workflow page or data-manager download route.

## Feature Checklist

- Docker-only k3s install through `cincodebio/install.sh`.
- Theia editor access at `http://localhost/editor/`.
- Flow-file creation in the editor.
- Interactive SIBs: `InitTMA`, `EditPredictedRoisTMA`.
- Automated SIBs: `SegArrayTMA`, `CropCoresTMA`, `AceDTMA`, `XtracitDTMA`, `CreateMissileObjectDTMA`.
- SIB labels and icons.
- Typed input ports and output ports.
- Control-flow edges with `success` labels.
- Data-flow edges between typed ports.
- Branching data dependencies from one initializer into multiple downstream services.
- SIB library refresh from the graph context menu.
- Canvas selection, panning, zooming, and saving.
- Execution backend submission.
- Workflow URL inspection.
- Workflow state inspection through the frontend and API.
