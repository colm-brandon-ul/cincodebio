import { APIBaseHandler } from "@cinco-glsp/cinco-glsp-api";
import { SHA256 } from "./sha256";
import { getCheckSibFilesUrl, getInstalledLibrariesUrl, getModelSubmissionUrl, SIB_DIRECTORY_NAME } from "./values";
import { makePostRequest } from "./http_helper";
import { CheckSibFilesHashesResponse, HashValid, UtdSibFilesResponse, WorkflowExecutionUrlResponse } from "./sm_protocol";


export async function validateSibLibrary(baseHandler: APIBaseHandler): Promise<boolean> {
    // read all model files
    var allSibFiles: string[] = baseHandler.readDirectory(SIB_DIRECTORY_NAME) ?? []
    const url = getInstalledLibrariesUrl();
    const missingFiles: UtdSibFilesResponse = await makePostRequest(url, {
        file_ids: allSibFiles
    }, (message) => baseHandler.error(message));
    if (Object.keys(missingFiles.files).length > 0) {
        return false;
    }

    const allHashes: { [key: string]: string } = {};
    allSibFiles.forEach(sf => {
        allHashes[sf] = SHA256.hash(baseHandler.readFile(SIB_DIRECTORY_NAME + sf)!);
    });

    // submit to server to ensure all valid
    const res: CheckSibFilesHashesResponse = await makePostRequest(getCheckSibFilesUrl(), {
        fileHashes: allHashes
    }, (message) => baseHandler.error(message))

    // check if any are invalid
    return allSibFiles.every(file => res.hashesValid[file] === HashValid.VALID);
}



export async function remoteSubmitModel(modelJson: object, log: { info: (message: string) => void; error: (message: string) => void; }, isV2: boolean = true): Promise<WorkflowExecutionUrlResponse> {
    const formData = new FormData();
    const jsonBlob = new Blob([JSON.stringify(modelJson)], { type: 'application/json' });
    formData.append('model', jsonBlob, 'model.json');

    const url = new URL(getModelSubmissionUrl());
    url.searchParams.append('v2', isV2.toString());

    try {
        const response = await fetch(url, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
            log.error(`${response.status}`)
            log.error(await response.text())
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        return result;
    } catch (error) {
        log.error('Error submitting model:' + error);
        throw error;
    }
}
