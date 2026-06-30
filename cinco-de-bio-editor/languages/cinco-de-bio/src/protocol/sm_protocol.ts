
export interface Post { }
export interface Response { }
export enum HashValid {
    VALID = "VALID",
    INVALID = "INVALID"
}

export interface UtdSibFilesRequest {
    file_ids: string[];
}
export interface UtdSibFilesResponse {
    files: { [key: string]: string };
}

export interface CheckSibFilesHashesRequest {
    fileHashes: { [key: string]: string };
}

export interface CheckSibFilesHashesResponse {
    hashesValid: { [key: string]: HashValid };
}

export interface WorkFlowModelPost extends Post {
    model: string;
}

export interface WorkflowExecutionUrlResponse extends Response {
    url: string
}
