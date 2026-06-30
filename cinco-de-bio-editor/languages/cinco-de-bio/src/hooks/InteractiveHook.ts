import { Node, AbstractNodeHook, LanguageFilesRegistry, Container, ResizeBounds, GraphModelWatcher, readJson } from '@cinco-glsp/cinco-glsp-api';
import { layout } from '../helper/layout-helper';
import {  SIBDef, SIBLibrary } from "../../../api/siblibrary";
import { CincoDeBioGraphModel } from "../../../api/cincodebio";
import { createSibDef } from '../helper/siblibrary_helper';

export class SIBDefHook extends AbstractNodeHook {
    override CHANNEL_NAME: string | undefined = 'SIBDefHook [' + this.modelState.root.id + ']';
    watching = false;

    postContentChange(model: Node): void { // TODO: Sami - add issue for onOpen Annotation and add me 
        if (!GraphModelWatcher.graphModelChangeCallbacks.has('hippoFlow_' + model.id)) { // TODO: Sami - this should be onOpenModel  
            GraphModelWatcher.addCallback('hippoFlow_' + model.id, async dirtyFiles => {
                for (const dirtyFile of dirtyFiles) {
                    const model = (await readJson(dirtyFile.path, { hideError: true })) as any | undefined;
                    if (model && SIBLibrary.is(model)) {
                        // TODO: SAMI - What do you want to do here?
                    } else if (model && CincoDeBioGraphModel.is(model)) {
                        // TODO: SAMI - What do you want to do here?
                    }
                }
            });
        }
    }

    override postCreate(sibDef: SIBDef): void {
        createSibDef(sibDef);
    }

    override postResize(node: Node, _: ResizeBounds): void {
        layout(node as Container);
    }

    override postAttributeChange(node: Node, attributeName: string, oldValue: any): void {
        this.log(`${attributeName} -> ${oldValue} `)
    }
}

LanguageFilesRegistry.register(SIBDefHook);
