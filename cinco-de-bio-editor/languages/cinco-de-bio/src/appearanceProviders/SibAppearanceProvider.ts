import { AppearanceProvider, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import { View } from '@cinco-glsp/cinco-glsp-common';
import { SIB } from "../../../api/cincodebio";


export class SibAppearanceProvider extends AppearanceProvider {

    override async getAppearance(
        element: SIB, ...args: unknown[]
    ): Promise<View | undefined>{     
        const message = 'Element [' + element.type + ', ' + element.id + '] is changing appearance.';
        this.log(message);
        return element.view;
    }
}
// register into app
LanguageFilesRegistry.register(SibAppearanceProvider);
