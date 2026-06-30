import { AppearanceProvider, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import { View } from '@cinco-glsp/cinco-glsp-common';
import { Input } from "../../../api/siblibrary";


export class SibLibInputAppearanceProvider extends AppearanceProvider {

    override async getAppearance(
        element: Input, ...args: unknown[]
    ): Promise<View | undefined>{     
        const message = 'Element [' + element.type + ', ' + element.id + '] is changing appearance.';
        this.log(message);
        return element.view;
    }
}
// register into app
LanguageFilesRegistry.register(SibLibInputAppearanceProvider);
