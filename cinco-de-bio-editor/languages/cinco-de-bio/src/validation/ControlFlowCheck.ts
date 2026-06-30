import { LanguageFilesRegistry, ValidationHandler } from '@cinco-glsp/cinco-glsp-api';
import { Action, ValidationResponseAction, ValidationRequestAction, ValidationStatus, ValidationMessage } from '@cinco-glsp/cinco-glsp-common';
import { hasAnyCycle, validateBranchLabels } from '../helper/validation-helper';
import { startNodeCountIsValid } from '../helper/semantics';
import { CincoDeBioGraphModel, SIB } from "../../../api/cincodebio";

export class ControlFlowCheck extends ValidationHandler {
    override CHANNEL_NAME: string | undefined = 'Workflow [' + this.modelState.graphModel.id + ']';

    override execute(action: ValidationRequestAction, ...args: unknown[]): Promise<Action[]> | Action[] {
        // next actions
        const workflow = this.getElement(action.modelElementId) as CincoDeBioGraphModel;
        const sibs = workflow.containedElements
            .filter(element => SIB.is(element));

        // preprocessing
        const cycles = hasAnyCycle(sibs);

        // identify sinks/leaves
        const no_predecessors = sibs.filter(a => a.predecessors.length == 0).map(a => a.label);
        const hasValidStartNodeCount = startNodeCountIsValid(sibs.length, no_predecessors.length);
        var label_messages: ValidationMessage[] = validateBranchLabels(sibs);
        label_messages.push(
            {
                name: `Workflow: (${workflow.id})`,
                message: cycles ? 'Workflow has Cycle(s)' : 'OK',
                status: cycles ? ValidationStatus.Error : ValidationStatus.Pass
            },
            {
                name: `Workflow: (${workflow.id})`,
                message: !hasValidStartNodeCount
                    ? `A valid workflow can only have 1 SIB without an incoming ControlFlow edge, this workflow has ${no_predecessors.length}: ${JSON.stringify(no_predecessors)}`
                    : `OK`,
                status: hasValidStartNodeCount ? ValidationStatus.Pass : ValidationStatus.Error
            }
        );

        return [ValidationResponseAction.create(workflow.id,
            'control-flow',
            label_messages,
            action.requestId
        )];
    }
}

// register into app
LanguageFilesRegistry.register(ControlFlowCheck);
