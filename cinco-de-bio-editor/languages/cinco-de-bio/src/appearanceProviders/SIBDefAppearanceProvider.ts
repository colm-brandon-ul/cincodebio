import { AppearanceProvider, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import {
    View,
} from '@cinco-glsp/cinco-glsp-common';
import { SIBDef } from "../../../api/siblibrary";


export class SIBDefAppearanceProvider extends AppearanceProvider {

    override async getAppearance(
        sibDef: SIBDef, ...args: unknown[]
    ): Promise<View | undefined>{
        const message = 'Element [' + sibDef.type + ', ' + sibDef.id + '] is changing appearance.';
        this.log(message);
        return sibDef.view;
    }
}
// register into app
LanguageFilesRegistry.register(SIBDefAppearanceProvider);
