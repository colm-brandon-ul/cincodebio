
import { LanguageFilesRegistry, AbstractEdgeHook, Edge } from '@cinco-glsp/cinco-glsp-api';

export class DataFlowHook extends AbstractEdgeHook {
    override CHANNEL_NAME: string | undefined = 'DataFlowHook [' + this.modelState.root.id + ']';
   
    override postCreate(edge: Edge): void {
        // TODO: SAMI - What here?
        // node.setProperty("name", `${this.VERBS[this.random(0, this.VERBS.length)]} ${this.NOUNS[this.random(0, this.NOUNS.length)]}`)
    }
}

LanguageFilesRegistry.register(DataFlowHook);
