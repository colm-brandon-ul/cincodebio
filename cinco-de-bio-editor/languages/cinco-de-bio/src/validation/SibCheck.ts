import { LanguageFilesRegistry, ValidationHandler } from '@cinco-glsp/cinco-glsp-api';
import { Action, ValidationResponseAction, ValidationRequestAction, ValidationStatus, ValidationMessage } from '@cinco-glsp/cinco-glsp-common';
import { CincoDeBioGraphModel, SIB } from "../../../api/cincodebio";
import { SIBDef } from "../../../api/siblibrary";
import { portSignature } from '../helper/semantics';

export class SibCheck extends ValidationHandler {
    override CHANNEL_NAME: string | undefined = 'Workflow [' + this.modelState.graphModel.id + ']';

    override async execute(action: ValidationRequestAction, ...args: unknown[]): Promise<Action[]> {
        // next actions
        const workflow = this.getElement(action.modelElementId) as CincoDeBioGraphModel;
        const sibs = workflow.containedElements
            .filter(element => SIB.is(element));
        if (sibs.length == 0) {
            return [];
        }

        var label_messages: ValidationMessage[] = []
        await Promise.all(
            sibs.map(async (sib) => {
                const rcsib = (await sib.primeReference) as SIBDef | undefined;

                // prime reference no longer exist
                if (rcsib === undefined) {
                    label_messages.push({
                        name: `SIB: ${sib.label} (${sib.id})`,
                        message: `No longer exists in the SIB library. Please delete.`,
                        status: ValidationStatus.Error
                    });
                } else {
                    label_messages.push(...this.validatePrime(sib, rcsib));
                    sib.containedInputPortElements.forEach((ip) => {
                        if (ip.incomingEdges.length !== 1) {
                            label_messages.push({
                                name: `SIB: ${sib.label} (${sib.id})`,
                                message: `Missing dataflow edge for ${ip.name}: ${ip.typeName}`,
                                status: ValidationStatus.Error
                            });
                        }
                    });
                }
            })
        );

        var responses: ValidationResponseAction[] = [];
        if (label_messages.length > 0) {
            responses.push(ValidationResponseAction.create(
                this.modelState.graphModel.id,
                'sib-check',
                label_messages,
                action.requestId
            ))
        } else {
            const ok: ValidationMessage = {
                name: `Workflow : (${workflow.id})`,
                message: 'OK',
                status: ValidationStatus.Pass
            }
            responses.push(ValidationResponseAction.create(
                this.modelState.graphModel.id,
                'sib-check',
                [ok],
                action.requestId
            ))
        }

        return responses;
    }

    /**
     * Checks to see if all the input ports, output ports, labels & branches are indentical between the workflow SIB
     * and the reference SIB.
     * @param {Container} node - The SIB from the worflow (cincodebio)
     * @param {Container} ref - The PrimeReference SIB (siblibrary) the workflow SIB (cincodebio) is referencing. 
     * @returns {ValidationMessage[]}
     */
    validatePrime(node: SIB, ref: SIBDef): ValidationMessage[] {
        var messages: ValidationMessage[] = [];

        const nodeBranches = node.validBranches ?? [];
        const refBranches = ref.containedBranchElements.map(a => a.name as string);
        if (!areSetsEqual(new Set(nodeBranches), new Set(refBranches))) {
            messages.push({
                name: `SIB: ${node.label} (${node.id})`,
                message: `Control Flow Branches have changed. Current: [${nodeBranches.join(', ')}] - Actual: [${refBranches.join(', ')}]. Please Refresh SIB. `,
                status: ValidationStatus.Error
            })
        }

        const nodeLabel = `${node.name} ${node.label}`;
        const refLabel = `${ref.name} ${ref.label}`;
        if (nodeLabel !== refLabel) {
            messages.push({
                name: `SIB: ${node.label} (${node.id})`,
                message: `SIB name has changed to ${refLabel}. Please Refresh SIB.`,
                status: ValidationStatus.Error
            })
        }

        const nip: string[] = node.containedInputPortElements
            .map(a => portSignature(a));
        const rip: string[] = ref.containedInputElements
            .map(a => portSignature(a));
        const nop: string[] = node.containedOutputPortElements
            .map(a => portSignature(a));
        const rop: string[] = ref.containedOutputElements
            .map(a => portSignature(a));
        const collectErrors = (containedPorts: string[], referencedPorts: string[], portType: string) => {
            // in wflow but not in prime
            const i1 = Array.from(new Set(difference(new Set(containedPorts), new Set(referencedPorts))))
            // in prime but not in wflow
            const i2 = Array.from(new Set(difference(new Set(referencedPorts), new Set(containedPorts))))

            if (i1.length != 0) {
                messages.push({
                    name: `SIB: ${node.label} (${node.id})`,
                    message: `${portType} Ports - ${i1.join(', ')} no longer exist. Please Refresh SIB.`,
                    status: ValidationStatus.Error
                })
            }

            if (i2.length != 0) {
                messages.push({
                    name: `SIB: ${node.label} (${node.id})`,
                    message: `${portType} Ports - ${i2.join(', ')} are missing. Please Refresh SIB.`,
                    status: ValidationStatus.Error
                })
            }
        }
        collectErrors(nip, rip, "Input");
        collectErrors(nop, rop, "Output");

        return messages;
    }
}

export function difference<T>(setA: Set<T>, setB: Set<T>): Set<T> {
    return new Set([...setA].filter(x => !setB.has(x)));
}

export function areSetsEqual<T>(set1: Set<T>, set2: Set<T>): boolean {
    return set1.size === set2.size &&
        [...set1].every(element => set2.has(element));
}

// register into app
LanguageFilesRegistry.register(SibCheck);

