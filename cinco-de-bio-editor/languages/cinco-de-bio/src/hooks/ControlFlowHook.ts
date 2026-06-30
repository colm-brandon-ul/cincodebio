
import { LanguageFilesRegistry, AbstractEdgeHook } from '@cinco-glsp/cinco-glsp-api';
import { ControlFlow, SIB } from "../../../api/cincodebio";
import { Branch, Service, Task } from "../../../api/siblibrary";

export class ControlFlowHook extends AbstractEdgeHook {
    override CHANNEL_NAME: string | undefined = 'ControlFlowHook [' + this.modelState.root.id + ']';

    override async postCreate(edge: ControlFlow): Promise<void> {
        const sourceSib = edge.source as SIB | undefined;
        if (!SIB.is(sourceSib)) {
            return;
        }
        const sourcePrime = (await sourceSib.primeReference) as Service | Task | undefined;
        if (!sourcePrime) {
            this.error(`Could not label ControlFlow ${edge.id}: source SIB prime reference is missing.`);
            return;
        }
        const branches = sourcePrime.containments.filter((a) => Branch.is(a));
        if (!edge.label && branches.length != 0){
            edge.label = branches[0].name
        }
    }
}

LanguageFilesRegistry.register(ControlFlowHook);
