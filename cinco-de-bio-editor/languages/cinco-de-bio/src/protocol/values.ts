/********************************************************************************
 * Copyright (c) 2026 Cinco De Bio.
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
export const TO_EXCLUDE = {
    'files.exclude': {
        '**/.git': true,
        '**/.svn': true,
        '**/.hg': true,
        '**/.DS_Store': true,
        '**/.vscode': true,
        '**/.idea': true,
        '**/.settings': true,
        '**/node_modules': true,
        '**/.theia': true,
        '**/.siblib': true,
        '**/siblib': true
    }
};

declare const process: { env?: Record<string, string | undefined> } | undefined;

function readEnv(name: string): string | undefined {
    try {
        return process?.env?.[name];
    } catch {
        return undefined;
    }
}

function normalizeBaseUrl(url: string): string {
    return url.replace(/\/+$/, '');
}

/**
 * Folder
 */
export const SIB_DIRECTORY_NAME: string = 'siblib/';
export const SIB_FILE_EXTENSION: string = '.sibs';
export const THEIA_FOLDER: string = '.theia';

/**
 * Remote host configuration
 *
 * When running the editor from source on the host (dev mode), the GLSP server talks to the
 * k3s ingress on http://localhost. In-cluster deployments override the per-service base URLs
 * below with the Kubernetes service names (e.g. http://sib-manager, http://execution-api).
 */
export const REMOTE_HOST: string = normalizeBaseUrl(
    readEnv('CINCODEBIO_API_BASE_URL')
    ?? readEnv('CDB_API_BASE_URL')
    ?? 'http://localhost'
);
export const INTERNAL_URL: string = '';
export const SIB_MANAGER_BASE_URL: string = normalizeBaseUrl(
    readEnv('CINCODEBIO_SIB_MANAGER_BASE_URL')
    ?? `${REMOTE_HOST}/sib-manager`
);
export const EXECUTION_API_BASE_URL: string = normalizeBaseUrl(
    readEnv('CINCODEBIO_EXECUTION_API_BASE_URL')
    ?? `${REMOTE_HOST}/execution-api`
);

/**
 * Endpoints
 */
export const GET_SIB_FILES_BY_IDS: string = 'get-utd-sib-files';
export const GET_INSTALLED_LIBRARIES_ENDPOINT: string = 'get-missing-sib-files';
export const CHECK_SIB_FILES_ENDPOINT: string = 'check-sib-files-hashes';
export const MODEL_SUBMISSION_ENDPOINT: string = 'execution-api/ext/model/submit';

export function getFilesByIdUrl(): string {
    return `${SIB_MANAGER_BASE_URL}/ext/${GET_SIB_FILES_BY_IDS}`;
}

export function getInstalledLibrariesUrl(): string {
    return `${SIB_MANAGER_BASE_URL}/ext/${GET_INSTALLED_LIBRARIES_ENDPOINT}`;
}

export function getCheckSibFilesUrl(): string {
    return `${SIB_MANAGER_BASE_URL}/ext/${CHECK_SIB_FILES_ENDPOINT}`;
}

export function getModelSubmissionUrl(): string {
    return `${EXECUTION_API_BASE_URL}/ext/model/submit`;
}

/**
 * The execution-api builds the workflow URL from its own request base-url, so when the editor
 * submits via the in-cluster service name the returned URL points at the internal host
 * (e.g. https://execution-api/app/workflows/...). Rewrite it to the externally reachable host
 * (REMOTE_HOST, e.g. http://localhost) so the link works in the user's browser.
 */
export function toExternalUrl(url: string): string {
    try {
        const target = new URL(url);
        const base = new URL(REMOTE_HOST);
        target.protocol = base.protocol;
        target.host = base.host;
        return target.toString();
    } catch {
        return url;
    }
}
