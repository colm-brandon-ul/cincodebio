import { CustomActionHandler, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import { Action, CustomAction } from '@cinco-glsp/cinco-glsp-common';
import { DeleteElementOperation } from '@eclipse-glsp/server';
import { layout } from '../helper/layout-helper';
import { arraysHaveSameElements } from '../helper/validation-helper';
import { containmentSignature } from '../helper/semantics';
import { InputPort, OutputPort, SIB, SIBLabel } from "../../../api/cincodebio";
import { Branch, Input, IODef, Label, Output, SIBDef } from "../../../api/siblibrary";

export class UpdateSIB extends CustomActionHandler {
    override CHANNEL_NAME: string | undefined = 'UpdateSIB [' + this.modelState.root.id + ']';

    override async execute(action: CustomAction, ...args: any): Promise<Action[]> {
        const sib = this.modelState.index.findNode(action.modelElementId);
        if (!SIB.is(sib)) {
            return [];
        }
        const reference = (await sib.primeReference) as SIBDef | undefined;
        if (!reference) {
            this.error(`Could not update SIB ${sib.id}: prime reference is missing.`);
            return [];
        }
        const noBranches = reference.containedElements.filter((a) => !Branch.is(a));
        const branches = reference.containedBranchElements.filter((a) => Branch.is(a)).map(a => a.name);

        if (!arraysHaveSameElements(sib.validBranches ?? [], branches)) {
            this.log(branches.join(' ,') + `\n${sib.validBranches}`);
            sib.validBranches = branches;
        }

        // Overwrite attributes
        Object.keys(sib.properties).forEach(k => {
            if (reference.getProperty(k) !== undefined && sib.getProperty(k) !== reference.getProperty(k)) {
                sib.setProperty(k, reference.getProperty(k))
            }
        });

        // iterate over csib and see what isn't in prime then delete them
        const indexesToRemove: number[] = [];
        const cache = new Map<string, string>();
        const getContainmentSignature = (element: any): string => {
            let kind = element.type as string;
            if (InputPort.is(element) || Input.is(element)) {
                kind = 'input';
            } else if (OutputPort.is(element) || Output.is(element)) {
                kind = 'output';
            } else if (SIBLabel.is(element) || Label.is(element)) {
                kind = 'label';
            }
            return containmentSignature(kind, element.properties);
        }
        sib.containments.forEach((a, i) => {
            const match = noBranches.some((b) => {
                if (cache.has(b.id) && cache.has(a.id)) {
                    // add none to cache
                    return cache.get(a.id) === cache.get(b.id);
                } else if (cache.has(b.id)) {
                    // add a to cache
                    cache.set(a.id, getContainmentSignature(a));
                    return cache.get(a.id) === cache.get(b.id);
                } else if (cache.has(a.id)) {
                    // add b to cache
                    cache.set(b.id, getContainmentSignature(b));
                    return cache.get(a.id) === cache.get(b.id);
                } else {
                    // add both to cache
                    cache.set(a.id, getContainmentSignature(a));
                    cache.set(b.id, getContainmentSignature(b));
                    return cache.get(a.id) === cache.get(b.id);
                }
            })
            if (!match) {
                indexesToRemove.push(i);
            }
        })

        // remove nodes from csib which aren't in prime
        const actions: Action[] = [];
        actions.push(DeleteElementOperation.create(
            sib.containments
                .filter((v, i) => indexesToRemove.includes(i))
                .map(a => a.id)));


        // then iterate over prime and see what isn't in csib and add?
        noBranches.forEach((a) => {
            const match = sib.containments.some((b) => {
                if (cache.has(b.id) && cache.has(a.id)) {
                    // add none to cache
                    return cache.get(a.id) === cache.get(b.id);
                }
                else if (cache.has(b.id)) {
                    // add a to cache
                    cache.set(a.id, getContainmentSignature(a));
                    return cache.get(a.id) === cache.get(b.id);
                }
                else if (cache.has(a.id)) {
                    // add b to cache
                    cache.set(b.id, getContainmentSignature(b));
                    return cache.get(a.id) === cache.get(b.id);
                }
                else {
                    // add both to cache
                    cache.set(a.id, getContainmentSignature(a));
                    cache.set(b.id, getContainmentSignature(b));
                    return cache.get(a.id) === cache.get(b.id);
                }
            })

            if (!match) {
                let n;
                if (IODef.is(a)) {
                    if (Input.is(a)) {
                        n = new InputPort();
                        this.log(`Adding Input: ${a.name} to SIB: ${sib.label}`);
                    }
                    if (Output.is(a)) {
                        n = new OutputPort();
                        this.log(`Adding Output: ${a.name} to SIB: ${sib.label}`);
                    } 
                    if(n === undefined) {
                        throw Error("Type not recognized for IO addition");
                    }
                    n.initializeProperties();
                    n.name = a.name;
                    n.typeName = a.typeName;
                    n.list = a.list;
                }
                else if (Label.is(a)) {
                    this.log(`Adding Label: ${a.name} to SIB: ${sib.label}`);
                    n = new SIBLabel();
                    n.initializeProperties();
                    n.label  = a.label;
                    n.icon = a.icon;
                } else {
                    throw Error("Type not recognized for containment addition");
                }
                n.position = { x: a.position.x, y: a.position.y };
                n.size = { width: sib.size.width, height: a.size.height };
                sib.containments.push(n);
            }
        })
        layout(sib);
        return actions;
    }
}

LanguageFilesRegistry.register(UpdateSIB);

