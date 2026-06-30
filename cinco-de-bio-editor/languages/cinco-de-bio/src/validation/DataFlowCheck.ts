import { LanguageFilesRegistry, ValidationHandler } from '@cinco-glsp/cinco-glsp-api';
import { Action, ValidationResponseAction, ValidationRequestAction, ValidationStatus, ValidationMessage } from '@cinco-glsp/cinco-glsp-common';
import { getAllPaths } from '../helper/validation-helper';
import { portsCompatible } from '../helper/semantics';
import { CincoDeBioGraphModel, OutputPort, SIB } from "../../../api/cincodebio";

export class DataFlowCheck extends ValidationHandler {
    override CHANNEL_NAME: string | undefined = 'Workflow [' + this.modelState.graphModel.id + ']';

    override execute(action: ValidationRequestAction, ...args: unknown[]): Promise<Action[]> | Action[] {
        // next actions
        const workflow = this.getElement(action.modelElementId) as CincoDeBioGraphModel;
        const sibs = workflow.containedElements
            .filter(element => SIB.is(element));

        var label_messages: ValidationMessage[] = [];
        sibs.forEach((sib) => {
            var inputPorts = sib.containedInputPortElements;
            const rev_paths: string[][] = getAllPaths(sib, true);
            this.log('PATHS: ' + sib.id + '\n' + JSON.stringify(rev_paths));

            inputPorts.forEach((ip) => {
                ip.incomingDataFlowEdges.forEach((edge) => {
                    const op = edge.source as OutputPort;
                    const opTypeName = op.typeName;
                    const ipTypeName = ip.typeName;
                    const osib = op.parent as SIB;

                    // check for type mismatch
                    if (!portsCompatible(op, ip)) {
                        label_messages.push(
                            {
                                name: `SIB : (${sib.id})`,
                                message: `Type Mismatch on ${sib.getProperty('label')}. Input of ${opTypeName} from ${osib.label} is invalid. Valid input ${ipTypeName}`,
                                status: ValidationStatus.Error
                            }
                        );
                    }

                    // check if input is from a SIB later in the control flow graph
                    if (!rev_paths.some((path) => path.some((value) => value === osib.id))) {
                        label_messages.push(
                            {
                                name: `SIB : (${sib.id})`,
                                message: `Input of ${opTypeName} from ${osib.label} is invalid, as ${osib.label} does not occur before or is on another branch to ${sib.label} in the Workflow`,
                                status: ValidationStatus.Error
                            }
                        );
                    }
                })
            })
        })

        // need to go through each input port for each sib and make sure it has an incoming edge
        // if it doesn't then that's an error
        // if it does, need to check for type mismatch
        var responses: ValidationResponseAction[] = [];
        if (label_messages.length > 0) {
            responses.push(ValidationResponseAction.create(
                this.modelState.graphModel.id,
                'data-flow-check',
                label_messages,
                action.requestId
            ))
        }
        else {
            const ok: ValidationMessage = {
                name: `Workflow : (${workflow.id})`,
                message: 'OK',
                status: ValidationStatus.Pass
            }
            responses.push(ValidationResponseAction.create(
                this.modelState.graphModel.id,
                'data-flow-check',
                [ok],
                action.requestId
            ))
        }
        return responses;
    }
}

// register into app
LanguageFilesRegistry.register(DataFlowCheck);
