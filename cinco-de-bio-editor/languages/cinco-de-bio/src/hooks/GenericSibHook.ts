import { LanguageFilesRegistry, DoubleClickHandler, ModelElement } from '@cinco-glsp/cinco-glsp-api';
import { Action, DoubleClickAction } from '@cinco-glsp/cinco-glsp-common';
import { SIB } from "../../../api/cincodebio";

export class GenericSibHook extends DoubleClickHandler {
    override CHANNEL_NAME: string | undefined = 'HooksAndActions [' + (this.modelState.graphModel?.id ?? this.modelState.root.id) + ']';

    override execute(action: DoubleClickAction, ...args: unknown[]): Promise<Action[]> | Action[] {
        // parse action
        const modelElementId: string = action.modelElementId;
        const element = this.modelState.index.findElement(modelElementId) as ModelElement | undefined;

        if(SIB.is(element)) {
            this.dialog(`${element.label} Documentation`, element.documentation);
        }

        return [];
    }
}

LanguageFilesRegistry.register(GenericSibHook);
