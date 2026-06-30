import { AppearanceProvider, LanguageFilesRegistry } from '@cinco-glsp/cinco-glsp-api';
import {
    View,
} from '@cinco-glsp/cinco-glsp-common';
import { SIBDef, Label } from "../../../api/siblibrary";


export class SibLibLabelAppearanceProvider extends AppearanceProvider {
    
    override async getAppearance(
        label: Label, ...args: unknown[]
    ): Promise<View | undefined>{
        const message = 'Element [' + label.type + ', ' + label.id + '] is changing appearance.';
        this.log(message);

        let sibDef = label.parent as SIBDef        
        if (label.name != sibDef.name){
            label.name = sibDef.name;
        }
        if (label.label != sibDef.label){
            label.label = sibDef.label;
        }
        
        return label.view;
    }
}
// register into app
LanguageFilesRegistry.register(SibLibLabelAppearanceProvider);
