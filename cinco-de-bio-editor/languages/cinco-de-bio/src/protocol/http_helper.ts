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
import { Post } from './sm_protocol';

export async function makeGetRequest(url: string,
    onError: (message: string) => void,
    options: {
        params?: Record<string, string>;
        headers?: Record<string, string>;
    } = {}): Promise<any> {
    try {
        const requestUrl = new URL(url);
        Object.entries(options.params ?? {}).forEach(([key, value]) => {
            requestUrl.searchParams.set(key, value);
        });
        const fetchOptions: RequestInit = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };
        const response = await fetch(requestUrl.toString(), fetchOptions);

        if (!response.ok) {
            onError(`HTTP error! status: ${response.status}`);
            onError(`Response text: ${await response.text()}`);
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        throw error;
    }
}

export async function makePostRequest(url: string, data: Post, onError: (message: string) => void): Promise<any> {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        } as RequestInit);

        if (!response.ok) {
            onError(`${response.status}`);
            onError(await response.text());
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('There was a problem with the fetch operation:', error);
        throw error;
    }
}

