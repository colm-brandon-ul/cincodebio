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
import { GeneratorHandler, GraphModel, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import { GeneratorAction, ValidationStatus } from '@cinco-glsp/cinco-glsp-common';
import { remoteSubmitModel, validateSibLibrary } from '../protocol/sib_helper';
import { WorkflowExecutionUrlResponse } from '../protocol/sm_protocol';
import { toExternalUrl } from '../protocol/values';
import { CincoDeBioGraphModel } from '../../../api/cincodebio';

export class CincoDeBioGenerator extends GeneratorHandler {
    override CHANNEL_NAME: string | undefined = 'CincoDeBio Workflow [' + this.modelState.root.id + ']';

    override async execute(action: GeneratorAction, ...args: unknown[]) {
        if (!await validateSibLibrary(this)) {
            this.notify('The SIB Library is not up to date, please refresh it', 'ERROR');
            return [];
        }
        else {
            this.notify('All local sibs are correct.');
        }

        // parse action
        const model = this.getElement(action.modelElementId) as GraphModel;
        // NOTE: GraphModel.valid (constraint-based) reports every element as invalid in this
        // framework build, so gate on the language validation handlers (SibCheck / DataFlowCheck /
        // ControlFlowCheck) instead, which correctly report real model errors.
        if (!await this.hasValidationErrors(model) && CincoDeBioGraphModel.is(model)) {
            await this.generate(model);
        }
        else {
            this.notify('Generation failed! Model Invalid. See: Cinco Cloud Model Validation.', 'ERROR');
        }
        return [];
    }

    private async hasValidationErrors(model: GraphModel): Promise<boolean> {
        const results = await model.validationResults;
        return (results ?? []).some(response =>
            (response.messages ?? []).some(message => message.status === ValidationStatus.Error)
        );
    }

    // Send the Workflow model to the execution backend!
    async generate(model: CincoDeBioGraphModel): Promise<void> {
        const response: WorkflowExecutionUrlResponse = await remoteSubmitModel(
            model,
            {
                info: (message: string) => this.log(message),
                error: (message: string) => this.error(message)
            }
        );
        // Rewrite the internal-host URL the backend returns to the externally reachable host.
        const workflowUrl = toExternalUrl(response.url);
        this.notify(`${workflowUrl}`, 'INFO' );
        this.log(`${workflowUrl}`, {show: true});

        // This editor build ships Theia's MiniBrowser (mini-browser.openUrl); VS Code's
        // Simple Browser (simpleBrowser.api.open) is not deployed here. The command bridge
        // forwards `args` verbatim as the command's single argument (no spread), and
        // mini-browser.openUrl expects the URL string directly, so pass it unwrapped.
        this.executeCommand('mini-browser.openUrl', workflowUrl as unknown as any[]);

        // need to update the UI with URL
        this.notify('Generation successfull!', 'INFO');
    }

    override canExecute(action: GeneratorAction, ...args: unknown[]): Promise<boolean> | boolean {
        const element = this.getElement(action.modelElementId);
        return element !== undefined;
    }
}

// register into app
LanguageFilesRegistry.register(CincoDeBioGenerator);
