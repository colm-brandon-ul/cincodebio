/********************************************************************************
 * Copyright (c) 2026 Cinco Cloud.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0 WITH Classpath-exception-2.0
 ********************************************************************************/
import { APIBaseHandler, ModelElementCache } from '@cinco-glsp/cinco-glsp-api';
import { SIBDef, Input, Label, Output } from '../../../api/siblibrary';
import { HEADER_HEIGHT, IO_HEIGHT, PADDING, LABEL_HEIGHT, FOOTER_HEIGHT } from './layout-helper';
import { getRandomDescriptiveWord, getRandomTypeName } from './name-helper';
import { CheckSibFilesHashesResponse, HashValid, UtdSibFilesRequest, UtdSibFilesResponse } from '../protocol/sm_protocol';
import { makePostRequest } from '../protocol/http_helper';
import { getCheckSibFilesUrl, getFilesByIdUrl, getInstalledLibrariesUrl, SIB_DIRECTORY_NAME, SIB_FILE_EXTENSION, THEIA_FOLDER, TO_EXCLUDE } from '../protocol/values';
import { SHA256 } from '../protocol/sha256';

function normalizeSibFileName(fileId: string): string {
    return fileId.endsWith(SIB_FILE_EXTENSION) ? fileId : `${fileId}${SIB_FILE_EXTENSION}`;
}

function getSibFilePath(fileId: string): string {
    return SIB_DIRECTORY_NAME + normalizeSibFileName(fileId);
}

const sibDefIconMap: { [key: string]: string } = {
    'siblibrary:task': 'icons/task.png',
    'siblibrary:service': 'icons/service.png'
};

export function createSibDef(sib: SIBDef): void {
    const name = getRandomDescriptiveWord();
    const input_type = getRandomTypeName();
    let delta = 0;

    sib.name = name;
    sib.label = name.replace(/^./, name[0].toUpperCase());

    const input = new Input();
    input.position = { x: 0, y: HEADER_HEIGHT };
    input.size = { width: sib.size.width, height: IO_HEIGHT };
    input.initializeProperties();

    input.name = input_type.toLowerCase();
    input.typeName = input_type;
    delta = (input.position.y + input.size.height + PADDING);

    const label = new Label();
    label.position = { x: 0, y: delta };
    label.size = { width: sib.size.width, height: LABEL_HEIGHT };
    label.initializeProperties();
    label.icon = sibDefIconMap[sib.type] ?? undefined;
    label.name = sib.getProperty('name');
    label.label = sib.getProperty('label');
    delta = (label.position.y + label.size.height + PADDING);

    const output_type = getRandomTypeName();
    const output = new Output();
    output.position = { x: 0, y: delta };
    output.size = { width: sib.size.width, height: IO_HEIGHT };
    output.initializeProperties();
    output.name = output_type.toLowerCase();
    output.typeName = output_type;
    delta = (output.position.y + output.size.height + PADDING);

    sib.containments.push(input, output, label);
    sib.size.height = (delta + FOOTER_HEIGHT);
}

export async function updateLocalSibLibs(
    siblibss2Update: string[], missingRemoteFiles: { [key: string]: string }, baseHandler: APIBaseHandler
): Promise<string[]> {
    const req: UtdSibFilesRequest = {
        file_ids: siblibss2Update.map(normalizeSibFileName)
    };

    const reslocal: UtdSibFilesResponse = await makePostRequest(
        getFilesByIdUrl(),
        req,
        message => baseHandler.error(message)
    );

    const updatedFiles: string[] = [];
    for (const siblib of siblibss2Update) {
        const fileName = normalizeSibFileName(siblib);
        const filePath = getSibFilePath(fileName);
        if (baseHandler.exists(filePath)) {
            baseHandler.deleteFile(filePath);
        }

        if (fileName in reslocal.files) {
            baseHandler.createFile(filePath, reslocal.files[fileName]!);
            updatedFiles.push(fileName);
        }
    }

    // create files that are on remote, but not local
    Object.keys(missingRemoteFiles).map(file_key => {
        baseHandler.createFile(getSibFilePath(file_key), missingRemoteFiles[file_key]!);
        updatedFiles.push(normalizeSibFileName(file_key));
    });
    return Array.from(new Set(updatedFiles));
}

export async function cacheLocalSibLibraryModels(baseHandler: APIBaseHandler, sibFiles?: string[]): Promise<string[]> {
    const localSibFiles = sibFiles ?? baseHandler.readDirectory(SIB_DIRECTORY_NAME) ?? [];
    const cachedFiles: string[] = [];
    for (const fileName of Array.from(new Set(localSibFiles.map(normalizeSibFileName)))) {
        const filePath = getSibFilePath(fileName);
        if (!baseHandler.existsFile(filePath)) {
            continue;
        }
        const model = await baseHandler.readModelFromFile(filePath);
        if (model) {
            ModelElementCache.cacheModel(model);
            cachedFiles.push(filePath);
        } else {
            baseHandler.error(`Could not cache SIB library model file: ${filePath}`);
        }
    }
    return cachedFiles;
}

export async function getAllInstalledSibLibs(req: UtdSibFilesRequest, baseHandler: APIBaseHandler): Promise<UtdSibFilesResponse> {
    baseHandler.log(JSON.stringify(req));

    const res: UtdSibFilesResponse = await makePostRequest(
        getInstalledLibrariesUrl(),
        req,
        message => baseHandler.error(message)
    );
    return res;
}

export async function validateSibLibrary(allSibFiles: string[], baseHandler: APIBaseHandler): Promise<{ [key: string]: HashValid }> {
    // read all model files
    const allHashes: { [key: string]: string } = {};
    allSibFiles.forEach(sf => {
        allHashes[sf] = SHA256.hash(baseHandler.readFile(SIB_DIRECTORY_NAME + sf)!);
    });

    // submit to server to ensure all valid
    const res: CheckSibFilesHashesResponse = await makePostRequest(getCheckSibFilesUrl(), {
        fileHashes: allHashes
    }, message => baseHandler.error(message));

    // return the list of sibfiles which are invalid
    return res.hashesValid;
}

export function hideFolderInWorkspace(folderToHide: string, workspacePath: string = '/', baseHandler: APIBaseHandler): void {
    const normalizedWorkspacePath = workspacePath.replace(/^\/+|\/+$/g, '');
    const settingsPath = [normalizedWorkspacePath, THEIA_FOLDER].filter(Boolean).join('/');
    const settingsFilePath = [settingsPath, 'settings.json'].join('/');

    // create .theia dir in workspace
    if (!baseHandler.existsDirectory(settingsPath)) {
        baseHandler.createDirectory(settingsPath);
    }

    // create the settings.json if it doesn't exist
    if (!baseHandler.exists(settingsFilePath)) {
        baseHandler.createFile(settingsFilePath, JSON.stringify(TO_EXCLUDE, undefined, 4));
    } else {
        const settingsContent = baseHandler.readFile(settingsFilePath);
        const settings = settingsContent ? JSON.parse(settingsContent) : {};

        if (!settings.hasOwnProperty('files.exclude')) {
            settings['files.exclude'] = {
                [folderToHide]: true
            };
            baseHandler.createFile(settingsFilePath, JSON.stringify(settings, undefined, 4), true);
        }
        else {
            if (!settings['files.exclude'].hasOwnProperty(folderToHide)) {
                settings['files.exclude'][folderToHide] = true;
                baseHandler.createFile(settingsFilePath, JSON.stringify(settings, undefined, 4), true);
            }
        }
    }
}
