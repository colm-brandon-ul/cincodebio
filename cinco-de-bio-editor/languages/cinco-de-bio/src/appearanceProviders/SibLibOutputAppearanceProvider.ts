import { AppearanceProvider, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import { View } from '@cinco-glsp/cinco-glsp-common';
import { Output } from "../../../api/siblibrary";


export class SibLibOutputAppearanceProvider extends AppearanceProvider {

    override async getAppearance(
        element: Output, ...args: unknown[]
    ): Promise<View | undefined>{     
        const message = 'Element [' + element.type + ', ' + element.id + '] is changing appearance.';
        this.log(message);
        return element.view;
    }
}
// register into app
LanguageFilesRegistry.register(SibLibOutputAppearanceProvider);
