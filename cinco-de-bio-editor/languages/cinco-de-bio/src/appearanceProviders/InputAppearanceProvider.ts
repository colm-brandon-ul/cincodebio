import { AppearanceProvider, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import {
    View,
} from '@cinco-glsp/cinco-glsp-common';

import {Node}  from '@cinco-glsp/cinco-glsp-api';
import { SIBDef } from "../../../api/siblibrary";
import { InputPort } from "../../../api/cincodebio";


export class InputAppearanceProvider extends AppearanceProvider {

    override async getAppearance(
        element: InputPort, ...args: unknown[]
    ): Promise<View | undefined>{        
        let labelNode = element as Node;
        this.log(JSON.stringify(labelNode.properties));
        this.log(`Is prime: ${labelNode.isPrime}`);

        const sibDef = (await labelNode.primeReference) as SIBDef | undefined;
        if (labelNode.isPrime && sibDef?.properties){
            this.log(JSON.stringify(sibDef.properties))
            this.log(JSON.stringify(labelNode.properties))
            Object.assign(labelNode.properties, sibDef.properties);
        }
        await this.saveModel();

        return element.view;
    }
}
// register into app
LanguageFilesRegistry.register(InputAppearanceProvider);
